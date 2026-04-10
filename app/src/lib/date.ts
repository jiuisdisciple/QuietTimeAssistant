// Date helpers that always use KST (Asia/Seoul) timezone
// regardless of where the code runs (client browser or Vercel server)

const KST_FORMATTER = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Asia/Seoul",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

export function getKSTDate(offsetDays = 0): string {
  const now = new Date();
  const todayKST = KST_FORMATTER.format(now); // "2026-04-11"
  if (offsetDays === 0) return todayKST;

  const [y, m, d] = todayKST.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  date.setUTCDate(date.getUTCDate() + offsetDays);
  return date.toISOString().split("T")[0];
}
