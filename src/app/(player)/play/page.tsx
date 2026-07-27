"use client";

import { useMemo, useRef, useState } from "react";
import Link from "next/link";
import { mockQuestions, mockSession } from "@/lib/game/mock-data";
import { PlayIcon, CheckIcon } from "@/components/ui/Icons";

type Answer = { questionId: string; option: string; responseMs: number };

export default function PlayPage() {
  const [started, setStarted] = useState(false);
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Answer[]>([]);
  const questionShownAt = useRef<number>(0);

  const question = mockQuestions[index];
  const done = answers.length === mockQuestions.length;
  const totalTime = useMemo(
    () => answers.reduce((sum, a) => sum + a.responseMs, 0),
    [answers],
  );

  function start() {
    setStarted(true);
    questionShownAt.current = performance.now();
  }

  function pick(option: string) {
    const responseMs = Math.round(performance.now() - questionShownAt.current);
    setAnswers((prev) => [
      ...prev,
      { questionId: question.id, option, responseMs },
    ]);
    if (index + 1 < mockQuestions.length) {
      setIndex(index + 1);
      questionShownAt.current = performance.now();
    }
  }

  /* ── Pre-game lobby ── */
  if (!started) {
    return (
      <main className="mx-auto max-w-2xl pt-8 text-center">
        <h1 className="font-display text-3xl font-bold">{mockSession.name}</h1>
        <div
          className="mt-8 rounded-2xl p-8"
          style={{
            background: "var(--color-paper-2)",
            border: "1px solid var(--color-rule)",
          }}
        >
          <div className="mx-auto mb-6 grid size-16 place-items-center rounded-2xl text-[#F7911B]" style={{ background: "oklch(77% 0.17 70 / 0.1)" }}>
            <PlayIcon className="size-8 fill-[#F7911B]" />
          </div>
          <p style={{ color: "var(--color-ink-2)" }}>
            {mockQuestions.length} questions · Entry{" "}
            <span className="font-semibold" style={{ color: "var(--color-ink)" }}>
              {mockSession.entryFeeCoins} coins
            </span>{" "}
            · Prize pool{" "}
            <span className="font-semibold" style={{ color: "var(--color-ink)" }}>
              ₦{mockSession.prizePool.toLocaleString()}
            </span>
          </p>
          <p className="mt-4 text-sm" style={{ color: "var(--color-ink-muted)" }}>
            Predict the option most players will choose.
            Fastest total time wins ties — think smart, answer fast.
          </p>
          <button
            onClick={start}
            className="mt-8 inline-flex items-center gap-2 rounded-full px-10 py-3.5 font-display text-lg font-bold transition-[transform,box-shadow] duration-[var(--dur-normal)] ease-[var(--ease-out)] hover:scale-[1.03] active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus)]"
            style={{
              background: "var(--color-accent)",
              color: "oklch(16% 0.012 60)",
              boxShadow: "0 4px 20px -4px oklch(77% 0.17 70 / 0.35)",
            }}
          >
            <PlayIcon className="size-5 fill-current" />
            <span>Play — {mockSession.entryFeeCoins} coins</span>
          </button>
        </div>
      </main>
    );
  }

  /* ── Completion screen ── */
  if (done) {
    return (
      <main className="mx-auto max-w-2xl pt-8 text-center">
        <div className="mx-auto mb-4 grid size-20 place-items-center rounded-3xl text-emerald-400" style={{ background: "oklch(77% 0.17 70 / 0.1)" }}>
          <CheckIcon className="size-10" />
        </div>
        <h1 className="font-display text-3xl font-bold">
          Predictions Locked In!
        </h1>
        <div
          className="mt-8 rounded-2xl p-8"
          style={{
            background: "var(--color-paper-2)",
            border: "1px solid var(--color-rule)",
          }}
        >
          <p style={{ color: "var(--color-ink-2)" }}>
            Your {answers.length} predictions are submitted. Total think time:{" "}
            <span className="font-display font-bold tabular-nums" style={{ color: "var(--color-accent)" }}>
              {(totalTime / 1000).toFixed(1)}s
            </span>
          </p>
          <p className="mt-3 text-sm" style={{ color: "var(--color-ink-muted)" }}>
            Scores are revealed when the session closes — the crowd decides
            the winners. We&apos;ll notify you.
          </p>
          <Link
            href="/leaderboard"
            className="mt-8 inline-block rounded-full px-8 py-3.5 font-display font-bold transition-[transform,box-shadow] duration-[var(--dur-normal)] ease-[var(--ease-out)] hover:scale-[1.03] active:scale-[0.98]"
            style={{
              background: "var(--color-accent)",
              color: "oklch(16% 0.012 60)",
              boxShadow: "0 4px 20px -4px oklch(77% 0.17 70 / 0.35)",
            }}
          >
            View leaderboard
          </Link>
        </div>
      </main>
    );
  }

  /* ── Active game play ── */
  const progress = (index / mockQuestions.length) * 100;

  return (
    <main className="mx-auto max-w-2xl pt-4">
      {/* Progress header */}
      <div className="flex items-center justify-between text-sm" style={{ color: "var(--color-ink-muted)" }}>
        <span className="font-medium">
          Question{" "}
          <span className="tabular-nums" style={{ color: "var(--color-ink)" }}>
            {index + 1}
          </span>{" "}
          of {mockQuestions.length}
        </span>
        <span>{mockSession.name}</span>
      </div>

      {/* Progress bar */}
      <div
        className="mt-3 h-1 overflow-hidden rounded-full"
        style={{ background: "var(--color-paper-3)" }}
      >
        <div
          className="h-full w-full origin-left rounded-full transition-[transform] duration-300 ease-[var(--ease-out)]"
          style={{
            transform: `scaleX(${progress / 100})`,
            background: "var(--color-accent)",
          }}
        />
      </div>

      {/* Question */}
      <h1 className="mt-8 font-display text-2xl font-bold leading-snug sm:text-3xl">
        {question.title}
      </h1>

      {/* Answer options */}
      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        {question.options.map((option) => (
          <button
            key={option}
            onClick={() => pick(option)}
            className="group relative rounded-xl px-5 py-4 text-left font-medium transition-[transform,colors] duration-[var(--dur-fast)] ease-[var(--ease-out)] hover:-translate-y-px focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus)] active:translate-y-0 active:scale-[0.99]"
            style={{
              background: "var(--color-paper-2)",
              border: "1px solid var(--color-rule)",
              color: "var(--color-ink-2)",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = "oklch(77% 0.17 70 / 0.4)";
              e.currentTarget.style.color = "var(--color-ink)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = "var(--color-rule)";
              e.currentTarget.style.color = "var(--color-ink-2)";
            }}
          >
            {option}
          </button>
        ))}
      </div>
    </main>
  );
}
