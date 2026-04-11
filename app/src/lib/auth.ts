import { auth, currentUser } from "@clerk/nextjs/server";
import { sql } from "@vercel/postgres";

export interface AppUser {
  id: number;
  clerk_id: string;
  email: string;
  name: string;
  reason: string | null;
  status: "pending" | "approved" | "rejected";
  is_admin: boolean;
  approved_at: string | null;
  created_at: string;
}

/**
 * Get the current logged-in user's DB record.
 * Returns null if not logged in or user not yet in DB (needs /register).
 */
export async function getCurrentAppUser(): Promise<AppUser | null> {
  const { userId } = await auth();
  if (!userId) return null;

  const result = await sql<AppUser>`
    SELECT * FROM users WHERE clerk_id = ${userId}
  `;
  return result.rows[0] || null;
}

/**
 * Get the current Clerk user's basic info (email).
 */
export async function getClerkUserInfo() {
  const user = await currentUser();
  if (!user) return null;
  return {
    id: user.id,
    email: user.primaryEmailAddress?.emailAddress || "",
    firstName: user.firstName || "",
    lastName: user.lastName || "",
  };
}

/**
 * Ensures the current user is approved. Throws if not.
 * Returns the approved AppUser record.
 */
export async function requireApprovedUser(): Promise<AppUser> {
  const user = await getCurrentAppUser();
  if (!user) {
    throw new Error("USER_NOT_REGISTERED");
  }
  if (user.status !== "approved") {
    throw new Error("USER_NOT_APPROVED");
  }
  return user;
}

/**
 * Require admin.
 */
export async function requireAdmin(): Promise<AppUser> {
  const user = await requireApprovedUser();
  if (!user.is_admin) {
    throw new Error("NOT_ADMIN");
  }
  return user;
}
