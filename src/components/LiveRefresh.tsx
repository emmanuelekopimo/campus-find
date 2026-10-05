"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

/** Re-fetches server data on an interval so RSVP counts and new events appear without a reload. */
export function LiveRefresh({ seconds = 5 }: { seconds?: number }) {
  const router = useRouter();
  useEffect(() => {
    const t = setInterval(() => {
      if (document.visibilityState === "visible") router.refresh();
    }, seconds * 1000);
    return () => clearInterval(t);
  }, [router, seconds]);
  return null;
}
