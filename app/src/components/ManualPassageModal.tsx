"use client";

import { useState } from "react";

interface ManualPassageModalProps {
  date: string;
  label: string; // "오늘" or "내일"
  initialReference?: string; // when provided → edit mode
  onClose: () => void;
  onSaved: () => void;
}

export default function ManualPassageModal({
  date,
  label,
  initialReference,
  onClose,
  onSaved,
}: ManualPassageModalProps) {
  const isEdit = !!initialReference;
  const [reference, setReference] = useState(initialReference || "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    const ref = reference.trim();
    if (!ref) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/passage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date, reference: ref }),
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        setError(data.error || `오류 (${res.status})`);
        return;
      }
      onSaved();
      onClose();
    } catch (e) {
      setError(String(e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div
        className="w-full max-w-sm rounded-xl flex flex-col"
        style={{
          background: "var(--bg-card)",
          border: "1px solid var(--border)",
        }}
      >
        <div
          className="flex items-center justify-between p-4 shrink-0"
          style={{ borderBottom: "1px solid var(--border)" }}
        >
          <h2
            className="text-base font-semibold"
            style={{ color: "var(--text-primary)" }}
          >
            {label}의 본문 {isEdit ? "수정" : "직접 추가"}
          </h2>
          <button
            onClick={onClose}
            disabled={saving}
            className="text-2xl leading-none px-2 cursor-pointer disabled:opacity-50"
            style={{ color: "var(--text-secondary)" }}
            title="닫기"
          >
            ×
          </button>
        </div>

        <div className="p-4">
          <p
            className="text-sm mb-3"
            style={{ color: "var(--text-secondary)" }}
          >
            {label}({date})의 본문을{" "}
            {isEdit ? "수정" : "직접 추가"}하시겠습니까?
            <br />
            <span className="text-xs" style={{ color: "var(--text-muted)" }}>
              예) 시편 73:1-28, 빌립보서 1장, 로마서 8:31-39
            </span>
          </p>

          <input
            type="text"
            value={reference}
            onChange={(e) => setReference(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !saving) handleSubmit();
            }}
            placeholder="본문을 입력하세요"
            disabled={saving}
            autoFocus
            className="w-full px-3 py-2 rounded-lg text-sm outline-none disabled:opacity-50"
            style={{
              background: "var(--bg-input)",
              border: "1px solid var(--border)",
              color: "var(--text-primary)",
            }}
          />

          {error && (
            <p
              className="text-xs mt-2"
              style={{ color: "var(--danger)" }}
            >
              {error}
            </p>
          )}

          <div className="flex justify-end gap-2 mt-4">
            <button
              onClick={onClose}
              disabled={saving}
              className="px-4 py-2 rounded-lg text-sm cursor-pointer disabled:opacity-50"
              style={{
                background: "var(--bg-input)",
                color: "var(--text-secondary)",
                border: "1px solid var(--border)",
              }}
            >
              취소
            </button>
            <button
              onClick={handleSubmit}
              disabled={saving || !reference.trim()}
              className="px-4 py-2 rounded-lg text-sm font-medium cursor-pointer disabled:opacity-50"
              style={{ background: "var(--accent)", color: "#fff" }}
            >
              {saving ? "저장중..." : "예"}
            </button>
          </div>

          {saving && (
            <p
              className="text-xs mt-2 text-center"
              style={{ color: "var(--text-muted)" }}
            >
              AI 해설 생성에 10~20초 걸릴 수 있습니다
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
