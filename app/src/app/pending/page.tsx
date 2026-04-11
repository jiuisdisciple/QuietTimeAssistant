import { getCurrentAppUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import { SignOutButton } from "@clerk/nextjs";

export default async function PendingPage() {
  const user = await getCurrentAppUser();

  if (!user) {
    redirect("/register");
  }

  if (user.status === "approved") {
    redirect("/");
  }

  return (
    <main className="flex-1 flex items-center justify-center p-4">
      <div
        className="w-full max-w-sm rounded-2xl p-8 text-center"
        style={{
          background: "var(--bg-card)",
          border: "1px solid var(--border)",
        }}
      >
        {user.status === "pending" ? (
          <>
            <div className="mb-4 text-4xl">⏳</div>
            <h1
              className="text-lg font-semibold mb-2"
              style={{ color: "var(--text-primary)" }}
            >
              승인 대기 중
            </h1>
            <p
              className="text-sm leading-relaxed mb-6"
              style={{ color: "var(--text-secondary)" }}
            >
              {user.name}님, 가입 신청이 접수되었습니다.
              <br />
              관리자 승인 후 사용하실 수 있습니다.
            </p>
          </>
        ) : (
          <>
            <div className="mb-4 text-4xl">🚫</div>
            <h1
              className="text-lg font-semibold mb-2"
              style={{ color: "var(--text-primary)" }}
            >
              가입이 거절되었습니다
            </h1>
            <p
              className="text-sm leading-relaxed mb-6"
              style={{ color: "var(--text-secondary)" }}
            >
              관리자에게 문의해 주세요.
            </p>
          </>
        )}

        <SignOutButton>
          <button
            className="text-xs px-4 py-2 rounded-lg cursor-pointer"
            style={{
              background: "var(--bg-input)",
              color: "var(--text-secondary)",
              border: "1px solid var(--border)",
            }}
          >
            로그아웃
          </button>
        </SignOutButton>
      </div>
    </main>
  );
}
