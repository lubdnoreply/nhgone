"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

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

        <div className="mt-auto flex flex-col gap-8">
           <div className="space-y-2">
              <h3 className="px-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Admin</h3>
              <Link href="/admin" className={`flex px-4 py-2 hover:bg-white/5 rounded-lg transition-colors ${pathname === "/admin" ? "text-purple-400 font-medium bg-white/5" : "text-slate-400 hover:text-white"}`}>Admin Console</Link>
           </div>
           
           <div className="border-t border-white/5 pt-6">
              <Link href="/profile" className="flex items-center gap-3 px-4 py-2 hover:bg-white/5 rounded-lg transition-colors group">
                 <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-blue-500 to-emerald-500 flex items-center justify-center text-xs font-bold text-white uppercase">
                    NHG
                 </div>
                 <div className="flex-1 overflow-hidden">
                    <p className="text-sm font-medium text-white truncate">Profile</p>
                    <p className="text-[10px] text-slate-500 truncate">Settings & Account</p>
                 </div>
              </Link>
           </div>
        </div>
      </aside>
      <main className="flex-1 flex flex-col">
        {children}
      </main>
    </div>
  );
}
