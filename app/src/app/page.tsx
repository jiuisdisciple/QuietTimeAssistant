import { getCurrentAppUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import HomeClient from "./HomeClient";

export default async function HomePage() {
  const user = await getCurrentAppUser();
  if (!user) {
    redirect("/register");
  }
  if (user.status !== "approved") {
    redirect("/pending");
  }
  return <HomeClient userName={user.name} isAdmin={user.is_admin} />;
}
