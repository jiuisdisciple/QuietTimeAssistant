import { getCurrentAppUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import DevotionClient from "./DevotionClient";

export default async function DevotionPage({
  params,
}: {
  params: Promise<{ date: string }>;
}) {
  const user = await getCurrentAppUser();
  if (!user) redirect("/register");
  if (user.status !== "approved") redirect("/pending");
  return <DevotionClient params={params} />;
}
