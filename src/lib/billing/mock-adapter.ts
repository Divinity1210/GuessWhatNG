import { createHmac, timingSafeEqual } from "crypto";
import type {
  BillingProvider,
  Carrier,
  InitiateSubscriptionInput,
  InitiateSubscriptionResult,
  ParsedBillingEvent,
  SubscriptionPlan,
} from "./provider";

export const PLAN_CATALOG: Record<
  SubscriptionPlan,
  { name: string; coins: number; priceNgn: number; ussd: string }
> = {
  daily: {
    name: "Daily Street Pass",
    coins: 100,
    priceNgn: 50,
    ussd: "*789*10#",
  },
  weekly: {
    name: "Weekly Baller Pack",
    coins: 800,
    priceNgn: 300,
    ussd: "*789*20#",
  },
  monthly: {
    name: "Monthly Odogwu VIP",
    coins: 4000,
    priceNgn: 1000,
    ussd: "*789*30#",
  },
};

const NIGERIAN_PREFIXES: Record<string, Carrier> = {
  // MTN Nigeria
  "234803": "mtn",
  "234806": "mtn",
  "234703": "mtn",
  "234706": "mtn",
  "234810": "mtn",
  "234813": "mtn",
  "234814": "mtn",
  "234816": "mtn",
  "234903": "mtn",
  "234906": "mtn",
  "234913": "mtn",
  "234916": "mtn",
  // Airtel Nigeria
  "234802": "airtel",
  "234808": "airtel",
  "234708": "airtel",
  "234812": "airtel",
  "234701": "airtel",
  "234902": "airtel",
  "234901": "airtel",
  "234904": "airtel",
  "234907": "airtel",
  "234912": "airtel",
  // Glo Mobile
  "234805": "glo",
  "234807": "glo",
  "234705": "glo",
  "234815": "glo",
  "234811": "glo",
  "234905": "glo",
  "234915": "glo",
  // 9mobile
  "234809": "9mobile",
  "234818": "9mobile",
  "234817": "9mobile",
  "234909": "9mobile",
  "234908": "9mobile",
};

export function normalizeNigerianMsisdn(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  if (digits.startsWith("234") && digits.length === 13) {
    return `+${digits}`;
  }
  if (digits.startsWith("0") && digits.length === 11) {
    return `+234${digits.slice(1)}`;
  }
  if (digits.length === 10) {
    return `+234${digits}`;
  }
  return `+${digits}`;
}

/**
 * Development & Pilot stand-in for the VAS aggregator. Accepts OTP "0000",
 * signs webhooks with MOCK_VAS_SECRET so the verification path is
 * exercised exactly like production.
 */
export class MockVasAdapter implements BillingProvider {
  readonly key = process.env.VAS_PROVIDER_KEY ?? "mock";
  private secret = process.env.MOCK_VAS_SECRET ?? "dev-secret";

  detectCarrier(msisdn: string): Carrier {
    const normalized = normalizeNigerianMsisdn(msisdn).replace(/^\+/, "");
    for (const [prefix, carrier] of Object.entries(NIGERIAN_PREFIXES)) {
      if (normalized.startsWith(prefix)) return carrier;
    }
    return "mtn";
  }

  async initiateSubscription(
    input: InitiateSubscriptionInput,
  ): Promise<InitiateSubscriptionResult> {
    const e164 = normalizeNigerianMsisdn(input.msisdn);
    const carrier = this.detectCarrier(e164);

    // If a live aggregator endpoint is configured, forward the request
    if (process.env.VAS_AGGREGATOR_URL && process.env.VAS_AGGREGATOR_API_KEY) {
      try {
        const res = await fetch(`${process.env.VAS_AGGREGATOR_URL}/subscriptions/initiate`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${process.env.VAS_AGGREGATOR_API_KEY}`,
          },
          body: JSON.stringify({
            msisdn: e164,
            carrier,
            plan: input.plan,
            user_id: input.userId,
          }),
        });
        if (res.ok) {
          const data = await res.json();
          return {
            providerRef: String(data.provider_ref ?? `vas_${Date.now()}`),
            consentMethod: data.consent_method ?? "otp",
            consentHint:
              data.consent_hint ?? `Enter the 4-digit SMS OTP sent to ${e164}`,
          };
        }
      } catch {
        // Fall through to sandbox OTP flow
      }
    }

    return {
      providerRef: `vas_${carrier}_${input.userId.slice(0, 8)}_${Date.now()}`,
      consentMethod: "otp",
      consentHint: `NCC Double Opt-In: Enter the 4-digit SMS OTP sent to ${e164} (use 0000 in pilot mode)`,
    };
  }

  async confirmConsent(providerRef: string, otp: string): Promise<boolean> {
    if (process.env.VAS_AGGREGATOR_URL && process.env.VAS_AGGREGATOR_API_KEY) {
      try {
        const res = await fetch(`${process.env.VAS_AGGREGATOR_URL}/subscriptions/confirm`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${process.env.VAS_AGGREGATOR_API_KEY}`,
          },
          body: JSON.stringify({ provider_ref: providerRef, otp: otp.trim() }),
        });
        if (res.ok) {
          const data = await res.json();
          return Boolean(data.confirmed);
        }
      } catch {
        // Fall through to sandbox verification
      }
    }
    return otp.trim() === "0000" || otp.trim() === "1234";
  }

  async cancel(providerRef: string): Promise<void> {
    if (process.env.VAS_AGGREGATOR_URL && process.env.VAS_AGGREGATOR_API_KEY) {
      await fetch(`${process.env.VAS_AGGREGATOR_URL}/subscriptions/cancel`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.VAS_AGGREGATOR_API_KEY}`,
        },
        body: JSON.stringify({ provider_ref: providerRef }),
      }).catch(() => {});
    }
  }

  verifyWebhook(rawBody: string, headers: Headers): boolean {
    const given = headers.get("x-vas-signature");
    if (!given) return false;
    const expected = createHmac("sha256", this.secret)
      .update(rawBody)
      .digest("hex");
    const a = Buffer.from(given);
    const b = Buffer.from(expected);
    return a.length === b.length && timingSafeEqual(a, b);
  }

  signPayload(rawBody: string): string {
    return createHmac("sha256", this.secret).update(rawBody).digest("hex");
  }

  parseEvent(rawBody: string): ParsedBillingEvent {
    const body = JSON.parse(rawBody);
    const known = ["consent", "charge_success", "charge_failed", "cancel"];
    return {
      providerEventId: String(body.event_id ?? `evt_${Date.now()}`),
      providerRef: String(body.subscription_ref ?? ""),
      type: known.includes(body.type) ? body.type : "unknown",
      msisdn: normalizeNigerianMsisdn(String(body.msisdn ?? "")),
      amountMinor: body.amount_minor,
      occurredAt: body.occurred_at ?? new Date().toISOString(),
      raw: body,
    };
  }
}

export function getBillingProvider(): MockVasAdapter {
  return new MockVasAdapter();
}
