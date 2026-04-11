import { getCurrentAppUser } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import AdminClient from "../AdminClient";

export default async function AdminPage() {
  const user = await getCurrentAppUser();
  if (!user) redirect("/register");
  // Show 404 to non-admins so the URL isn't discoverable
  if (!user.is_admin) notFound();
  return <AdminClient />;
}
