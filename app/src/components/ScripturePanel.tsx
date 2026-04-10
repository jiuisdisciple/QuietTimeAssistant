"use client";

import { useEffect, useState } from "react";

interface Verse {
  verse: number;
  text: string;
}

interface ScripturePanelProps {
  reference: string;
  version: "KRV" | "ESV";
  open: boolean;
}

export default function ScripturePanel({
  reference,
  version,
  open,
}: ScripturePanelProps) {
  const [verses, setVerses] = useState<Verse[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [highlighted, setHighlighted] = useState<Set<number>>(new Set());
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!open || verses || loading) return;
    setLoading(true);
    setError(null);
    fetch(`/api/bible?ref=${encodeURIComponent(reference)}&version=${version}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.error) {
          setError(data.error);
          return;
        }
        setVerses(data.verses || []);
      })
      .catch((e) => setError(String(e)))
      .finally(() => setLoading(false));
  }, [open, reference, version, verses, loading]);

  const toggleHighlight = (verseNum: number) => {
    setHighlighted((prev) => {
      const next = new Set(prev);
      if (next.has(verseNum)) {
        next.delete(verseNum);
      } else {
        next.add(verseNum);
      }
      return next;
    });
  };

  const handleCopy = async () => {
    if (!verses || highlighted.size === 0) return;
    const sortedVerses = [...highlighted].sort((a, b) => a - b);
    const text = sortedVerses
      .map((n) => {
        const v = verses.find((x) => x.verse === n);
        return v ? `${v.verse} ${v.text}` : "";
      })
      .filter(Boolean)
      .join("\n");
    const fullText = `${reference} (${version})\n${text}`;
    try {
      await navigator.clipboard.writeText(fullText);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch (e) {
      console.error(e);
    }
  };

  if (!open) return null;

  return (
    <div
      className="relative rounded-xl p-4 mb-2 text-sm leading-relaxed"
      style={{
        background: "var(--bg-secondary)",
        border: "1px solid var(--border)",
        color: "var(--text-primary)",
      }}
    >
      {/* Copy button (only when highlights exist) */}
      {highlighted.size > 0 && (
        <button
          onClick={handleCopy}
          className="absolute top-2 right-2 flex items-center gap-1 px-2 py-1 rounded text-xs cursor-pointer transition-colors"
          style={{
            background: "var(--bg-card)",
            color: copied ? "var(--success)" : "var(--text-secondary)",
            border: "1px solid var(--border)",
          }}
          title="선택한 구절 복사"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
          </svg>
          {copied ? "복사됨" : "복사"}
        </button>
      )}

      {loading && (
        <p style={{ color: "var(--text-muted)" }}>본문 불러오는 중...</p>
      )}
      {error && <p style={{ color: "var(--danger)" }}>오류: {error}</p>}
      {verses && verses.length > 0 && (
        <div className="space-y-1">
          {verses.map((v) => {
            const isHighlighted = highlighted.has(v.verse);
            return (
              <p
                key={v.verse}
                onClick={() => toggleHighlight(v.verse)}
                className="cursor-pointer rounded px-1 py-0.5 -mx-1 transition-colors select-text"
                style={{
                  background: isHighlighted
                    ? "rgba(124, 140, 240, 0.2)"
                    : "transparent",
                  borderLeft: isHighlighted
                    ? "3px solid var(--accent)"
                    : "3px solid transparent",
                  paddingLeft: "8px",
                }}
              >
                <span
                  className="text-xs mr-1 align-super"
                  style={{ color: "var(--accent)" }}
                >
                  {v.verse}
                </span>
                {v.text}
              </p>
            );
          })}
        </div>
      )}
      {verses && verses.length === 0 && (
        <p style={{ color: "var(--text-muted)" }}>본문을 찾을 수 없습니다.</p>
      )}
    </div>
  );
}
