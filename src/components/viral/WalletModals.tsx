"use client";

import { useState } from "react";
import { topupCoinsVas, requestRewardWithdrawal } from "@/lib/supabase/queries";
import { NIGERIAN_BANKS } from "@/lib/game/viral-engine";
import { CoinsIcon, CheckIcon, ZapIcon } from "@/components/ui/Icons";
import { Button } from "@/components/ui";

const PLANS = [
  {
    id: "daily",
    name: "Daily Street Pass",
    coins: 100,
    priceNgn: 50,
    tag: "1 Session Entry",
    ussd: "*789*10#",
  },
  {
    id: "weekly",
    name: "Weekly Baller Pack",
    coins: 800,
    priceNgn: 300,
    tag: "Most Popular · +60% Bonus",
    ussd: "*789*20#",
    popular: true,
  },
  {
    id: "monthly",
    name: "Monthly Odogwu VIP",
    coins: 4000,
    priceNgn: 1000,
    tag: "Best Value · 40 Sessions",
    ussd: "*789*30#",
  },
];

function detectNigerianCarrier(phone: string): { key: string; name: string; color: string } {
  const cleaned = phone.replace(/\D/g, "");
  const local = cleaned.startsWith("234") ? "0" + cleaned.slice(3) : cleaned;
  if (/^(0803|0806|0703|0706|0810|0813|0814|0816|0903|0906|0913|0916)/.test(local)) {
    return { key: "mtn", name: "MTN Nigeria", color: "bg-yellow-400/20 text-yellow-300 border-yellow-400/40" };
  }
  if (/^(0802|0808|0708|0812|0701|0902|0901|0904|0907|0912)/.test(local)) {
    return { key: "airtel", name: "Airtel Nigeria", color: "bg-red-500/20 text-red-300 border-red-500/40" };
  }
  if (/^(0805|0807|0705|0815|0811|0905|0915)/.test(local)) {
    return { key: "glo", name: "Glo Mobile", color: "bg-emerald-500/20 text-emerald-300 border-emerald-500/40" };
  }
  if (/^(0809|0818|0817|0909|0908)/.test(local)) {
    return { key: "9mobile", name: "9mobile", color: "bg-lime-500/20 text-lime-300 border-lime-500/40" };
  }
  return { key: "mtn", name: "MTN / Airtel / Glo / 9mobile", color: "bg-white/10 text-gray-300 border-white/20" };
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
      setError("Please enter a valid Nigerian phone number (e.g. 08031234567)");
      return;
    }
    setError(null);
    setStep("otp");
  };

  const handleConfirmOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (otp.trim() !== "0000") {
      setError("Invalid OTP. In sandbox/pilot mode, enter 0000 to confirm.");
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-fade-in">
      <div className="w-full max-w-lg rounded-3xl border border-white/15 bg-[#121622] p-6 md:p-8 shadow-2xl space-y-5">
        <div className="flex items-center justify-between border-b border-white/10 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="grid size-10 place-items-center rounded-xl bg-[#F7911B]/15 text-[#F7911B] border border-[#F7911B]/30">
              <CoinsIcon className="size-5" />
            </div>
            <div>
              <h2 className="font-display text-xl font-bold text-white">
                Instant Airtime Coin Top-Up
              </h2>
              <p className="text-xs text-ink-muted">
                Pay with MTN, Airtel, Glo or 9mobile airtime (NCC VAS)
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-ink-muted hover:bg-white/10 hover:text-white"
          >
            ✕
          </button>
        </div>

        {step === "select" && (
          <form onSubmit={handleInitiate} className="space-y-4">
            <div className="space-y-2.5">
              <label className="block text-xs font-bold uppercase tracking-wider text-ink-muted">
                1. Choose Coin Bundle
              </label>
              <div className="grid gap-2.5">
                {PLANS.map((plan) => {
                  const active = selectedPlan.id === plan.id;
                  return (
                    <button
                      key={plan.id}
                      type="button"
                      onClick={() => setSelectedPlan(plan)}
                      className={`flex items-center justify-between rounded-2xl border p-4 text-left transition-all ${
                        active
                          ? "border-[#F7911B] bg-[#F7911B]/15 shadow-md"
                          : "border-white/10 bg-white/5 hover:border-white/25"
                      }`}
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-display font-bold text-white text-base">
                            {plan.name}
                          </span>
                          {plan.popular && (
                            <span className="rounded-full bg-gradient-to-r from-[#FF0400] to-[#F7911B] px-2.5 py-0.5 text-[10px] font-black uppercase text-white">
                              Popular
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-[#F7911B] font-semibold mt-0.5">
                          {plan.tag} · USSD {plan.ussd}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-display text-lg font-black text-white">
                          +{plan.coins.toLocaleString()} Coins
                        </p>
                        <p className="text-xs text-emerald-400 font-bold">
                          ₦{plan.priceNgn.toLocaleString()} Airtime
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-ink-muted">
                  2. Nigerian Mobile Number (MSISDN)
                </label>
                <span className={`rounded-full border px-2.5 py-0.5 text-[10px] font-bold ${carrier.color}`}>
                  {carrier.name}
                </span>
              </div>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="0803 123 4567"
                required
                className="w-full rounded-xl border border-rule bg-paper-3 px-4 py-3 text-sm text-white focus:border-[#F7911B] focus:outline-none"
              />
            </div>

            {error && (
              <p className="rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-400">
                {error}
              </p>
            )}

            <div className="flex gap-3 pt-2">
              <Button type="submit" className="flex-1" size="lg">
                Continue — ₦{selectedPlan.priceNgn} for {selectedPlan.coins} Coins
              </Button>
            </div>
          </form>
        )}

        {step === "otp" && (
          <form onSubmit={handleConfirmOtp} className="space-y-4">
            <div className="rounded-2xl border border-[#F7911B]/30 bg-[#F7911B]/10 p-4 space-y-1">
              <p className="text-xs font-bold text-[#F7911B] uppercase">
                NCC Double Opt-In Verification
              </p>
              <p className="text-xs text-gray-200">
                Confirm charging <strong className="text-white">₦{selectedPlan.priceNgn}</strong> airtime on{" "}
                <strong className="text-white">{phone}</strong> ({carrier.name}) for{" "}
                <strong className="text-[#F7911B]">{selectedPlan.coins.toLocaleString()} Coins</strong>.
              </p>
              <p className="text-[11px] text-emerald-300 font-semibold pt-1">
                💡 Pilot Sandbox Tip: Enter OTP <code className="px-1.5 py-0.5 rounded bg-black/50">0000</code> below
              </p>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-ink-muted mb-1.5">
                Enter 4-Digit SMS OTP
              </label>
              <input
                type="text"
                maxLength={4}
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                className="w-full rounded-xl border border-rule bg-paper-3 px-4 py-3 text-center font-display text-2xl font-black tracking-[0.5em] text-white focus:border-[#F7911B] focus:outline-none"
              />
            </div>

            {error && (
              <p className="rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-400">
                {error}
              </p>
            )}

            <div className="flex gap-3">
              <Button
                type="button"
                variant="secondary"
                onClick={() => setStep("select")}
              >
                Back
              </Button>
              <Button type="submit" className="flex-1" disabled={loading}>
                {loading ? "Crediting Coins..." : `Confirm & Credit +${selectedPlan.coins} Coins`}
              </Button>
            </div>
          </form>
        )}

        {step === "done" && (
          <div className="text-center py-6 space-y-4">
            <div className="mx-auto grid size-16 place-items-center rounded-full bg-emerald-500/20 text-emerald-400">
              <CheckIcon className="size-8" />
            </div>
            <h3 className="font-display text-2xl font-black text-white">
              +{selectedPlan.coins.toLocaleString()} Coins Credited!
            </h3>
            <p className="text-sm text-ink-2">
              Your wallet has been topped up via {carrier.name}. You&apos;re ready to join the live session!
            </p>
            <Button onClick={onClose} className="w-full" size="lg">
              Awesome, Let&apos;s Play!
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
      setAccountName("VERIFIED GUESSWHAT WINNER");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const numAmount = Number(amount);
    if (!numAmount || numAmount <= 0) {
      setError("Enter a valid withdrawal amount");
      return;
    }
    if (accountNumber.length !== 10) {
      setError("Enter a valid 10-digit NUBAN account or OPay/PalmPay phone number");
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-fade-in">
      <div className="w-full max-w-lg rounded-3xl border border-white/15 bg-[#121622] p-6 md:p-8 shadow-2xl space-y-5">
        <div className="flex items-center justify-between border-b border-white/10 pb-4">
          <div>
            <h2 className="font-display text-xl font-bold text-white">
              Withdraw Cash Winnings
            </h2>
            <p className="text-xs text-ink-muted">
              Instant payout to Nigerian Banks, OPay, PalmPay & Moniepoint
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-ink-muted hover:bg-white/10 hover:text-white"
          >
            ✕
          </button>
        </div>

        {done ? (
          <div className="text-center py-6 space-y-4">
            <div className="mx-auto grid size-16 place-items-center rounded-full bg-emerald-500/20 text-emerald-400">
              <CheckIcon className="size-8" />
            </div>
            <h3 className="font-display text-2xl font-black text-white">
              ₦{Number(amount).toLocaleString()} Payout Queued!
            </h3>
            <p className="text-sm text-ink-2">
              Your transfer to <strong className="text-white">{bankName}</strong> ({accountNumber}) has been submitted.
            </p>
            <Button onClick={onClose} className="w-full">
              Done
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-ink-muted mb-1.5">
                Select Bank / Wallet
              </label>
              <select
                value={bankName}
                onChange={(e) => setBankName(e.target.value)}
                className="w-full rounded-xl border border-rule bg-paper-3 px-4 py-3 text-sm text-white focus:border-[#F7911B] focus:outline-none"
              >
                {NIGERIAN_BANKS.map((b) => (
                  <option key={b} value={b}>
                    {b}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-ink-muted mb-1.5">
                10-Digit Account Number (NUBAN)
              </label>
              <input
                type="text"
                value={accountNumber}
                onChange={(e) => handleAccountChange(e.target.value)}
                placeholder="0123456789"
                required
                className="w-full rounded-xl border border-rule bg-paper-3 px-4 py-3 text-sm text-white focus:border-[#F7911B] focus:outline-none"
              />
              {accountNumber.length === 10 && (
                <p className="mt-1.5 text-xs font-bold text-emerald-400 flex items-center gap-1">
                  <CheckIcon className="size-3.5" />
                  <span>Account Verified: {accountName}</span>
                </p>
              )}
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-ink-muted mb-1.5">
                Amount (₦) · Available: ₦{maxAmount.toLocaleString()}
              </label>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                min={500}
                max={Math.max(maxAmount, 1000000)}
                required
                className="w-full rounded-xl border border-rule bg-paper-3 px-4 py-3 text-sm font-bold text-white focus:border-[#F7911B] focus:outline-none"
              />
            </div>

            {error && (
              <p className="rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-400">
                {error}
              </p>
            )}

            <Button type="submit" className="w-full" size="lg" disabled={loading}>
              {loading ? "Processing Payout..." : `Withdraw ₦${Number(amount || 0).toLocaleString()}`}
            </Button>
          </form>
        )}
      </div>
    </div>
  );
}
