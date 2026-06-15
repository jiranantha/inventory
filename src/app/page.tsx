"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAppData } from "@/components/AppDataProvider";
import { ROUTES } from "@/lib/routes";

// Landing route ("/"): send the user to the first page their role can open.
export default function IndexRoute() {
  const router = useRouter();
  const { permissions } = useAppData();

  useEffect(() => {
    const destination = permissions.canViewDashboard
      ? ROUTES.dashboard
      : permissions.canViewList
        ? ROUTES.list
        : permissions.canInspect
          ? ROUTES.audit
          : ROUTES.list;
    router.replace(destination);
  }, [permissions, router]);

  return null;
}
