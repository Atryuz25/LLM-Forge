"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";

export default function NavBar() {
  const pathname = usePathname();
  const router = useRouter();
  const [userEmail, setUserEmail] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (user) {
        setUserEmail(user.email);
      }
    });
    return () => unsubscribe();
  }, []);

  const handleLogout = async () => {
    await signOut(auth);
    router.push("/");
  };

  const links = [
    { href: "/dashboard", label: "Dashboard", icon: "dashboard" },
    { href: "/dashboard/pipelines", label: "Pipelines", icon: "account_tree" },
    { href: "/dashboard/evaluations", label: "Evaluations", icon: "analytics" },
    { href: "/dashboard/prompt-tester", label: "Prompt Tester", icon: "terminal" },
    { href: "/dashboard/monitor", label: "Monitor", icon: "monitoring" },
  ];

  const isActive = (href: string) => {
    if (href === "/dashboard") {
      return pathname === href;
    }
    return pathname.startsWith(href);
  };

  const getSidebarLinkClass = (href: string) => {
    return `flex items-center gap-md px-md py-sm rounded transition-transform transition-colors ${
      isActive(href)
        ? "text-primary border-r-2 border-primary bg-primary/10 translate-x-1"
        : "text-on-surface-variant hover:text-white hover:bg-surface-variant/30"
    }`;
  };

  const getMobileLinkClass = (href: string) => {
    return `flex flex-col items-center gap-xs p-sm ${
      isActive(href) ? "text-primary" : "text-on-surface-variant hover:text-white"
    }`;
  };

  return (
    <>
      <nav className="hidden md:flex bg-[#0e0d16] fixed left-0 top-0 h-full w-[240px] z-40 border-r border-outline-variant flex-col py-lg justify-between">
        <div className="px-md flex flex-col gap-lg">
          <div className="px-md mb-lg">
            <div className="font-headline-md text-headline-md font-bold text-primary flex items-center gap-sm">
              <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>terminal</span>
              LLMForge
            </div>
            <div className="font-label-caps text-label-caps text-on-surface-variant mt-sm">Engineering Console</div>
          </div>
          <div className="flex flex-col gap-sm">
            {links.map((link) => (
              <Link key={link.href} href={link.href} className={getSidebarLinkClass(link.href)}>
                <span className="material-symbols-outlined">{link.icon}</span>
                <span className="font-label-caps text-label-caps">{link.label}</span>
              </Link>
            ))}
          </div>
        </div>
        <div className="px-md flex flex-col gap-sm">
          <button className="flex items-center gap-md px-md py-sm rounded text-primary bg-primary/10 transition-colors w-full border border-primary/20 overflow-hidden" title={userEmail || "Profile"}>
            <span className="material-symbols-outlined">account_circle</span>
            <span className="font-label-caps text-[11px] truncate text-left">{userEmail || "Loading Profile..."}</span>
          </button>
          <button className="flex items-center gap-md px-md py-sm rounded text-on-surface-variant hover:text-white hover:bg-surface-variant/30 transition-colors w-full">
            <span className="material-symbols-outlined">settings</span>
            <span className="font-label-caps text-label-caps">Settings</span>
          </button>
          <button onClick={handleLogout} className="flex items-center gap-md px-md py-sm rounded text-on-surface-variant hover:text-white hover:bg-surface-variant/30 transition-colors mt-md border-t border-outline-variant pt-md w-full">
            <span className="material-symbols-outlined">logout</span>
            <span className="font-label-caps text-label-caps">Sign Out</span>
          </button>
        </div>
      </nav>

      <nav className="md:hidden fixed bottom-0 w-full glass-panel border-t border-outline-variant/30 flex justify-around py-sm px-sm z-50">
        {links.slice(0, 4).map((link) => (
          <Link key={link.href} href={link.href} className={getMobileLinkClass(link.href)}>
            <span className="material-symbols-outlined">{link.icon}</span>
            <span className="font-label-caps text-[10px]">{link.label}</span>
          </Link>
        ))}
      </nav>
    </>
  );
}
