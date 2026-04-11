"use client";

import { useEffect, useState } from "react";

interface PrayerPopupProps {
  onClose: () => void;
}

const TIMER_SECONDS = 10;

export default function PrayerPopup({ onClose }: PrayerPopupProps) {
  const [seconds, setSeconds] = useState(TIMER_SECONDS);

  useEffect(() => {
    if (seconds <= 0) {
      onClose();
      return;
    }
    const id = setTimeout(() => setSeconds((s) => s - 1), 1000);
    return () => clearTimeout(id);
  }, [seconds, onClose]);

  const progress = ((TIMER_SECONDS - seconds) / TIMER_SECONDS) * 100;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-4">
      <div
        className="w-full max-w-sm rounded-2xl p-8 text-center"
        style={{
          background: "var(--bg-card)",
          border: "1px solid var(--border)",
        }}
      >
        {/* Icon */}
        <div className="mb-5 flex justify-center">
          <div
            className="w-14 h-14 rounded-full flex items-center justify-center"
            style={{ background: "var(--bg-secondary)" }}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="28"
              height="28"
              viewBox="0 0 24 24"
              fill="none"
              stroke="var(--accent)"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M12 2v20" />
              <path d="M5 9h14" />
            </svg>
          </div>
        </div>

        {/* Message */}
        <p
          className="text-base leading-relaxed whitespace-pre-line mb-6"
          style={{ color: "var(--text-primary)" }}
        >
          {"오늘 적은 묵상을 바탕으로\n짧게 기도해보아요"}
        </p>

        {/* Progress bar */}
        <div
          className="w-full h-1 rounded-full overflow-hidden mb-3"
          style={{ background: "var(--bg-secondary)" }}
        >
          <div
            className="h-full transition-all duration-1000 ease-linear"
            style={{
              width: `${progress}%`,
              background: "var(--accent)",
            }}
          />
        </div>

        {/* Timer + skip */}
        <div
          className="flex items-center justify-between text-xs"
          style={{ color: "var(--text-muted)" }}
        >
          <span>{seconds}초 후 자동으로 닫힘</span>
          <button
            onClick={onClose}
            className="px-3 py-1 rounded cursor-pointer"
            style={{
              background: "var(--bg-input)",
              color: "var(--text-secondary)",
            }}
          >
            건너뛰기
          </button>
        </div>
      </div>
    </div>
  );
}
