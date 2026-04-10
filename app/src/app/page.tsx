"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { getKSTDate } from "@/lib/date";

const TimeChart = dynamic(() => import("@/components/TimeChart"), {
  ssr: false,
  loading: () => (
    <div className="h-48 flex items-center justify-center" style={{ color: "var(--text-muted)" }}>
      차트 로딩중...
    </div>
  ),
});

interface Devotion {
  date: string;
  content: string;
  done_at: string | null;
  full_reference: string | null;
}

interface Passage {
  date: string;
  full_reference: string;
}

interface Stats {
  timeline: { date: string; done_at: string | null }[];
  streak: number;
}

export default function Home() {
  const [todayPassage, setTodayPassage] = useState<Passage | null>(null);
  const [tomorrowPassage, setTomorrowPassage] = useState<Passage | null>(null);
  const [devotions, setDevotions] = useState<Devotion[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [showChart, setShowChart] = useState(false);
  const [loading, setLoading] = useState(true);

  const today = getKSTDate(0);
  const tomorrow = getKSTDate(1);

  useEffect(() => {
    Promise.all([
      fetch(`/api/passage?date=${today}`).then((r) => r.json()),
      fetch(`/api/passage?date=${tomorrow}`).then((r) => r.json()),
      fetch("/api/devotion?limit=30").then((r) => r.json()),
      fetch("/api/stats").then((r) => r.json()),
    ])
      .then(([passage, tomPassage, devs, statsData]) => {
        if (!passage.error) setTodayPassage(passage);
        if (!tomPassage.error) setTomorrowPassage(tomPassage);
        if (Array.isArray(devs)) setDevotions(devs);
        if (!statsData.error) setStats(statsData);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [today, tomorrow]);

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center" style={{ color: "var(--text-muted)" }}>
          <div className="text-2xl mb-2">✝</div>
          <p>로딩중...</p>
        </div>
      </div>
    );
  }

  return (
    <main className="flex-1 max-w-lg mx-auto w-full px-4 py-6">
      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="text-xl font-semibold tracking-tight" style={{ color: "var(--text-primary)" }}>
          QuietTime
        </h1>
        <p className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>
          매일의 큐티 습관
        </p>
      </div>

      {/* Today's Passage */}
      {todayPassage && (
        <div
          className="text-center mb-4 py-3 px-4 rounded-lg"
          style={{ background: "var(--bg-secondary)" }}
        >
          <p className="text-xs" style={{ color: "var(--text-muted)" }}>
            오늘의 본문
          </p>
          <p className="text-base font-medium mt-1" style={{ color: "var(--accent)" }}>
            {todayPassage.full_reference}
          </p>
        </div>
      )}

      {/* Streak */}
      {stats && stats.streak > 0 && (
        <div className="text-center mb-4">
          <span
            className="inline-block px-3 py-1 rounded-full text-sm"
            style={{ background: "var(--bg-card)", color: "var(--success)" }}
          >
            {stats.streak}일 연속 큐티
          </span>
        </div>
      )}

      {/* Tomorrow Button (faded, preview) */}
      {tomorrowPassage && (
        <Link href={`/devotion/${tomorrow}`}>
          <div
            className="mb-3 p-3 rounded-xl cursor-pointer transition-all hover:opacity-80 opacity-50"
            style={{
              background: "var(--bg-card)",
              border: "1px dashed var(--border)",
            }}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                  내일 미리보기
                </p>
                <p className="text-sm font-medium" style={{ color: "var(--text-secondary)" }}>
                  {tomorrow}
                </p>
                <p className="text-xs mt-0.5" style={{ color: "var(--text-secondary)" }}>
                  {tomorrowPassage.full_reference}
                </p>
              </div>
              <span className="text-lg" style={{ color: "var(--text-muted)" }}>
                &rarr;
              </span>
            </div>
          </div>
        </Link>
      )}

      {/* Today Button */}
      <Link href={`/devotion/${today}`}>
        <div
          className="mb-6 p-4 rounded-xl cursor-pointer transition-all hover:scale-[1.01]"
          style={{
            background: "var(--bg-card)",
            border: "2px solid var(--accent)",
            boxShadow: "0 0 20px var(--accent-glow)",
          }}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm" style={{ color: "var(--text-muted)" }}>
                오늘
              </p>
              <p className="font-semibold" style={{ color: "var(--text-primary)" }}>
                {today}
              </p>
              {todayPassage && (
                <p className="text-sm mt-1" style={{ color: "var(--text-secondary)" }}>
                  {todayPassage.full_reference}
                </p>
              )}
            </div>
            <span className="text-2xl" style={{ color: "var(--accent)" }}>
              &rarr;
            </span>
          </div>
        </div>
      </Link>

      {/* Time Trajectory */}
      <div className="mb-6">
        <button
          onClick={() => setShowChart(!showChart)}
          className="flex items-center gap-2 mb-3 text-sm cursor-pointer"
          style={{ color: "var(--text-secondary)" }}
        >
          <span>&#x1F550;</span>
          <span>큐티 시간 궤적</span>
          <span className="text-xs">{showChart ? "▲" : "▼"}</span>
        </button>
        {showChart && stats && <TimeChart timeline={stats.timeline} />}
      </div>

      {/* Past Devotions List */}
      <div>
        <h2 className="text-sm font-medium mb-3" style={{ color: "var(--text-muted)" }}>
          지난 큐티
        </h2>
        <div className="space-y-2">
          {(() => {
            const past = devotions
              .map((d) => ({ ...d, dateStr: String(d.date).slice(0, 10) }))
              .filter((d) => d.dateStr !== today && d.done_at);
            if (past.length === 0) {
              return (
                <p
                  className="text-sm text-center py-4"
                  style={{ color: "var(--text-muted)" }}
                >
                  아직 작성한 큐티가 없습니다
                </p>
              );
            }
            return past.map((d) => (
              <Link href={`/devotion/${d.dateStr}`} key={d.dateStr}>
                <div
                  className="p-3 rounded-lg transition-colors hover:opacity-90"
                  style={{
                    background: "var(--bg-card)",
                    border: "1px solid var(--border)",
                  }}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <span
                        className="text-sm font-medium"
                        style={{ color: "var(--text-primary)" }}
                      >
                        {d.dateStr}
                      </span>
                      {d.full_reference && (
                        <span
                          className="text-sm ml-2"
                          style={{ color: "var(--text-secondary)" }}
                        >
                          — {d.full_reference}
                        </span>
                      )}
                    </div>
                    <span
                      className="text-xs"
                      style={{ color: "var(--text-muted)" }}
                    >
                      {d.done_at
                        ? new Date(d.done_at).toLocaleTimeString("ko-KR", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })
                        : ""}
                    </span>
                  </div>
                </div>
              </Link>
            ));
          })()}
        </div>
      </div>
    </main>
  );
}
