"use client";

interface FeedbackModalProps {
  report: string;
  onClose: () => void;
}

export default function FeedbackModal({ report, onClose }: FeedbackModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div
        className="w-full max-w-lg rounded-xl p-6 max-h-[80vh] overflow-y-auto"
        style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold" style={{ color: "var(--accent)" }}>
            🔍 피드백 리포트
          </h2>
          <button
            onClick={onClose}
            className="text-2xl leading-none px-2 rounded hover:opacity-70"
            style={{ color: "var(--text-secondary)" }}
          >
            ×
          </button>
        </div>
        <div
          className="prose prose-invert prose-sm max-w-none whitespace-pre-wrap text-sm leading-relaxed"
          style={{ color: "var(--text-primary)" }}
        >
          {report.split("\n").map((line, i) => {
            if (line.startsWith("## ")) {
              return (
                <h3
                  key={i}
                  className="text-base font-semibold mt-4 mb-2"
                  style={{ color: "var(--accent)" }}
                >
                  {line.replace("## ", "")}
                </h3>
              );
            }
            if (line.includes("✓")) {
              return (
                <p key={i} className="my-1" style={{ color: "var(--success)" }}>
                  {line}
                </p>
              );
            }
            return (
              <p key={i} className="my-1">
                {line}
              </p>
            );
          })}
        </div>
      </div>
    </div>
  );
}
