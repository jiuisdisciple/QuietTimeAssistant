"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface User {
  id: number;
  email: string;
  name: string;
  reason: string | null;
  status: "pending" | "approved" | "rejected";
  is_admin: boolean;
  created_at: string;
  approved_at: string | null;
}

export default function AdminClient() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  const loadUsers = () => {
    setLoading(true);
    fetch("/api/admin/users")
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setUsers(data);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const handleAction = async (userId: number, action: "approve" | "reject") => {
    await fetch("/api/admin/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, action }),
    });
    loadUsers();
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <p style={{ color: "var(--text-muted)" }}>로딩중...</p>
      </div>
    );
  }

  const pending = users.filter((u) => u.status === "pending");
  const approved = users.filter((u) => u.status === "approved");
  const rejected = users.filter((u) => u.status === "rejected");

  return (
    <main className="flex-1 max-w-lg mx-auto w-full px-4 py-6">
      <div className="flex items-center justify-between mb-6">
        <Link
          href="/"
          className="text-sm px-3 py-1 rounded-lg"
          style={{
            color: "var(--text-secondary)",
            background: "var(--bg-card)",
          }}
        >
          ← 홈
        </Link>
        <h1
          className="text-lg font-semibold"
          style={{ color: "var(--text-primary)" }}
        >
          사용자 관리
        </h1>
      </div>

      {/* Pending section */}
      <section className="mb-6">
        <h2
          className="text-sm font-medium mb-2"
          style={{ color: "var(--text-muted)" }}
        >
          승인 대기 ({pending.length})
        </h2>
        {pending.length === 0 ? (
          <p
            className="text-xs py-4 text-center"
            style={{ color: "var(--text-muted)" }}
          >
            대기 중인 사용자가 없습니다
          </p>
        ) : (
          <div className="space-y-3">
            {pending.map((u) => (
              <div
                key={u.id}
                className="p-4 rounded-xl"
                style={{
                  background: "var(--bg-card)",
                  border: "1px solid var(--border)",
                }}
              >
                <p
                  className="font-medium"
                  style={{ color: "var(--text-primary)" }}
                >
                  {u.name}
                </p>
                <p
                  className="text-xs mb-2"
                  style={{ color: "var(--text-muted)" }}
                >
                  {u.email}
                </p>
                <p
                  className="text-sm mb-3 whitespace-pre-wrap p-2 rounded"
                  style={{
                    color: "var(--text-secondary)",
                    background: "var(--bg-secondary)",
                  }}
                >
                  {u.reason || "(동기 없음)"}
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleAction(u.id, "approve")}
                    className="flex-1 py-1.5 rounded-lg text-xs font-medium cursor-pointer"
                    style={{
                      background: "var(--accent)",
                      color: "#fff",
                    }}
                  >
                    승인
                  </button>
                  <button
                    onClick={() => handleAction(u.id, "reject")}
                    className="flex-1 py-1.5 rounded-lg text-xs font-medium cursor-pointer"
                    style={{
                      background: "var(--bg-input)",
                      color: "var(--danger)",
                      border: "1px solid var(--border)",
                    }}
                  >
                    거절
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Approved */}
      <section className="mb-6">
        <h2
          className="text-sm font-medium mb-2"
          style={{ color: "var(--text-muted)" }}
        >
          승인됨 ({approved.length})
        </h2>
        <div className="space-y-2">
          {approved.map((u) => (
            <div
              key={u.id}
              className="p-3 rounded-lg flex items-center justify-between"
              style={{
                background: "var(--bg-card)",
                border: "1px solid var(--border)",
              }}
            >
              <div>
                <span
                  className="text-sm font-medium"
                  style={{ color: "var(--text-primary)" }}
                >
                  {u.name}
                </span>
                {u.is_admin && (
                  <span
                    className="text-xs ml-2 px-1.5 rounded"
                    style={{
                      background: "var(--accent)",
                      color: "#fff",
                    }}
                  >
                    ADMIN
                  </span>
                )}
                <span
                  className="text-xs ml-2"
                  style={{ color: "var(--text-muted)" }}
                >
                  {u.email}
                </span>
              </div>
              {!u.is_admin && (
                <button
                  onClick={() => handleAction(u.id, "reject")}
                  className="text-xs px-2 py-1 rounded cursor-pointer"
                  style={{
                    background: "var(--bg-input)",
                    color: "var(--danger)",
                  }}
                >
                  차단
                </button>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* Rejected */}
      {rejected.length > 0 && (
        <section>
          <h2
            className="text-sm font-medium mb-2"
            style={{ color: "var(--text-muted)" }}
          >
            거절됨 ({rejected.length})
          </h2>
          <div className="space-y-2">
            {rejected.map((u) => (
              <div
                key={u.id}
                className="p-3 rounded-lg flex items-center justify-between"
                style={{
                  background: "var(--bg-card)",
                  border: "1px solid var(--border)",
                  opacity: 0.5,
                }}
              >
                <div>
                  <span
                    className="text-sm"
                    style={{ color: "var(--text-primary)" }}
                  >
                    {u.name}
                  </span>
                  <span
                    className="text-xs ml-2"
                    style={{ color: "var(--text-muted)" }}
                  >
                    {u.email}
                  </span>
                </div>
                <button
                  onClick={() => handleAction(u.id, "approve")}
                  className="text-xs px-2 py-1 rounded cursor-pointer"
                  style={{
                    background: "var(--bg-input)",
                    color: "var(--success)",
                  }}
                >
                  복구
                </button>
              </div>
            ))}
          </div>
        </section>
      )}
    </main>
  );
}
