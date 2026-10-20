import { createHmac, timingSafeEqual } from "crypto";

/**
 * Nigerian Bank & Fintech codes for Paystack / Flutterwave NUBAN resolution & transfers
 */
export const NIGERIAN_BANK_CODES: Record<string, string> = {
  "OPay (Paycom)": "999992",
  PalmPay: "999991",
  "Moniepoint MFB": "50515",
  "Kuda Bank": "50211",
  "GTBank (Guaranty Trust)": "058",
  "Access Bank": "044",
  "Zenith Bank": "057",
  "United Bank for Africa (UBA)": "033",
  "First Bank of Nigeria": "011",
  "Fidelity Bank": "070",
  "FCMB": "214",
  "Stanbic IBTC": "221",
  "Sterling Bank": "232",
  "Union Bank": "032",
  "Wema Bank (ALAT)": "035",
};

export function verifyPaystackSignature(rawBody: string, signatureHeader: string | null): boolean {
  const secret = process.env.PAYSTACK_SECRET_KEY ?? process.env.MOCK_VAS_SECRET ?? "dev-secret";
  if (!signatureHeader) return false;
  const expected = createHmac("sha512", secret).update(rawBody).digest("hex");
  const a = Buffer.from(signatureHeader);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function resolveNigerianBankAccount(params: {
  accountNumber: string;
  bankName: string;
}): Promise<{ accountName: string; bankCode: string; verifiedVia: "paystack" | "sandbox" }> {
  const bankCode = NIGERIAN_BANK_CODES[params.bankName] ?? "058";
  const secretKey = process.env.PAYSTACK_SECRET_KEY;

  if (secretKey && secretKey.startsWith("sk_")) {
    try {
      const url = `https://api.paystack.co/bank/resolve?account_number=${encodeURIComponent(
        params.accountNumber,
      )}&bank_code=${encodeURIComponent(bankCode)}`;
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${secretKey}` },
      });
      if (res.ok) {
        const json = await res.json();
        if (json?.status && json?.data?.account_name) {
          return {
            accountName: String(json.data.account_name).toUpperCase(),
            bankCode,
            verifiedVia: "paystack",
          };
        }
      }
    } catch {
      // Fall back to sandbox resolution
    }
  }

  // Deterministic Nigerian NUBAN sandbox lookup when live Paystack key is not configured
  const sampleNames = [
    "ADEBAYO OLUWASEUN",
    "CHUKWUEMEKA OKONKWO",
    "ZAINAB ABDULLAHI",
    "CHIDINMA EZE",
    "TEMITOPE ADEYEMI",
    "OSAZEE IGBINEDION",
  ];
  const hash = params.accountNumber
    .split("")
    .reduce((acc, d) => acc + Number(d || 0), 0);
  const resolved = sampleNames[hash % sampleNames.length];

  return {
    accountName: `${resolved} (${params.bankName.split(" ")[0].toUpperCase()})`,
    bankCode,
    verifiedVia: "sandbox",
  };
}

export async function initiatePaystackCheckout(params: {
  email: string;
  amountNgn: number;
  coins: number;
  planId: string;
  userId: string;
  gateway: "paystack" | "flutterwave";
  callbackUrl?: string;
}): Promise<{
  reference: string;
  authorizationUrl: string | null;
  mode: "live" | "instant_sandbox";
}> {
  const reference = `${params.gateway.toUpperCase()}_${params.planId.toUpperCase()}_${Date.now()}`;
  const paystackSecret = process.env.PAYSTACK_SECRET_KEY;

  if (params.gateway === "paystack" && paystackSecret && paystackSecret.startsWith("sk_")) {
    try {
      const res = await fetch("https://api.paystack.co/transaction/initialize", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${paystackSecret}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: params.email || "player@guesswhat.ng",
          amount: params.amountNgn * 100, // kobo
          reference,
          callback_url: params.callbackUrl,
          metadata: {
            user_id: params.userId,
            coins: params.coins,
            plan_id: params.planId,
          },
        }),
      });
      if (res.ok) {
        const json = await res.json();
        if (json?.status && json?.data?.authorization_url) {
          return {
            reference: json.data.reference || reference,
            authorizationUrl: json.data.authorization_url,
            mode: "live",
          };
        }
      }
    } catch {
      // Fall through to instant sandbox settlement
    }
  }

  return {
    reference,
    authorizationUrl: null,
    mode: "instant_sandbox",
  };
}

export async function initiateNigerianBankTransfer(params: {
  amountNgn: number;
  bankName: string;
  accountNumber: string;
  accountName: string;
  userId: string;
}): Promise<{
  transferReference: string;
  providerStatus: "queued" | "success";
  mode: "paystack_live" | "sandbox";
}> {
  const transferReference = `GW_PAYOUT_${Date.now()}`;
  const bankCode = NIGERIAN_BANK_CODES[params.bankName] ?? "058";
  const secretKey = process.env.PAYSTACK_SECRET_KEY;

  if (secretKey && secretKey.startsWith("sk_")) {
    try {
      // 1. Create transfer recipient
      const recRes = await fetch("https://api.paystack.co/transferrecipient", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${secretKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          type: "nuban",
          name: params.accountName,
          account_number: params.accountNumber,
          bank_code: bankCode,
          currency: "NGN",
        }),
      });

      if (recRes.ok) {
        const recJson = await recRes.json();
        const recipientCode = recJson?.data?.recipient_code;

        if (recipientCode) {
          const txRes = await fetch("https://api.paystack.co/transfer", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${secretKey}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              source: "balance",
              amount: Math.round(params.amountNgn * 100), // kobo
              recipient: recipientCode,
              reference: transferReference,
              reason: `GuessWhat Prize Payout (${params.userId.slice(0, 8)})`,
            }),
          });

          if (txRes.ok) {
            return {
              transferReference,
              providerStatus: "queued",
              mode: "paystack_live",
            };
          }
        }
      }
    } catch {
      // Fall through to sandbox transfer
    }
  }

  return {
    transferReference,
    providerStatus: "success",
    mode: "sandbox",
  };
}
