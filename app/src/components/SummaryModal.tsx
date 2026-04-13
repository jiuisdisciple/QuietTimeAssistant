"use client";

interface SummaryModalProps {
  reference: string;
  summary: string;
  onClose: () => void;
  onPrev?: () => void;
  onNext?: () => void;
}

export default function SummaryModal({
  reference,
  summary,
  onClose,
  onPrev,
  onNext,
}: SummaryModalProps) {
  const lines = summary.split("\n");

  return (
    <div
      className="w-full h-full rounded-xl flex flex-col"
      style={{
        background: "var(--bg-card)",
        border: "1px solid var(--border)",
      }}
    >
        {/* Sticky Header */}
        <div
          className="relative flex items-center justify-between p-4 shrink-0"
          style={{ borderBottom: "1px solid var(--border)" }}
        >
          <div>
            <h2
              className="text-base font-semibold"
              style={{ color: "var(--accent)" }}
            >
              {reference}
            </h2>
            <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
              AI 해설
            </p>
          </div>

          {/* Nav arrows — always centered */}
          {(onPrev || onNext) && (
            <div className="absolute left-1/2 -translate-x-1/2 flex items-center gap-2">
              <button
                onClick={onPrev}
                className="w-9 h-9 flex items-center justify-center rounded-lg text-base cursor-pointer"
                style={{ color: "var(--text-secondary)", background: "var(--bg-input)" }}
                title="이전"
              >
                &lt;
              </button>
              <button
                onClick={onNext}
                className="w-9 h-9 flex items-center justify-center rounded-lg text-base cursor-pointer"
                style={{ color: "var(--text-secondary)", background: "var(--bg-input)" }}
                title="다음"
              >
                &gt;
              </button>
            </div>
          )}
          <div className="flex items-center gap-1">
            <button
              onClick={onClose}
              className="w-9 h-9 flex items-center justify-center rounded-lg text-xl cursor-pointer hover:opacity-70"
              style={{ color: "var(--text-secondary)" }}
              title="닫기"
            >
              ×
            </button>
          </div>
        </div>

        {/* Scrollable Body */}
        <div
          className="flex-1 overflow-y-auto p-4 text-sm leading-relaxed whitespace-pre-wrap"
          style={{ color: "var(--text-primary)" }}
        >
          {lines.map((line, i) => {
            if (line.startsWith("## ")) {
              return (
                <h3
                  key={i}
                  className="text-sm font-semibold mt-4 mb-1 first:mt-0"
                  style={{ color: "var(--accent)" }}
                >
                  {line.replace("## ", "")}
                </h3>
              );
            }
            return (
              <p key={i} className="my-0.5">
                {line}
              </p>
            );
          })}
        </div>
      </div>
  );
}
