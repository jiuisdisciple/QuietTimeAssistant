"use client";

import { use, useEffect, useState, useCallback, useRef } from "react";
import Link from "next/link";
import FeedbackModal from "@/components/FeedbackModal";
import ScripturePanel from "@/components/ScripturePanel";
import ChatPopup from "@/components/ChatPopup";
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

export default function DevotionPage({
  params,
}: {
  params: Promise<{ date: string }>;
}) {
  const { date } = use(params);
  const [passage, setPassage] = useState<PassageData | null>(null);
  const [devotion, setDevotion] = useState<DevotionData | null>(null);
  const [content, setContent] = useState("");
  const [summaryOpen, setSummaryOpen] = useState(false);
  const [krvOpen, setKrvOpen] = useState(false);
  const [esvOpen, setEsvOpen] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);
  const [feedbackReport, setFeedbackReport] = useState("");
  const [feedbackLoading, setFeedbackLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [isDone, setIsDone] = useState(false);
  const [loading, setLoading] = useState(true);
  const autoSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const today = getKSTDate(0);
  const isToday = date === today;
  const isFuture = date > today;
  const isReadOnly = !isToday || isDone;

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
      if (isReadOnly) return;
      setSaving(true);
      fetch("/api/devotion", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date,
          content: text,
          passage_reference: passage?.full_reference || null,
          done: false,
        }),
      })
        .then(() => {
          setSaved(true);
          setTimeout(() => setSaved(false), 2000);
        })
        .catch(console.error)
        .finally(() => setSaving(false));
    },
    [date, passage, isReadOnly]
  );

  const handleContentChange = (text: string) => {
    setContent(text);
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    autoSaveTimer.current = setTimeout(() => autoSave(text), 3000);
  };

  // Done
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

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <p style={{ color: "var(--text-muted)" }}>로딩중...</p>
      </div>
    );
  }

  return (
    <main className="flex-1 max-w-lg mx-auto w-full px-4 py-6 flex flex-col">
      {/* Top Bar */}
      <div className="flex items-center justify-between mb-4">
        <Link
          href="/"
          className="text-sm px-3 py-1 rounded-lg"
          style={{ color: "var(--text-secondary)", background: "var(--bg-card)" }}
        >
          &larr; 홈
        </Link>
        <div className="flex items-center gap-2">
          {saving && (
            <span className="text-xs" style={{ color: "var(--text-muted)" }}>
              저장중...
            </span>
          )}
          {saved && (
            <span className="text-xs" style={{ color: "var(--success)" }}>
              저장됨
            </span>
          )}
          {isToday && !isDone && (
            <button
              onClick={handleDone}
              disabled={!content.trim()}
              className="text-sm px-4 py-1.5 rounded-lg font-medium transition-colors disabled:opacity-40"
              style={{
                background: "var(--accent)",
                color: "#fff",
              }}
            >
              Done
            </button>
          )}
          {isDone && (
            <span
              className="text-sm px-3 py-1 rounded-lg"
              style={{ background: "var(--bg-card)", color: "var(--success)" }}
            >
              완료됨
            </span>
          )}
        </div>
      </div>

      {/* Date & Reference + Quick Actions (inline) */}
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="min-w-0">
          <h1
            className="text-lg font-semibold"
            style={{ color: "var(--text-primary)" }}
          >
            {date}
          </h1>
          {passage && (
            <p
              className="text-sm mt-1 truncate"
              style={{ color: "var(--accent)" }}
            >
              {passage.full_reference}
            </p>
          )}
        </div>
        {passage && (
          <div className="flex gap-1 shrink-0">
            {/* K button: closed book + 한 */}
            <button
              onClick={() => setKrvOpen(!krvOpen)}
              className="flex items-center gap-1 px-2.5 py-2 rounded-lg text-xs font-medium cursor-pointer transition-colors"
              style={{
                background: krvOpen ? "var(--accent)" : "var(--bg-card)",
                color: krvOpen ? "#fff" : "var(--text-secondary)",
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
              onClick={() => setEsvOpen(!esvOpen)}
              className="flex items-center gap-1 px-2.5 py-2 rounded-lg text-xs font-medium cursor-pointer transition-colors"
              style={{
                background: esvOpen ? "var(--accent)" : "var(--bg-card)",
                color: esvOpen ? "#fff" : "var(--text-secondary)",
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
            {/* QnA button: chat bubble */}
            <button
              onClick={() => setChatOpen(true)}
              className="flex items-center justify-center px-2.5 py-2 rounded-lg cursor-pointer transition-colors"
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

      {/* Scripture Panels */}
      {passage && (
        <>
          <ScripturePanel
            reference={passage.full_reference}
            version="KRV"
            open={krvOpen}
          />
          <ScripturePanel
            reference={passage.full_reference}
            version="ESV"
            open={esvOpen}
          />
        </>
      )}

      {/* AI Summary (collapsible) */}
      {passage?.ai_summary && (
        <div
          className="mb-4 rounded-xl overflow-hidden"
          style={{ background: "var(--bg-secondary)", border: "1px solid var(--border)" }}
        >
          <button
            onClick={() => setSummaryOpen(!summaryOpen)}
            className="w-full flex items-center justify-between p-3 text-sm cursor-pointer"
            style={{ color: "var(--text-secondary)" }}
          >
            <span>AI 개요</span>
            <span className="text-xs">{summaryOpen ? "▲ 접기" : "▼ 펼치기"}</span>
          </button>
          {summaryOpen && (
            <div
              className="px-4 pb-4 text-sm leading-relaxed whitespace-pre-wrap"
              style={{ color: "var(--text-primary)" }}
            >
              {passage.ai_summary.split("\n").map((line, i) => {
                if (line.startsWith("## ")) {
                  return (
                    <h3
                      key={i}
                      className="text-sm font-semibold mt-3 mb-1"
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
          )}
        </div>
      )}

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
            위의 AI 개요를 펼쳐서 미리 본문을 묵상해보세요.
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

      {/* QnA Chat Popup */}
      {chatOpen && (
        <ChatPopup
          date={date}
          passageReference={passage?.full_reference || "(본문 정보 없음)"}
          onClose={() => setChatOpen(false)}
        />
      )}
    </main>
  );
}
