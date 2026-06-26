"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

export function AdminRealtimeRefresh() {
  const router = useRouter();

  useEffect(() => {
    const refresh = () => router.refresh();
    const interval = window.setInterval(refresh, 5000);
    window.addEventListener("focus", refresh);

    return () => {
      window.clearInterval(interval);
      window.removeEventListener("focus", refresh);
    };
  }, [router]);

  return null;
}
