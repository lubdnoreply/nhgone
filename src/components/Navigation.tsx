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
    <div className="min-h-full flex bg-background text-foreground w-full transition-colors duration-300">
      <aside className="w-64 border-r border-border-primary p-6 flex flex-col gap-8 hidden md:flex shrink-0 bg-bg-sidebar transition-colors duration-300">
        <div className="flex items-center gap-3">
          <img 
            src="https://guideline.lubd.com/wp-content/uploads/2025/11/NHG128.png" 
            alt="NHG Logo" 
            className="w-10 h-10 object-contain drop-shadow-[0_0_8px_rgba(170,160,36,0.3)]"
          />
          <div className="text-xl font-black text-[#AAA024] tracking-tighter">
            NHGOne
          </div>
        </div>
        <nav className="flex flex-col gap-2">
          {pathname.startsWith("/admin") ? (
            <>
              <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-4 mb-2">Admin Menu</div>
              <Link href="/admin" className={`px-4 py-2 hover:bg-white/5 rounded-lg transition-colors ${pathname === "/admin" ? "text-[#AAA024] font-medium bg-white/5" : "text-slate-400 hover:text-white"}`}>Dashboard</Link>
              <Link href="/admin/users" className={`px-4 py-2 hover:bg-white/5 rounded-lg transition-colors ${pathname === "/admin/users" ? "text-[#AAA024] font-medium bg-white/5" : "text-slate-400 hover:text-white"}`}>User Management</Link>
              <Link href="/admin/smtp" className={`px-4 py-2 hover:bg-white/5 rounded-lg transition-colors ${pathname === "/admin/smtp" ? "text-[#AAA024] font-medium bg-white/5" : "text-slate-400 hover:text-white"}`}>Email SMTP</Link>
              <Link href="/admin/sync" className={`px-4 py-2 hover:bg-white/5 rounded-lg transition-colors ${pathname === "/admin/sync" ? "text-[#AAA024] font-medium bg-white/5" : "text-slate-400 hover:text-white"}`}>Sync and Import Schedule</Link>
              <Link href="/admin/api-settings" className={`px-4 py-2 hover:bg-white/5 rounded-lg transition-colors ${pathname === "/admin/api-settings" ? "text-[#AAA024] font-medium bg-white/5" : "text-slate-400 hover:text-white"}`}>API Setting</Link>
              <Link href="/admin/logs" className={`px-4 py-2 hover:bg-white/5 rounded-lg transition-colors ${pathname === "/admin/logs" ? "text-[#AAA024] font-medium bg-white/5" : "text-slate-400 hover:text-white"}`}>Activity Log</Link>
            </>
          ) : (
            <>
              <Link href="/dashboard" className={`px-4 py-2 hover:bg-white/5 rounded-lg transition-colors ${pathname === "/dashboard" ? "text-[#AAA024] font-medium bg-white/5" : "text-slate-400 hover:text-white"}`}>Dashboard</Link>
              <Link href="/live-data" className={`px-4 py-2 hover:bg-white/5 rounded-lg transition-colors ${pathname === "/live-data" ? "text-[#AAA024] font-medium bg-white/5" : "text-slate-400 hover:text-white"}`}>Live Data</Link>
              <Link href="/reservations" className={`px-4 py-2 hover:bg-white/5 rounded-lg transition-colors ${pathname === "/reservations" ? "text-[#AAA024] font-medium bg-white/5" : "text-slate-400 hover:text-white"}`}>Reservation</Link>
              <Link href="/members" className={`px-4 py-2 hover:bg-white/5 rounded-lg transition-colors ${pathname === "/members" ? "text-[#AAA024] font-medium bg-white/5" : "text-slate-400 hover:text-white"}`}>Member</Link>
              <Link href="/payments" className={`px-4 py-2 hover:bg-white/5 rounded-lg transition-colors ${pathname === "/payments" ? "text-[#AAA024] font-medium bg-white/5" : "text-slate-400 hover:text-white"}`}>Payment</Link>
            </>
          )}
        </nav>

        <div className="mt-auto pb-4">
           {pathname.startsWith("/admin") && (
             <Link href="/dashboard" className="flex items-center gap-2 px-4 py-3 text-sm font-medium text-slate-400 hover:text-white hover:bg-white/5 rounded-xl transition-all border border-white/5 shadow-sm group">
                <svg className="w-5 h-5 text-slate-500 group-hover:text-white transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                   <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                Back to Dashboard
             </Link>
           )}
        </div>
      </aside>
      <main className="flex-1 flex flex-col h-screen overflow-hidden relative">
        <header className="h-16 flex items-center justify-end px-8 border-b border-border-primary shrink-0 bg-background/50 backdrop-blur-sm z-40">
          <UserHeader />
        </header>
        <div className="flex-1 overflow-y-auto w-full">
          {children}
        </div>
      </main>
    </div>
  );
}
