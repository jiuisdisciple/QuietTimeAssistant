"use client";

import { use, useEffect, useState, useCallback, useRef } from "react";
import Link from "next/link";
import FeedbackModal from "@/components/FeedbackModal";
import ScriptureModal from "@/components/ScriptureModal";
import SummaryModal from "@/components/SummaryModal";
import ChatPopup from "@/components/ChatPopup";
import PrayerPopup from "@/components/PrayerPopup";
import { getKSTDate } from "@/lib/date";

interface PassageData {
  full_reference: string;
  ai_summary: string;
}

interface DevotionData {
  content: string;
  done_at: string | null;
  feedback_report: string | null;
}

type PanelId = "KRV" | "ESV" | "AI" | "QnA";
const PANELS: PanelId[] = ["KRV", "ESV", "AI", "QnA"];

export default function DevotionClient({
  params,
}: {
  params: Promise<{ date: string }>;
}) {
  const { date } = use(params);
  const [passage, setPassage] = useState<PassageData | null>(null);
  const [, setDevotion] = useState<DevotionData | null>(null);
  const [content, setContent] = useState("");
  const [activePanel, setActivePanel] = useState<PanelId | null>(null);
  const [openedPanels, setOpenedPanels] = useState<Set<PanelId>>(new Set());
  const [prayerOpen, setPrayerOpen] = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);
  const [feedbackReport, setFeedbackReport] = useState("");
  const [feedbackLoading, setFeedbackLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [isDone, setIsDone] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [contentCopied, setContentCopied] = useState(false);
  const [loading, setLoading] = useState(true);
  const autoSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const openPanel = (id: PanelId) => {
    setOpenedPanels((prev) => new Set([...prev, id]));
    setActivePanel(id);
  };
  const closePanel = () => {
    setActivePanel(null);
    setOpenedPanels(new Set());
  };
  const prevPanel = () => {
    if (!activePanel) return;
    const i = PANELS.indexOf(activePanel);
    const prev = PANELS[(i - 1 + PANELS.length) % PANELS.length];
    setOpenedPanels((p) => new Set([...p, prev]));
    setActivePanel(prev);
  };
  const nextPanel = () => {
    if (!activePanel) return;
    const i = PANELS.indexOf(activePanel);
    const next = PANELS[(i + 1) % PANELS.length];
    setOpenedPanels((p) => new Set([...p, next]));
    setActivePanel(next);
  };

  const today = getKSTDate(0);
  const isToday = date === today;
  const isFuture = date > today;
  // Read-only when: past day, future day, or done (unless user enabled edit mode)
  const isReadOnly = !isToday || (isDone && !editMode);

  // Load data
  useEffect(() => {
    Promise.all([
      fetch(`/api/passage?date=${date}`).then((r) => r.json()),
      fetch(`/api/devotion?date=${date}`).then((r) => r.json()),
    ])
      .then(([passageData, devotionData]) => {
        if (!passageData.error) setPassage(passageData);
        if (devotionData) {
          setDevotion(devotionData);
          setContent(devotionData.content || "");
          setIsDone(!!devotionData.done_at);
          if (devotionData.feedback_report) {
            setFeedbackReport(devotionData.feedback_report);
          }
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [date]);

  // Auto-save (3 seconds after typing stops)
  const autoSave = useCallback(
    (text: string) => {
      if (!isToday) return;
      setSaving(true);
      fetch("/api/devotion", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date,
          content: text,
          passage_reference: passage?.full_reference || null,
          done: false,
          // If already done, don't touch done_at
          preserve_done: isDone,
        }),
      })
        .then(() => {
          setSaved(true);
          setTimeout(() => setSaved(false), 2000);
        })
        .catch(console.error)
        .finally(() => setSaving(false));
    },
    [date, passage, isToday, isDone]
  );

  const handleContentChange = (text: string) => {
    setContent(text);
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    autoSaveTimer.current = setTimeout(() => autoSave(text), 3000);
  };

  // 묵상 완료
  const handleDone = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/devotion", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date,
          content,
          passage_reference: passage?.full_reference || null,
          done: true,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        alert(`저장 실패: ${err.error || "알 수 없는 오류"}`);
        return;
      }
      setIsDone(true);
      setEditMode(false);
      setPrayerOpen(true);
    } catch (e) {
      console.error(e);
      alert(`저장 중 오류: ${e}`);
    } finally {
      setSaving(false);
    }
  };

  // Feedback
  const handleFeedback = async () => {
    if (!content.trim()) return;
    setFeedbackLoading(true);
    try {
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date,
          content,
          passage_reference: passage?.full_reference || "(본문 정보 없음)",
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        alert(`피드백 실패: ${err.error || "알 수 없는 오류"}`);
        return;
      }
      const data = await res.json();
      setFeedbackReport(data.report);
      setShowFeedback(true);
    } catch (e) {
      console.error(e);
      alert(`피드백 중 오류: ${e}`);
    } finally {
      setFeedbackLoading(false);
    }
  };

  const handleCopyContent = async () => {
    if (!content.trim()) return;
    try {
      const fullText = passage?.full_reference
        ? `${passage.full_reference}\n\n${content}`
        : content;
      await navigator.clipboard.writeText(fullText);
      setContentCopied(true);
      setTimeout(() => setContentCopied(false), 1500);
    } catch (e) {
      console.error(e);
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <p style={{ color: "var(--text-muted)" }}>로딩중...</p>
      </div>
    );
  }

  // Save indicator
  const saveIndicator = (
    <>
      {saving && (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="var(--text-muted)"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="animate-spin"
        >
          <path d="M21 12a9 9 0 1 1-6.219-8.56" />
        </svg>
      )}
      {!saving && saved && (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="var(--text-muted)"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <polyline points="20 6 9 17 4 12" />
        </svg>
      )}
    </>
  );

  return (
    <main className="flex-1 max-w-lg mx-auto w-full px-4 py-6 flex flex-col">
      {/* Top Bar: Home only */}
      <div className="flex items-center justify-between mb-3">
        <Link
          href="/"
          className="text-sm px-3 py-1 rounded-lg"
          style={{ color: "var(--text-secondary)", background: "var(--bg-card)" }}
        >
          &larr; 홈
        </Link>
        <p className="text-xs" style={{ color: "var(--text-muted)" }}>
          {date}
        </p>
      </div>

      {/* Passage Reference - big bold centered */}
      {passage && (
        <h1
          className="text-2xl font-bold text-center mb-3"
          style={{ color: "var(--accent)" }}
        >
          {passage.full_reference}
        </h1>
      )}

      {/* Action Row: 묵상 완료 group (left) + K/E/AI/QnA (right) */}
      <div className="flex items-center justify-between gap-2 mb-3">
        {/* Left: devotion status/actions */}
        <div className="flex items-center gap-2 flex-wrap">
          {(isToday || isDone) && !isFuture && (
            <>
              {isToday && !isDone && (
                <>
                  <button
                    onClick={handleDone}
                    disabled={!content.trim() || saving}
                    className="text-sm px-3 py-1.5 rounded-lg font-medium transition-colors disabled:opacity-40"
                    style={{ background: "var(--accent)", color: "#fff" }}
                  >
                    묵상 완료
                  </button>
                  {saveIndicator}
                </>
              )}

              {isDone && isToday && !editMode && (
                <>
                  <button
                    onClick={handleCopyContent}
                    className="p-1.5 rounded-lg cursor-pointer"
                    style={{
                      background: "var(--bg-card)",
                      color: contentCopied
                        ? "var(--success)"
                        : "var(--text-secondary)",
                      border: "1px solid var(--border)",
                    }}
                    title="묵상 복사"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                    </svg>
                  </button>
                  <button
                    onClick={() => setEditMode(true)}
                    className="p-1.5 rounded-lg cursor-pointer"
                    style={{
                      background: "var(--bg-card)",
                      color: "var(--text-secondary)",
                      border: "1px solid var(--border)",
                    }}
                    title="수정"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" />
                    </svg>
                  </button>
                  <span
                    className="text-xs px-2 py-1 rounded-lg"
                    style={{ background: "var(--bg-card)", color: "var(--success)" }}
                  >
                    완료
                  </span>
                </>
              )}

              {isDone && isToday && editMode && (
                <>
                  <button
                    onClick={() => setEditMode(false)}
                    className="text-sm px-3 py-1.5 rounded-lg cursor-pointer"
                    style={{
                      background: "var(--bg-card)",
                      color: "var(--text-secondary)",
                      border: "1px solid var(--border)",
                    }}
                  >
                    편집 종료
                  </button>
                  {saveIndicator}
                </>
              )}

              {isDone && !isToday && (
                <span
                  className="text-sm px-3 py-1 rounded-lg"
                  style={{ background: "var(--bg-card)", color: "var(--success)" }}
                >
                  완료됨
                </span>
              )}
            </>
          )}
        </div>

        {/* Right: K / E / AI / QnA */}
        {passage && (
          <div className="flex items-center gap-1 shrink-0">
          {/* K button: closed book + 한 */}
          <button
            onClick={() => openPanel("KRV")}
            className="flex items-center gap-1 px-3 py-2 rounded-lg text-xs font-medium cursor-pointer transition-colors"
            style={{
              background: "var(--bg-card)",
              color: "var(--text-secondary)",
              border: "1px solid var(--border)",
            }}
            title="개역한글"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20" />
            </svg>
            한
          </button>
          {/* E button: open book + E */}
          <button
            onClick={() => openPanel("ESV")}
            className="flex items-center gap-1 px-3 py-2 rounded-lg text-xs font-medium cursor-pointer transition-colors"
            style={{
              background: "var(--bg-card)",
              color: "var(--text-secondary)",
              border: "1px solid var(--border)",
            }}
            title="ESV"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
              <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
            </svg>
            E
          </button>
          {/* AI button: sparkles icon */}
          <button
            onClick={() => activePanel === "AI" ? closePanel() : openPanel("AI")}
            disabled={!passage.ai_summary}
            className="flex items-center gap-1 px-3 py-2 rounded-lg text-xs font-medium cursor-pointer transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            style={{
              background: activePanel === "AI" ? "var(--accent)" : "var(--bg-card)",
              color: activePanel === "AI" ? "#fff" : "var(--text-secondary)",
              border: "1px solid var(--border)",
            }}
            title="AI 개요"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M12 3v18M3 12h18M5.6 5.6l12.8 12.8M5.6 18.4l12.8-12.8" />
            </svg>
            AI
          </button>
          {/* QnA button: chat bubble */}
          <button
            onClick={() => openPanel("QnA")}
            className="flex items-center justify-center px-3 py-2 rounded-lg cursor-pointer transition-colors"
            style={{
              background: "var(--bg-card)",
              color: "var(--text-secondary)",
              border: "1px solid var(--border)",
            }}
            title="QnA 채팅"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
          </button>
          </div>
        )}
      </div>

      {/* Editor / Read-only view */}
      <div className="flex-1 flex flex-col mb-4 min-h-0">
        {isFuture ? (
          <div
            className="flex-1 flex items-center justify-center p-4 rounded-xl text-sm text-center"
            style={{
              background: "var(--bg-card)",
              border: "1px dashed var(--border)",
              color: "var(--text-muted)",
            }}
          >
            내일의 큐티는 아직 작성할 수 없습니다.
            <br />
            AI 버튼을 눌러 미리 본문을 묵상해보세요.
          </div>
        ) : isReadOnly ? (
          <div
            className="flex-1 p-4 rounded-xl text-sm leading-relaxed whitespace-pre-wrap overflow-y-auto"
            style={{
              background: "var(--bg-card)",
              border: "1px solid var(--border)",
              color: "var(--text-primary)",
            }}
          >
            {content || "작성된 내용이 없습니다."}
          </div>
        ) : (
          <textarea
            value={content}
            onChange={(e) => handleContentChange(e.target.value)}
            placeholder="오늘의 큐티를 작성하세요..."
            className="flex-1 w-full p-4 rounded-xl text-sm leading-relaxed resize-none outline-none"
            style={{
              background: "var(--bg-input)",
              border: "1px solid var(--border)",
              color: "var(--text-primary)",
              minHeight: "200px",
            }}
          />
        )}
      </div>

      {/* Bottom: Review buttons */}
      {(isToday && content.trim()) || (isReadOnly && feedbackReport) ? (
        <div className="flex justify-center gap-2 pb-4">
          {isToday && content.trim() && (
            <button
              onClick={handleFeedback}
              disabled={feedbackLoading}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm transition-colors cursor-pointer disabled:opacity-50"
              style={{
                background: "var(--bg-card)",
                border: "1px solid var(--border)",
                color: "var(--text-secondary)",
              }}
            >
              <span>&#x1F50D;</span>
              <span>{feedbackLoading ? "검토중..." : "검토"}</span>
            </button>
          )}
          {feedbackReport && (
            <button
              onClick={() => setShowFeedback(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm cursor-pointer"
              style={{
                background: "var(--bg-card)",
                border: "1px solid var(--border)",
                color: "var(--text-secondary)",
              }}
            >
              <span>📄</span>
              <span>검토 보기</span>
            </button>
          )}
        </div>
      ) : null}

      {/* Feedback Modal */}
      {showFeedback && feedbackReport && (
        <FeedbackModal
          report={feedbackReport}
          onClose={() => setShowFeedback(false)}
        />
      )}

      {/* Unified panel overlay — all opened panels stay mounted for scroll preservation */}
      {activePanel !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="relative w-full max-w-lg" style={{ height: "85vh" }}>
            {openedPanels.has("KRV") && passage && (
              <div
                className="absolute inset-0"
                style={{
                  visibility: activePanel === "KRV" ? "visible" : "hidden",
                  pointerEvents: activePanel === "KRV" ? "auto" : "none",
                }}
              >
                <ScriptureModal
                  reference={passage.full_reference}
                  version="KRV"
                  onClose={closePanel}
                  onPrev={prevPanel}
                  onNext={nextPanel}
                />
              </div>
            )}
            {openedPanels.has("ESV") && passage && (
              <div
                className="absolute inset-0"
                style={{
                  visibility: activePanel === "ESV" ? "visible" : "hidden",
                  pointerEvents: activePanel === "ESV" ? "auto" : "none",
                }}
              >
                <ScriptureModal
                  reference={passage.full_reference}
                  version="ESV"
                  onClose={closePanel}
                  onPrev={prevPanel}
                  onNext={nextPanel}
                />
              </div>
            )}
            {openedPanels.has("AI") && passage?.ai_summary && (
              <div
                className="absolute inset-0"
                style={{
                  visibility: activePanel === "AI" ? "visible" : "hidden",
                  pointerEvents: activePanel === "AI" ? "auto" : "none",
                }}
              >
                <SummaryModal
                  reference={passage.full_reference}
                  summary={passage.ai_summary}
                  onClose={closePanel}
                  onPrev={prevPanel}
                  onNext={nextPanel}
                />
              </div>
            )}
            {openedPanels.has("QnA") && (
              <div
                className="absolute inset-0"
                style={{
                  visibility: activePanel === "QnA" ? "visible" : "hidden",
                  pointerEvents: activePanel === "QnA" ? "auto" : "none",
                }}
              >
                <ChatPopup
                  date={date}
                  passageReference={passage?.full_reference || "(본문 정보 없음)"}
                  onClose={closePanel}
                  onPrev={prevPanel}
                  onNext={nextPanel}
                />
              </div>
            )}
          </div>
        </div>
      )}

      {/* Prayer Popup (after 묵상 완료) */}
      {prayerOpen && <PrayerPopup onClose={() => setPrayerOpen(false)} />}
    </main>
  );
}
