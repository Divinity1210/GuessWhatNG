"use client";

import { useState } from "react";

interface Tab {
  label: string;
  value: string;
}

interface TabGroupProps {
  tabs: Tab[];
  value?: string;
  defaultValue?: string;
  onChange?: (value: string) => void;
  className?: string;
}

export function TabGroup({ tabs, value, defaultValue, onChange, className = "" }: TabGroupProps) {
  const [internalActive, setInternalActive] = useState(defaultValue ?? tabs[0]?.value ?? "");
  const active = value !== undefined ? value : internalActive;

  function select(nextValue: string) {
    setInternalActive(nextValue);
    onChange?.(nextValue);
  }

  return (
    <div className={`flex gap-2 ${className}`} role="tablist">
      {tabs.map((tab) => (
        <button
          key={tab.value}
          role="tab"
          aria-selected={active === tab.value}
          onClick={() => select(tab.value)}
          className={`rounded-[var(--radius-pill)] px-4 py-1.5 text-sm font-medium transition-all duration-200 ${
            active === tab.value
              ? "gradient-brand text-white shadow-glow"
              : "border border-rule bg-paper-3 text-ink-muted hover:text-ink hover:border-rule-2"
          }`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
