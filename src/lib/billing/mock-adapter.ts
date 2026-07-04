import { createHmac, timingSafeEqual } from "crypto";
import type {
  BillingProvider,
  Carrier,
  InitiateSubscriptionInput,
  InitiateSubscriptionResult,
  ParsedBillingEvent,
} from "./provider";

const NIGERIAN_PREFIXES: Record<string, Carrier> = {
  "234803": "mtn",
  "234806": "mtn",
  "234813": "mtn",
  "234802": "airtel",
  "234808": "airtel",
  "234701": "airtel",
  "234805": "glo",
  "234811": "glo",
  "234809": "9mobile",
  "234817": "9mobile",
};

/**
 * Development stand-in for the VAS aggregator. Accepts OTP "0000",
 * signs webhooks with MOCK_VAS_SECRET so the verification path is
 * exercised exactly like production.
 */
export class MockVasAdapter implements BillingProvider {
  readonly key = "mock";
  private secret = process.env.MOCK_VAS_SECRET ?? "dev-secret";

  detectCarrier(msisdn: string): Carrier {
    const normalized = msisdn.replace(/^\+/, "");
    for (const [prefix, carrier] of Object.entries(NIGERIAN_PREFIXES)) {
      if (normalized.startsWith(prefix)) return carrier;
    }
    return "unknown";
  }

  async initiateSubscription(
    input: InitiateSubscriptionInput,
  ): Promise<InitiateSubscriptionResult> {
    return {
      providerRef: `mock_${input.userId.slice(0, 8)}_${Date.now()}`,
      consentMethod: "otp",
      consentHint: "Dev mode: enter OTP 0000 to confirm",
    };
  }

  async confirmConsent(_providerRef: string, otp: string): Promise<boolean> {
    return otp === "0000";
  }

  async cancel(): Promise<void> {}

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

  parseEvent(rawBody: string): ParsedBillingEvent {
    const body = JSON.parse(rawBody);
    const known = ["consent", "charge_success", "charge_failed", "cancel"];
    return {
      providerEventId: String(body.event_id ?? ""),
      providerRef: String(body.subscription_ref ?? ""),
      type: known.includes(body.type) ? body.type : "unknown",
      msisdn: String(body.msisdn ?? ""),
      amountMinor: body.amount_minor,
      occurredAt: body.occurred_at ?? new Date().toISOString(),
      raw: body,
    };
  }
}

export function getBillingProvider(): BillingProvider {
  // Swap on env when the production aggregator adapter lands.
  return new MockVasAdapter();
}
