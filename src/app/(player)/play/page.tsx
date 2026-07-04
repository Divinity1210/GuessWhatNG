"use client";

import { useMemo, useRef, useState } from "react";
import Link from "next/link";
import { mockQuestions, mockSession } from "@/lib/game/mock-data";

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

  if (!started) {
    return (
      <main className="mx-auto max-w-2xl text-center">
        <h1 className="font-display text-3xl font-bold">{mockSession.name}</h1>
        <div className="mt-6 rounded-card border border-border bg-card p-8">
          <p className="text-white/70">
            {mockQuestions.length} questions · Entry{" "}
            <span className="font-semibold text-white">
              {mockSession.entryFeeCoins} coins
            </span>{" "}
            · Prize pool{" "}
            <span className="font-semibold text-white">
              ₦{mockSession.prizePool.toLocaleString()}
            </span>
          </p>
          <p className="mt-4 text-sm text-white/50">
            Predict the option <em>most players</em> will choose. Fastest
            total time wins ties — think smart, answer fast.
          </p>
          <button
            onClick={start}
            className="gradient-brand mt-8 rounded-btn px-10 py-3 font-display text-lg font-bold"
          >
            Play — {mockSession.entryFeeCoins} coins
          </button>
        </div>
      </main>
    );
  }

  if (done) {
    return (
      <main className="mx-auto max-w-2xl text-center">
        <h1 className="font-display text-3xl font-bold">
          Fingers crossed! 🤞
        </h1>
        <div className="mt-6 rounded-card border border-border bg-card p-8">
          <p className="text-white/70">
            Your {answers.length} predictions are locked in. Total think time:{" "}
            <span className="font-semibold text-white">
              {(totalTime / 1000).toFixed(1)}s
            </span>
          </p>
          <p className="mt-3 text-sm text-white/50">
            Scores are revealed when the session closes — the crowd decides
            the winners. We&apos;ll notify you.
          </p>
          <Link
            href="/leaderboard"
            className="gradient-brand mt-8 inline-block rounded-btn px-8 py-3 font-display font-bold"
          >
            View leaderboard
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-2xl">
      <div className="flex items-center justify-between text-sm text-white/50">
        <span>
          Question {index + 1} of {mockQuestions.length}
        </span>
        <span>{mockSession.name}</span>
      </div>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-card">
        <div
          className="gradient-brand h-full transition-all"
          style={{ width: `${(index / mockQuestions.length) * 100}%` }}
        />
      </div>

      <h1 className="mt-8 font-display text-2xl font-bold sm:text-3xl">
        {question.title}
      </h1>
      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        {question.options.map((option) => (
          <button
            key={option}
            onClick={() => pick(option)}
            className="rounded-btn border border-border bg-card px-5 py-4 text-left font-semibold text-white/80 transition hover:border-brand-orange hover:text-white"
          >
            {option}
          </button>
        ))}
      </div>
    </main>
  );
}
