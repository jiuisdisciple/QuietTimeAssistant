import { notFound } from "next/navigation";

// The real admin page lives at a secret path. This base /admin route
// always 404s so the URL isn't discoverable by crawling.
export default function AdminIndexPage() {
  notFound();
}
