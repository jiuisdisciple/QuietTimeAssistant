<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# QuietTimeAssistant — project guide

Personal Korean daily devotion (큐티) app. Single-owner, multi-user with admin approval. Hosted on Vercel (Next.js 16 + Vercel Postgres/Neon + Clerk auth + OpenAI GPT-5).

## Language & audience
- All user-facing copy is Korean. Do not switch to English in UI strings.
- Theology default: Reformed (개혁신학) — keep QnA prompts aligned.
- Users are Christian adults doing daily Bible devotions; tone should be gentle and respectful.

## Timezone — ALWAYS KST
- Never call `new Date().toISOString().slice(0,10)` for "today." It returns UTC and breaks around midnight.
- Use `getKSTDate(offsetDays)` from `src/lib/date.ts` for any `YYYY-MM-DD` string, on both server and client.
- When extracting hour-of-day (e.g. `TimeChart`), use explicit `Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Seoul", hour: "2-digit", hour12: false })`, not `getHours()`.

## GPT-5 quirks (src/lib/ai.ts)
- Use `max_completion_tokens`, NOT `max_tokens`. The old name silently truncates to 0 output.
- Always set `reasoning_effort: "minimal"` unless we specifically want deep reasoning — otherwise reasoning tokens eat the whole budget and the response comes back empty.
- Budget generously: 6000–8000 tokens. GPT-5 reasoning consumes a large portion before any visible output.
- Model id is `"gpt-5"`.

## Auth & routing (Clerk)
- Middleware lives in `src/proxy.ts` (Next.js 16 renamed `middleware.ts` → `proxy.ts`). Add new unauthenticated endpoints to `isPublicRoute` there.
- Every DB query MUST filter by `user_id` from `getCurrentAppUser()`. Never trust a client-supplied user id.
- Status gate: `!user` → `/register`, `user.status !== "approved"` → `/pending`, otherwise home.
- Admin page is hidden at `/admin/jiwoosong`. The `/admin` route deliberately 404s so the real URL isn't discoverable. Non-admins on the hidden URL also get 404 (not 403) for the same reason. Do not advertise the path in UI.
- `ADMIN_EMAIL` env var auto-approves and sets `is_admin=true` on registration. Keep this behavior.

## Database (src/lib/db.ts)
- Migrations via `CREATE TABLE IF NOT EXISTS` + `ALTER TABLE ... ADD COLUMN IF NOT EXISTS`. `initDB()` is idempotent — safe to call repeatedly.
- `devotions` has a `UNIQUE (user_id, date)` constraint; upsert with `ON CONFLICT (user_id, date)`.
- On update, preserve original completion time with `done_at = COALESCE(devotions.done_at, NOW())`. Do not overwrite it.

## Scraping (src/lib/scraper.ts)
- Source: `cdmb.link` via the AWS API gateway URL already wired up. Do not introduce HTML scraping.
- The reference format is sometimes `시73:1-28` (no space between book and chapter). The parser handles both — don't "simplify" the regex.
- `/api/passage` auto-heals bad cached entries by detecting missing space and re-fetching. Preserve that logic.

## Bible text (src/lib/bible.ts)
- bolls.life API, translations `KRV` (개역개정) and `ESV`. No API key needed.
- Keep the Korean book abbreviation map in sync with `scraper.ts`.

## UI conventions
- Mobile-first, dark theme only, max width `max-w-lg`. Use the CSS variables in `globals.css` (`--bg-card`, `--text-primary`, `--accent`, etc.) instead of hardcoded colors.
- Fonts: Geist (sans), Noto Serif KR (serif), Gowun Dodum (hand). Do NOT reintroduce Nanum Pen Script — it was rejected for readability.
- Don't add emojis to UI unless the user explicitly asks. A few existing emoji buttons (📖, 💬) are fine to keep.

## What NOT to do
- Don't create new markdown docs (README, NOTES, CHANGELOG, etc.) unless the user explicitly asks.
- Don't add error-handling/fallback code for scenarios that can't happen. Trust framework guarantees; validate only at system boundaries.
- Don't add feature flags or backwards-compat shims. Just change the code.
- Don't run destructive git commands (`reset --hard`, force push, branch delete) without an explicit request.
