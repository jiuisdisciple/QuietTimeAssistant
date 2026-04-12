"use client";

import { useEffect, useRef, useState } from "react";

interface Message {
  id?: number;
  role: "user" | "assistant";
  content: string;
}

interface Session {
  id: number;
  title: string | null;
  created_at: string;
  message_count: number;
}

interface ChatPopupProps {
  date: string;
  passageReference: string;
  onClose: () => void;
  onPrev?: () => void;
  onNext?: () => void;
}

export default function ChatPopup({
  date,
  passageReference,
  onClose,
  onPrev,
  onNext,
}: ChatPopupProps) {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<number | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [showSessionList, setShowSessionList] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Load sessions on mount
  useEffect(() => {
    fetch(`/api/chat?date=${date}`)
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setSessions(data);
      })
      .catch(console.error);
  }, [date]);

  // Load messages when session changes
  useEffect(() => {
    if (currentSessionId) {
      fetch(`/api/chat?session_id=${currentSessionId}`)
        .then((r) => r.json())
        .then((data) => {
          if (Array.isArray(data)) setMessages(data);
        })
        .catch(console.error);
    } else {
      setMessages([]);
    }
  }, [currentSessionId]);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, sending]);

  const handleSend = async () => {
    const trimmed = input.trim();
    if (!trimmed || sending) return;

    setInput("");
    if (inputRef.current) inputRef.current.style.height = "auto";
    setSending(true);

    // Optimistic update: show user message immediately
    setMessages((prev) => [...prev, { role: "user", content: trimmed }]);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date,
          session_id: currentSessionId,
          message: trimmed,
          passage_reference: passageReference,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        alert(`오류: ${err.error}`);
        return;
      }

      const data = await res.json();
      setCurrentSessionId(data.session_id);
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: data.reply },
      ]);

      // Refresh session list
      const sessionRes = await fetch(`/api/chat?date=${date}`);
      const sessionData = await sessionRes.json();
      if (Array.isArray(sessionData)) setSessions(sessionData);
    } catch (e) {
      console.error(e);
      alert(`오류: ${e}`);
    } finally {
      setSending(false);
    }
  };

  const handleNewSession = () => {
    setCurrentSessionId(null);
    setMessages([]);
    setShowSessionList(false);
  };

  const handleSelectSession = (id: number) => {
    setCurrentSessionId(id);
    setShowSessionList(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div
      className="w-full h-full rounded-xl flex flex-col"
      style={{
        background: "var(--bg-card)",
        border: "1px solid var(--border)",
      }}
    >
        {/* Header */}
        <div
          className="relative flex items-center justify-between p-4 shrink-0"
          style={{ borderBottom: "1px solid var(--border)" }}
        >
          <div>
            <h2
              className="text-base font-semibold"
              style={{ color: "var(--accent)" }}
            >
              QnA
            </h2>
            <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
              개혁신학 관점
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
              onClick={() => setShowSessionList(!showSessionList)}
              className="px-2 py-1 rounded text-xs cursor-pointer"
              style={{
                color: "var(--text-secondary)",
                background: "var(--bg-input)",
              }}
            >
              세션 {sessions.length > 0 ? `(${sessions.length})` : ""}
            </button>
            <button
              onClick={handleNewSession}
              className="px-2 py-1 rounded text-xs cursor-pointer"
              style={{
                color: "var(--text-secondary)",
                background: "var(--bg-input)",
              }}
            >
              + 새 대화
            </button>
            <button
              onClick={onClose}
              className="text-2xl leading-none px-2 rounded hover:opacity-70 cursor-pointer"
              style={{ color: "var(--text-secondary)" }}
            >
              ×
            </button>
          </div>
        </div>

        {/* Session list overlay */}
        {showSessionList && (
          <div
            className="flex-1 overflow-y-auto p-3"
            style={{ background: "var(--bg-secondary)" }}
          >
            {sessions.length === 0 ? (
              <p
                className="text-sm text-center py-8"
                style={{ color: "var(--text-muted)" }}
              >
                아직 대화 기록이 없습니다
              </p>
            ) : (
              <div className="space-y-2">
                {sessions.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => handleSelectSession(s.id)}
                    className="w-full p-3 rounded-lg text-left hover:opacity-80 cursor-pointer"
                    style={{
                      background:
                        currentSessionId === s.id
                          ? "var(--bg-input)"
                          : "var(--bg-card)",
                      border: "1px solid var(--border)",
                    }}
                  >
                    <p
                      className="text-sm font-medium truncate"
                      style={{ color: "var(--text-primary)" }}
                    >
                      {s.title || "(제목 없음)"}
                    </p>
                    <p
                      className="text-xs mt-1"
                      style={{ color: "var(--text-muted)" }}
                    >
                      {new Date(s.created_at).toLocaleString("ko-KR", {
                        month: "2-digit",
                        day: "2-digit",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                      {" · "}
                      {s.message_count}개 메시지
                    </p>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Messages */}
        {!showSessionList && (
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {messages.length === 0 && (
              <p
                className="text-sm text-center pt-8"
                style={{ color: "var(--text-muted)" }}
              >
                본문에 대해 궁금한 점을 물어보세요.
                <br />
                <span className="text-xs">
                  예: &quot;시편 73:20에서 하나님께서도 잠에서 깨신다는
                  표현을 쓴 것 같은데, 하나님께서도 잠을 주무시려나? 어떠한
                  의미인지 궁금해.&quot;
                </span>
              </p>
            )}
            {messages.map((m, i) => (
              <div
                key={i}
                className={`flex ${
                  m.role === "user" ? "justify-end" : "justify-start"
                }`}
              >
                <div
                  className="max-w-[80%] p-3 rounded-xl text-sm leading-relaxed whitespace-pre-wrap"
                  style={
                    m.role === "user"
                      ? {
                          background: "var(--accent)",
                          color: "#fff",
                        }
                      : {
                          background: "var(--bg-secondary)",
                          color: "var(--text-primary)",
                          border: "1px solid var(--border)",
                        }
                  }
                >
                  {m.content}
                </div>
              </div>
            ))}
            {sending && (
              <div className="flex justify-start">
                <div
                  className="p-3 rounded-xl flex items-center gap-1"
                  style={{
                    background: "var(--bg-secondary)",
                    border: "1px solid var(--border)",
                  }}
                >
                  {[0, 150, 300].map((delay) => (
                    <span
                      key={delay}
                      className="w-2 h-2 rounded-full animate-bounce"
                      style={{
                        background: "var(--text-muted)",
                        animationDelay: `${delay}ms`,
                        display: "inline-block",
                      }}
                    />
                  ))}
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        )}

        {/* Input */}
        {!showSessionList && (
          <div className="p-3" style={{ borderTop: "1px solid var(--border)" }}>
            <div className="flex items-end gap-2">
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => {
                  setInput(e.target.value);
                  const el = e.target;
                  el.style.height = "auto";
                  el.style.height = Math.min(el.scrollHeight, 120) + "px";
                }}
                onKeyDown={handleKeyDown}
                placeholder="질문을 입력하세요... (Enter: 전송, Shift+Enter: 줄바꿈)"
                className="flex-1 p-2 rounded-lg text-sm resize-none outline-none"
                style={{
                  background: "var(--bg-input)",
                  border: "1px solid var(--border)",
                  color: "var(--text-primary)",
                  minHeight: "4.5rem",
                  maxHeight: "7.5rem",
                  overflowY: "auto",
                }}
              />
              <button
                onClick={handleSend}
                disabled={sending || !input.trim()}
                className="px-3 py-2 rounded-lg text-sm font-medium cursor-pointer disabled:opacity-40"
                style={{
                  background: "var(--accent)",
                  color: "#fff",
                }}
              >
                전송
              </button>
            </div>
          </div>
        )}
      </div>
  );
}
