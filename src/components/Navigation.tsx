"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import UserHeader from "./UserHeader";

export default function Navigation({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isLoginPage = pathname === "/";

  if (isLoginPage) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-full flex bg-slate-950 text-white w-full">
      <aside className="w-64 border-r border-white/10 p-6 flex flex-col gap-8 hidden md:flex shrink-0">
        <div className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-emerald-400 bg-clip-text text-transparent">
          NHGOne
        </div>
        <nav className="flex flex-col gap-2">
          <Link href="/dashboard" className={`px-4 py-2 hover:bg-white/5 rounded-lg transition-colors ${pathname === "/dashboard" ? "text-blue-400 font-medium bg-white/5" : "text-slate-400 hover:text-white"}`}>Dashboard</Link>
          <Link href="/reservations" className={`px-4 py-2 hover:bg-white/5 rounded-lg transition-colors ${pathname === "/reservations" ? "text-blue-400 font-medium bg-white/5" : "text-slate-400 hover:text-white"}`}>Live Reservations</Link>
          <Link href="/managed-data" className={`px-4 py-2 hover:bg-white/5 rounded-lg transition-colors ${pathname === "/managed-data" ? "text-blue-400 font-medium bg-white/5" : "text-slate-400 hover:text-white"}`}>Managed Data</Link>
          <Link href="/members" className={`px-4 py-2 hover:bg-white/5 rounded-lg transition-colors ${pathname === "/members" ? "text-blue-400 font-medium bg-white/5" : "text-slate-400 hover:text-white"}`}>Members</Link>
          <Link href="/payments" className={`px-4 py-2 hover:bg-white/5 rounded-lg transition-colors ${pathname === "/payments" ? "text-blue-400 font-medium bg-white/5" : "text-slate-400 hover:text-white"}`}>Payments</Link>
        </nav>

        <div className="mt-auto">
           {/* Removed old profile and admin sections */}
        </div>
      </aside>
      <main className="flex-1 flex flex-col h-screen overflow-hidden text-slate-900 bg-slate-50">
        <UserHeader />
        <div className="flex-1 overflow-y-auto">
          {children}
        </div>
      </main>
    </div>
  );
}
