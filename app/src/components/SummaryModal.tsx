"use client";

interface SummaryModalProps {
  reference: string;
  summary: string;
  onClose: () => void;
}

export default function SummaryModal({
  reference,
  summary,
  onClose,
}: SummaryModalProps) {
  const lines = summary.split("\n");

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div
        className="w-full max-w-lg h-[85vh] rounded-xl flex flex-col"
        style={{
          background: "var(--bg-card)",
          border: "1px solid var(--border)",
        }}
      >
        {/* Sticky Header */}
        <div
          className="flex items-center justify-between p-4 shrink-0"
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
          <button
            onClick={onClose}
            className="text-2xl leading-none px-2 cursor-pointer"
            style={{ color: "var(--text-secondary)" }}
            title="닫기"
          >
            ×
          </button>
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
    </div>
  );
}
