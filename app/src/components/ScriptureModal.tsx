"use client";

import { useEffect, useRef, useState } from "react";

interface Verse {
  verse: number;
  text: string;
}

interface ScriptureModalProps {
  reference: string;
  version: "KRV" | "ESV";
  onClose: () => void;
  onPrev?: () => void;
  onNext?: () => void;
}

export default function ScriptureModal({
  reference,
  version,
  onClose,
  onPrev,
  onNext,
}: ScriptureModalProps) {
  const [verses, setVerses] = useState<Verse[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [highlighted, setHighlighted] = useState<Set<number>>(new Set());
  const [copied, setCopied] = useState(false);
  const attemptCountRef = useRef(0);
  const MAX_ATTEMPTS = 5;

  const refMissing = !reference || !reference.trim();

  useEffect(() => {
    if (refMissing) {
      setError("no_passage");
      return;
    }
    if (verses || loading || error) return;
    if (attemptCountRef.current >= MAX_ATTEMPTS) {
      setError("retry_exhausted");
      return;
    }
    attemptCountRef.current += 1;
    setLoading(true);
    fetch(`/api/bible?ref=${encodeURIComponent(reference)}&version=${version}`)
      .then(async (r) => {
        const data = await r.json();
        if (!r.ok || data.error) {
          // Any API failure for a missing/unscrapable passage collapses to
          // the same friendly message — user doesn't care about 400 vs 404.
          setError("no_passage");
          return;
        }
        setVerses(data.verses || []);
        attemptCountRef.current = 0;
      })
      .catch(() => setError("no_passage"))
      .finally(() => setLoading(false));
  }, [reference, version, verses, loading, error, refMissing]);

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

  const getSelectedReference = () => {
    if (highlighted.size === 0) return reference;
    // Parse "요한복음 15:1-12" → "요한복음 15" then append selected verse range
    const match = reference.match(/^(.+)\s(\d+):/);
    if (!match) return reference;
    const bookChapter = `${match[1]} ${match[2]}`;
    const sorted = [...highlighted].sort((a, b) => a - b);
    if (sorted.length === 1) return `${bookChapter}:${sorted[0]}`;
    return `${bookChapter}:${sorted[0]}-${sorted[sorted.length - 1]}`;
  };

  const handleCopyAll = async () => {
    if (!verses) return;
    const toCopy =
      highlighted.size > 0
        ? [...highlighted]
            .sort((a, b) => a - b)
            .map((n) => {
              const v = verses.find((x) => x.verse === n);
              return v ? `${v.verse} ${v.text}` : "";
            })
            .filter(Boolean)
            .join("\n")
        : verses.map((v) => `${v.verse} ${v.text}`).join("\n");

    const fullText = `${getSelectedReference()} (${version})\n${toCopy}`;
    try {
      await navigator.clipboard.writeText(fullText);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch (e) {
      console.error(e);
    }
  };

  const handleRetry = () => {
    attemptCountRef.current = 0;
    setError(null);
    setVerses(null);
  };

  const versionLabel = version === "KRV" ? "개역한글" : "ESV";
  const copyLabel =
    highlighted.size > 0 ? `${highlighted.size}개 복사` : "전체 복사";

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
              className="text-sm font-semibold"
              style={{ color: "var(--accent)" }}
            >
              {reference}
            </h2>
            <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
              {versionLabel}
            </p>
          </div>

          {/* Nav arrows — always centered regardless of right-side buttons */}
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
            {verses && verses.length > 0 && (
              <button
                onClick={handleCopyAll}
                className="w-9 h-9 flex items-center justify-center rounded-lg cursor-pointer transition-colors"
                style={{
                  background: "var(--bg-input)",
                  color: copied ? "var(--success)" : "var(--text-secondary)",
                }}
                title={copied ? "복사됨" : copyLabel}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="16"
                  height="16"
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
              </button>
            )}
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
        <div className="flex-1 overflow-y-auto p-4">
          {loading && !verses && (
            <p style={{ color: "var(--text-muted)" }}>본문 불러오는 중...</p>
          )}
          {error && (
            <div className="py-6 text-center">
              {error === "no_passage" ? (
                <>
                  <p
                    className="text-sm leading-relaxed"
                    style={{ color: "var(--text-secondary)" }}
                  >
                    해당 날짜의 본문이 아직 업로드되지 않았습니다.
                    <br />
                    <a
                      href="https://cdmb.link/qt/"
                      target="_blank"
                      rel="noreferrer"
                      className="underline"
                      style={{ color: "var(--accent)" }}
                    >
                      cdmb.link/qt/
                    </a>
                    를 직접 확인하세요.
                  </p>
                </>
              ) : (
                <p
                  className="text-sm"
                  style={{ color: "var(--text-secondary)" }}
                >
                  여러 번 시도했지만 본문을 가져올 수 없습니다.
                </p>
              )}
              {!refMissing && (
                <button
                  onClick={handleRetry}
                  className="mt-3 px-3 py-1 rounded text-xs cursor-pointer"
                  style={{
                    background: "var(--bg-input)",
                    color: "var(--text-secondary)",
                    border: "1px solid var(--border)",
                  }}
                >
                  다시 시도
                </button>
              )}
            </div>
          )}
          {verses && verses.length > 0 && (
            <div className="space-y-1.5 text-sm leading-relaxed">
              {verses.map((v) => {
                const isHighlighted = highlighted.has(v.verse);
                return (
                  <p
                    key={v.verse}
                    onClick={() => toggleHighlight(v.verse)}
                    className="cursor-pointer rounded px-2 py-1 -mx-1 transition-colors select-text"
                    style={{
                      background: isHighlighted
                        ? "rgba(124, 140, 240, 0.2)"
                        : "transparent",
                      borderLeft: isHighlighted
                        ? "3px solid var(--accent)"
                        : "3px solid transparent",
                      color: "var(--text-primary)",
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
      </div>
  );
}
