"use client";

import { useState } from "react";
import { topupCoinsVas, requestRewardWithdrawal } from "@/lib/supabase/queries";
import { NIGERIAN_BANKS } from "@/lib/game/viral-engine";
import { CoinsIcon, CheckIcon } from "@/components/ui/Icons";
import { Button } from "@/components/ui";

const PLANS = [
  {
    id: "daily",
    name: "Single Entry Pass",
    coins: 100,
    priceNgn: 50,
    tag: "1 Session Entry",
    ussd: "*789*10#",
  },
  {
    id: "weekly",
    name: "Standard Arena Bundle",
    coins: 800,
    priceNgn: 300,
    tag: "8 Sessions · +60% Yield",
    ussd: "*789*20#",
    popular: true,
  },
  {
    id: "monthly",
    name: "Pro Syndicate Pass",
    coins: 4000,
    priceNgn: 1000,
    tag: "40 Sessions · Best Rate",
    ussd: "*789*30#",
  },
];

function detectNigerianCarrier(phone: string): { key: string; name: string; color: string } {
  const cleaned = phone.replace(/\D/g, "");
  const local = cleaned.startsWith("234") ? "0" + cleaned.slice(3) : cleaned;
  if (/^(0803|0806|0703|0706|0810|0813|0814|0816|0903|0906|0913|0916)/.test(local)) {
    return { key: "mtn", name: "MTN NG", color: "border-[#F59E0B]/30 bg-[#F59E0B]/10 text-[#F59E0B]" };
  }
  if (/^(0802|0808|0708|0812|0701|0902|0901|0904|0907|0912)/.test(local)) {
    return { key: "airtel", name: "AIRTEL NG", color: "border-[#EF4444]/30 bg-[#EF4444]/10 text-[#EF4444]" };
  }
  if (/^(0805|0807|0705|0815|0811|0905|0915)/.test(local)) {
    return { key: "glo", name: "GLO NG", color: "border-[#10B981]/30 bg-[#10B981]/10 text-[#10B981]" };
  }
  if (/^(0809|0818|0817|0909|0908)/.test(local)) {
    return { key: "9mobile", name: "9MOBILE", color: "border-[#10B981]/30 bg-[#10B981]/10 text-[#10B981]" };
  }
  return { key: "mtn", name: "AUTO-DETECT", color: "border-[#222631] bg-[#171A21] text-[#8A92A6]" };
}

export function VasTopupModal({
  userId,
  onClose,
  onSuccess,
}: {
  userId: string;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [selectedPlan, setSelectedPlan] = useState(PLANS[1]);
  const [phone, setPhone] = useState("0803 123 4567");
  const [step, setStep] = useState<"select" | "otp" | "done">("select");
  const [otp, setOtp] = useState("0000");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const carrier = detectNigerianCarrier(phone);

  const handleInitiate = (e: React.FormEvent) => {
    e.preventDefault();
    if (phone.replace(/\D/g, "").length < 10) {
      setError("Enter a valid 11-digit Nigerian mobile number (e.g. 08031234567)");
      return;
    }
    setError(null);
    setStep("otp");
  };

  const handleConfirmOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (otp.trim() !== "0000") {
      setError("Invalid verification code. Enter 0000 in pilot mode.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await topupCoinsVas({
        userId,
        coins: selectedPlan.coins,
        plan: selectedPlan.id,
        msisdn: phone,
        carrier: carrier.key,
        priceNgn: selectedPlan.priceNgn,
      });
      setStep("done");
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to top up coins");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 animate-fade-in">
      <div className="w-full max-w-md rounded-xl border border-[#222631] bg-[#111318] p-5 sm:p-6 shadow-2xl space-y-5">
        <div className="flex items-center justify-between border-b border-[#222631] pb-4">
          <div className="flex items-center gap-2.5">
            <div className="grid size-9 place-items-center rounded-lg border border-[#2E3442] bg-[#171A21] text-[#F7911B]">
              <CoinsIcon className="size-4.5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-[#F4F5F8]">
                Airtime Direct Billing (VAS)
              </h2>
              <p className="text-xs text-[#8A92A6]">
                MTN · Airtel · Glo · 9mobile
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-[#222631] bg-[#171A21] px-2 py-1 font-mono text-xs text-[#8A92A6] hover:text-[#F4F5F8]"
          >
            ESC
          </button>
        </div>

        {step === "select" && (
          <form onSubmit={handleInitiate} className="space-y-4">
            <div className="space-y-2">
              <label className="block text-[11px] font-semibold uppercase tracking-wider text-[#8A92A6]">
                Select Coin Allocation
              </label>
              <div className="grid gap-2">
                {PLANS.map((plan) => {
                  const active = selectedPlan.id === plan.id;
                  return (
                    <button
                      key={plan.id}
                      type="button"
                      onClick={() => setSelectedPlan(plan)}
                      className={`flex items-center justify-between rounded-lg border p-3.5 text-left transition-colors ${
                        active
                          ? "border-[#F7911B] bg-[#171A21]"
                          : "border-[#222631] bg-[#090A0D] hover:border-[#2E3442]"
                      }`}
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-[#F4F5F8]">
                            {plan.name}
                          </span>
                          {plan.popular && (
                            <span className="rounded border border-[#F7911B]/30 bg-[#F7911B]/10 px-1.5 py-0.5 font-mono text-[10px] font-semibold uppercase text-[#F7911B]">
                              RECOMMENDED
                            </span>
                          )}
                        </div>
                        <p className="mt-0.5 font-mono text-[11px] text-[#8A92A6]">
                          {plan.tag} · {plan.ussd}
                        </p>
                      </div>
                      <div className="text-right font-mono tabular-nums">
                        <p className="text-sm font-semibold text-[#F4F5F8]">
                          +{plan.coins.toLocaleString()} GW
                        </p>
                        <p className="text-xs text-[#10B981]">
                          ₦{plan.priceNgn.toLocaleString()}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-[11px] font-semibold uppercase tracking-wider text-[#8A92A6]">
                  Mobile Number (MSISDN)
                </label>
                <span className={`rounded border px-1.5 py-0.5 font-mono text-[10px] font-semibold ${carrier.color}`}>
                  {carrier.name}
                </span>
              </div>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="0803 123 4567"
                required
                className="w-full rounded-lg border border-[#222631] bg-[#090A0D] px-3.5 py-2.5 font-mono text-sm text-[#F4F5F8] focus:border-[#F7911B] focus:outline-none"
              />
            </div>

            {error && (
              <p className="rounded-lg border border-[#EF4444]/30 bg-[#EF4444]/10 px-3 py-2 text-xs text-[#EF4444]">
                {error}
              </p>
            )}

            <Button type="submit" className="w-full" size="md">
              Continue — Charge ₦{selectedPlan.priceNgn} ({selectedPlan.coins} GW)
            </Button>
          </form>
        )}

        {step === "otp" && (
          <form onSubmit={handleConfirmOtp} className="space-y-4">
            <div className="rounded-lg border border-[#222631] bg-[#090A0D] p-3.5 space-y-1">
              <p className="font-mono text-[11px] font-semibold text-[#F7911B] uppercase">
                NCC VAS AUTHORIZATION
              </p>
              <p className="text-xs text-[#C8CDD8]">
                Authorize <strong className="text-[#F4F5F8]">₦{selectedPlan.priceNgn}</strong> debit on{" "}
                <strong className="font-mono text-[#F4F5F8]">{phone}</strong> ({carrier.name}) for{" "}
                <strong className="font-mono text-[#F7911B]">{selectedPlan.coins.toLocaleString()} GW</strong>.
              </p>
              <p className="font-mono text-[11px] text-[#10B981] pt-1">
                SANDBOX CODE: 0000
              </p>
            </div>

            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-wider text-[#8A92A6] mb-1.5">
                4-Digit Authorization PIN
              </label>
              <input
                type="text"
                maxLength={4}
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                className="w-full rounded-lg border border-[#222631] bg-[#090A0D] px-4 py-2.5 text-center font-mono text-xl font-semibold tracking-[0.5em] text-[#F4F5F8] focus:border-[#F7911B] focus:outline-none"
              />
            </div>

            {error && (
              <p className="rounded-lg border border-[#EF4444]/30 bg-[#EF4444]/10 px-3 py-2 text-xs text-[#EF4444]">
                {error}
              </p>
            )}

            <div className="flex gap-2.5">
              <Button
                type="button"
                variant="secondary"
                onClick={() => setStep("select")}
              >
                Back
              </Button>
              <Button type="submit" className="flex-1" disabled={loading}>
                {loading ? "Authorizing..." : `Confirm +${selectedPlan.coins} GW`}
              </Button>
            </div>
          </form>
        )}

        {step === "done" && (
          <div className="text-center py-5 space-y-4">
            <div className="mx-auto grid size-12 place-items-center rounded-lg border border-[#10B981]/30 bg-[#10B981]/10 text-[#10B981]">
              <CheckIcon className="size-6" />
            </div>
            <div>
              <h3 className="font-mono text-xl font-semibold text-[#F4F5F8]">
                +{selectedPlan.coins.toLocaleString()} GW CREDITED
              </h3>
              <p className="mt-1 text-xs text-[#8A92A6]">
                Settled via {carrier.name}. Balance updated immediately.
              </p>
            </div>
            <Button onClick={onClose} className="w-full">
              Return to Wallet
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

export function WithdrawalModal({
  userId,
  maxAmount,
  onClose,
  onSuccess,
}: {
  userId: string;
  maxAmount: number;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [bankName, setBankName] = useState(NIGERIAN_BANKS[0]);
  const [accountNumber, setAccountNumber] = useState("");
  const [accountName, setAccountName] = useState("");
  const [amount, setAmount] = useState(maxAmount > 0 ? String(maxAmount) : "5000");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAccountChange = (val: string) => {
    const digits = val.replace(/\D/g, "").slice(0, 10);
    setAccountNumber(digits);
    if (digits.length === 10 && !accountName) {
      setAccountName("VERIFIED ACCOUNT HOLDER");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const numAmount = Number(amount);
    if (!numAmount || numAmount <= 0) {
      setError("Enter a valid payout amount");
      return;
    }
    if (accountNumber.length !== 10) {
      setError("Enter a valid 10-digit NUBAN or wallet account number");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await requestRewardWithdrawal({
        userId,
        amount: numAmount,
        bankName,
        accountNumber,
        accountName: accountName || "VERIFIED PLAYER",
      });
      setDone(true);
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Withdrawal request failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 animate-fade-in">
      <div className="w-full max-w-md rounded-xl border border-[#222631] bg-[#111318] p-5 sm:p-6 shadow-2xl space-y-5">
        <div className="flex items-center justify-between border-b border-[#222631] pb-4">
          <div>
            <h2 className="text-base font-semibold text-[#F4F5F8]">
              Withdraw Cash Balance
            </h2>
            <p className="text-xs text-[#8A92A6]">
              NIP Instant Settlement · OPay · PalmPay · Moniepoint · Commercial Banks
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-[#222631] bg-[#171A21] px-2 py-1 font-mono text-xs text-[#8A92A6] hover:text-[#F4F5F8]"
          >
            ESC
          </button>
        </div>

        {done ? (
          <div className="text-center py-5 space-y-4">
            <div className="mx-auto grid size-12 place-items-center rounded-lg border border-[#10B981]/30 bg-[#10B981]/10 text-[#10B981]">
              <CheckIcon className="size-6" />
            </div>
            <div>
              <h3 className="font-mono text-xl font-semibold text-[#F4F5F8] tabular-nums">
                ₦{Number(amount).toLocaleString()} QUEUED
              </h3>
              <p className="mt-1 text-xs text-[#8A92A6]">
                Destination: <strong className="text-[#F4F5F8]">{bankName}</strong> ({accountNumber})
              </p>
            </div>
            <Button onClick={onClose} className="w-full">
              Close
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-wider text-[#8A92A6] mb-1.5">
                Receiving Institution
              </label>
              <select
                value={bankName}
                onChange={(e) => setBankName(e.target.value)}
                className="w-full rounded-lg border border-[#222631] bg-[#090A0D] px-3.5 py-2.5 text-sm text-[#F4F5F8] focus:border-[#F7911B] focus:outline-none"
              >
                {NIGERIAN_BANKS.map((b) => (
                  <option key={b} value={b}>
                    {b}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-wider text-[#8A92A6] mb-1.5">
                10-Digit NUBAN Account Number
              </label>
              <input
                type="text"
                value={accountNumber}
                onChange={(e) => handleAccountChange(e.target.value)}
                placeholder="0123456789"
                required
                className="w-full rounded-lg border border-[#222631] bg-[#090A0D] px-3.5 py-2.5 font-mono text-sm text-[#F4F5F8] focus:border-[#F7911B] focus:outline-none"
              />
              {accountNumber.length === 10 && (
                <p className="mt-1.5 font-mono text-[11px] font-medium text-[#10B981] flex items-center gap-1">
                  <CheckIcon className="size-3.5" />
                  <span>NAME ENQUIRY: {accountName}</span>
                </p>
              )}
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-[11px] font-semibold uppercase tracking-wider text-[#8A92A6]">
                  Payout Amount (NGN)
                </label>
                <span className="font-mono text-[11px] text-[#8A92A6] tabular-nums">
                  Avail: ₦{maxAmount.toLocaleString()}
                </span>
              </div>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                min={500}
                max={Math.max(maxAmount, 1000000)}
                required
                className="w-full rounded-lg border border-[#222631] bg-[#090A0D] px-3.5 py-2.5 font-mono text-sm font-semibold text-[#F4F5F8] focus:border-[#F7911B] focus:outline-none"
              />
            </div>

            {error && (
              <p className="rounded-lg border border-[#EF4444]/30 bg-[#EF4444]/10 px-3 py-2 text-xs text-[#EF4444]">
                {error}
              </p>
            )}

            <Button type="submit" className="w-full" size="md" disabled={loading}>
              {loading ? "Submitting NIP Transfer..." : `Transfer ₦${Number(amount || 0).toLocaleString()}`}
            </Button>
          </form>
        )}
      </div>
    </div>
  );
}
