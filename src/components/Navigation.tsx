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

        <div className="mt-auto pb-4">
           {pathname === "/admin" && (
             <Link href="/dashboard" className="flex items-center gap-2 px-4 py-3 text-sm font-medium text-slate-400 hover:text-white hover:bg-white/5 rounded-xl transition-all border border-white/5 shadow-sm group">
                <svg className="w-5 h-5 text-slate-500 group-hover:text-white transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                   <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                Back to Dashboard
             </Link>
           )}
        </div>
      </aside>
      <main className="flex-1 flex flex-col h-screen overflow-hidden">
        <UserHeader />
        <div className="flex-1 overflow-y-auto w-full">
          {children}
        </div>
      </main>
    </div>
  );
}
