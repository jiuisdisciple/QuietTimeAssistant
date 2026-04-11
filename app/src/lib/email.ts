import { Resend } from "resend";

// Email notifications via Resend.
//
// Required env vars:
//   RESEND_API_KEY    — from resend.com dashboard
//   ADMIN_EMAIL       — where new-user notifications go (also auto-approves)
//   ADMIN_PATH        — hidden admin path segment (default: "jiwoosong")
//   NEXT_PUBLIC_SITE_URL — e.g. https://quiet-time-assistant.vercel.app
//
// If RESEND_API_KEY is missing, helpers fail silently (log only). That
// way the app still works in dev / before the key is set.

function getResend(): Resend | null {
  const key = process.env.RESEND_API_KEY;
  if (!key) return null;
  return new Resend(key);
}

function getSiteUrl(): string {
  if (process.env.NEXT_PUBLIC_SITE_URL) {
    return process.env.NEXT_PUBLIC_SITE_URL;
  }
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) {
    return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
  }
  return "https://quiet-time-assistant.vercel.app";
}

function getAdminUrl(): string {
  const base = getSiteUrl().replace(/\/$/, "");
  const seg = process.env.ADMIN_PATH || "jiwoosong";
  return `${base}/admin/${seg}`;
}

// Resend's shared sender works without a verified domain. Good for dev
// and for personal apps that never set up a custom domain.
const FROM = "QuietTime <onboarding@resend.dev>";

interface NewUser {
  name: string;
  email: string;
  reason: string | null;
}

export async function notifyAdminNewUser(newUser: NewUser): Promise<void> {
  const resend = getResend();
  const adminEmail = process.env.ADMIN_EMAIL;
  if (!resend || !adminEmail) {
    console.warn(
      "[email] notifyAdminNewUser skipped — missing RESEND_API_KEY or ADMIN_EMAIL"
    );
    return;
  }

  const adminUrl = getAdminUrl();
  const reasonHtml = (newUser.reason || "(미입력)")
    .split("\n")
    .map((l) => escapeHtml(l))
    .join("<br />");

  try {
    await resend.emails.send({
      from: FROM,
      to: adminEmail,
      subject: `[QuietTime] 새 가입 신청: ${newUser.name}`,
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 560px; margin: 0 auto; padding: 24px; color: #1a1a2e;">
          <h2 style="margin: 0 0 16px; color: #1a1a2e;">새로운 가입 신청이 들어왔어요</h2>
          <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
            <tr>
              <td style="padding: 8px 0; color: #666; width: 80px;">이름</td>
              <td style="padding: 8px 0;">${escapeHtml(newUser.name)}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #666;">이메일</td>
              <td style="padding: 8px 0;">${escapeHtml(newUser.email)}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #666; vertical-align: top;">가입 동기</td>
              <td style="padding: 8px 0;">${reasonHtml}</td>
            </tr>
          </table>
          <a href="${adminUrl}" style="display: inline-block; padding: 12px 20px; background: #7c8cf0; color: #fff; text-decoration: none; border-radius: 8px; font-weight: 500;">
            관리자 페이지에서 승인하기
          </a>
          <p style="margin-top: 24px; font-size: 12px; color: #888;">
            또는 직접 이 주소를 방문하세요:<br />
            <a href="${adminUrl}" style="color: #7c8cf0;">${adminUrl}</a>
          </p>
        </div>
      `,
    });
  } catch (e) {
    console.error("[email] notifyAdminNewUser failed:", e);
  }
}

interface ApprovedUser {
  name: string;
  email: string;
}

export async function notifyUserApproved(user: ApprovedUser): Promise<void> {
  const resend = getResend();
  if (!resend || !user.email) {
    console.warn(
      "[email] notifyUserApproved skipped — missing RESEND_API_KEY or user email"
    );
    return;
  }

  const siteUrl = getSiteUrl();

  try {
    await resend.emails.send({
      from: FROM,
      to: user.email,
      subject: "[QuietTime] 가입이 승인되었습니다",
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 560px; margin: 0 auto; padding: 24px; color: #1a1a2e;">
          <h2 style="margin: 0 0 16px; color: #1a1a2e;">${escapeHtml(user.name)}님, 환영합니다</h2>
          <p style="line-height: 1.6; color: #333;">
            QuietTime 가입이 승인되었습니다. 이제 로그인하셔서 매일의 큐티를 시작하실 수 있어요.
          </p>
          <a href="${siteUrl}" style="display: inline-block; margin-top: 12px; padding: 12px 20px; background: #7c8cf0; color: #fff; text-decoration: none; border-radius: 8px; font-weight: 500;">
            큐티 시작하기
          </a>
          <p style="margin-top: 24px; font-size: 13px; color: #555; line-height: 1.6;">
            매일 본문 묵상, AI 해설, QnA 채팅까지 —<br />
            말씀과 함께 평안한 시간 보내시길 바랍니다.
          </p>
        </div>
      `,
    });
  } catch (e) {
    console.error("[email] notifyUserApproved failed:", e);
  }
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
