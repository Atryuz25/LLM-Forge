"use client";

import { useAuth } from "@/components/AuthContext";
import { useRouter, usePathname } from "next/navigation";
import { useEffect } from "react";

export const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!loading && !user && pathname !== "/login") {
      router.push("/login");
    }
  }, [user, loading, router, pathname]);

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center text-white bg-[#0A0A0F]">Loading...</div>;
  }

  if (!user && pathname !== "/login") {
    return null; // Prevent flicker while redirecting
  }

  return <>{children}</>;
};
