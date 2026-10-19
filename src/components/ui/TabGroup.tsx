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
    <div
      className={`inline-flex flex-wrap items-center gap-1 rounded-lg border border-[#222631] bg-[#111318] p-1 ${className}`}
      role="tablist"
    >
      {tabs.map((tab) => {
        const isSelected = active === tab.value;
        return (
          <button
            key={tab.value}
            role="tab"
            aria-selected={isSelected}
            onClick={() => select(tab.value)}
            className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors duration-150 ${
              isSelected
                ? "bg-[#171A21] text-[#F4F5F8] border border-[#2E3442] shadow-2xs"
                : "text-[#8A92A6] hover:text-[#C8CDD8] border border-transparent"
            }`}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}
