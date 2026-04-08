"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Dot,
} from "recharts";

interface TimelineEntry {
  date: string;
  done_at: string | null;
}

function getHourFromTimestamp(timestamp: string | null): number | null {
  if (!timestamp) return null;
  const date = new Date(timestamp);
  return date.getHours() + date.getMinutes() / 60;
}

function getColor(hour: number | null): string {
  if (hour === null) return "#6b7280";
  if (hour < 6) return "#4ade80"; // green
  if (hour < 8) return "#fbbf24"; // yellow
  if (hour < 10) return "#fb923c"; // orange
  return "#f87171"; // red
}

interface CustomDotProps {
  cx?: number;
  cy?: number;
  payload?: { hour: number | null };
}

function CustomDotComponent({ cx, cy, payload }: CustomDotProps) {
  if (cx === undefined || cy === undefined) return null;
  const hour = payload?.hour ?? null;
  const color = getColor(hour);
  const isEmpty = hour === null;

  return (
    <Dot
      cx={cx}
      cy={cy}
      r={isEmpty ? 4 : 6}
      fill={isEmpty ? "transparent" : color}
      stroke={color}
      strokeWidth={2}
    />
  );
}

export default function TimeChart({
  timeline,
}: {
  timeline: TimelineEntry[];
}) {
  // Generate last 7 days
  const days: { date: string; label: string; hour: number | null }[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split("T")[0];
    const entry = timeline.find((t) => t.date === dateStr);
    const hour = entry ? getHourFromTimestamp(entry.done_at) : null;
    days.push({
      date: dateStr,
      label: `${d.getMonth() + 1}/${d.getDate()}`,
      hour,
    });
  }

  return (
    <div className="w-full h-48">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={days} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#2d3a56" />
          <XAxis
            dataKey="label"
            stroke="#6b7280"
            fontSize={12}
          />
          <YAxis
            domain={[0, 24]}
            ticks={[0, 6, 8, 10, 12, 14, 16, 18, 20, 22, 24]}
            stroke="#6b7280"
            fontSize={11}
            tickFormatter={(v) => `${v}시`}
            reversed
          />
          <Tooltip
            contentStyle={{
              background: "#1f2940",
              border: "1px solid #2d3a56",
              borderRadius: "8px",
              color: "#e0e0e0",
            }}
            formatter={(value) => {
              const v = value as number | null;
              return v !== null
                ? [`${Math.floor(v)}시 ${Math.round((v % 1) * 60)}분`, "큐티 시간"]
                : ["미완료", "큐티 시간"];
            }}
          />
          <Line
            type="monotone"
            dataKey="hour"
            stroke="#7c8cf0"
            strokeWidth={2}
            dot={<CustomDotComponent />}
            connectNulls={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
