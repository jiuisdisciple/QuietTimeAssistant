"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function RegisterPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !reason.trim()) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/user/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), reason: reason.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "등록 실패");
        return;
      }
      // Approved admin goes home; others go to pending
      if (data.status === "approved") {
        router.push("/");
      } else {
        router.push("/pending");
      }
    } catch (e) {
      setError(String(e));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="flex-1 flex items-center justify-center p-4">
      <div
        className="w-full max-w-sm rounded-2xl p-6"
        style={{
          background: "var(--bg-card)",
          border: "1px solid var(--border)",
        }}
      >
        <h1
          className="text-xl font-semibold mb-1"
          style={{ color: "var(--text-primary)" }}
        >
          가입 신청
        </h1>
        <p className="text-xs mb-6" style={{ color: "var(--text-muted)" }}>
          관리자 승인 후 사용하실 수 있습니다.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              className="text-xs block mb-1"
              style={{ color: "var(--text-secondary)" }}
            >
              이름
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="실명으로 입력해 주세요"
              maxLength={30}
              className="w-full px-3 py-2 rounded-lg text-sm outline-none"
              style={{
                background: "var(--bg-input)",
                border: "1px solid var(--border)",
                color: "var(--text-primary)",
              }}
              required
            />
          </div>

          <div>
            <label
              className="text-xs block mb-1"
              style={{ color: "var(--text-secondary)" }}
            >
              가입 동기
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="왜 이 앱을 사용하고 싶으신가요?"
              rows={4}
              maxLength={500}
              className="w-full px-3 py-2 rounded-lg text-sm outline-none resize-none"
              style={{
                background: "var(--bg-input)",
                border: "1px solid var(--border)",
                color: "var(--text-primary)",
              }}
              required
            />
            <p
              className="text-xs mt-1 text-right"
              style={{ color: "var(--text-muted)" }}
            >
              {reason.length}/500
            </p>
          </div>

          {error && (
            <p className="text-xs" style={{ color: "var(--danger)" }}>
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={submitting || !name.trim() || !reason.trim()}
            className="w-full py-2.5 rounded-lg text-sm font-medium disabled:opacity-40 cursor-pointer"
            style={{ background: "var(--accent)", color: "#fff" }}
          >
            {submitting ? "제출 중..." : "가입 신청"}
          </button>
        </form>
      </div>
    </main>
  );
}
