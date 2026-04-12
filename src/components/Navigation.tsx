"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import UserHeader from "./UserHeader";

export default function Navigation({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isLoginPage = pathname === "/";
  const isAdminPage = pathname.startsWith("/admin");

  if (isLoginPage || isAdminPage) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen flex bg-slate-50 text-slate-900 w-full overflow-hidden">
      <aside className="w-64 bg-[#f8f9fb] border-r border-slate-200 p-6 flex flex-col gap-6 hidden md:flex shrink-0">
        <div className="flex items-center gap-2 px-1 mb-2">
           <div className="w-8 h-8 rounded-lg bg-emerald-600 flex items-center justify-center">
              <img src="https://guideline.lubd.com/wp-content/uploads/2025/11/NHG128.png" className="w-5 h-5 invert brightness-0" alt="logo" />
           </div>
           <div className="text-xl font-bold text-slate-800 tracking-tight">
             NHG<span className="text-slate-500 font-medium text-xs ml-1">Saturday.com</span>
           </div>
        </div>

        <div className="space-y-1">
           <Link href="/dashboard" className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-all text-sm ${pathname === "/dashboard" ? "bg-white shadow-sm border border-slate-100 text-slate-900 font-semibold" : "text-slate-500 hover:bg-slate-100 hover:text-slate-900"}`}>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>
              Home
           </Link>
           <button className="w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-all text-sm text-slate-500 hover:bg-slate-100">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.175 0l-3.976 2.888c-.783.57-1.838-.197-1.539-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.382-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" /></svg>
              Favorites
           </button>
        </div>

        <div className="mt-4 flex-1">
           <div className="flex items-center justify-between mb-4 px-3">
              <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Workspaces</h3>
              <button className="text-slate-400 hover:text-slate-600">
                 <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" /></svg>
              </button>
           </div>
           
           <div className="relative mb-6 px-3">
              <div className="absolute inset-y-0 left-6 flex items-center pointer-events-none text-slate-400">
                 <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
              </div>
              <input 
                type="text" 
                placeholder="Search workspaces..." 
                className="w-full bg-white border border-slate-200 rounded-lg py-1.5 pl-10 pr-3 text-xs outline-none focus:ring-2 focus:ring-blue-50"
              />
           </div>

           <nav className="flex flex-col gap-1">
             {[
               { name: "Business Tech", icon: "emerald" },
               { name: "Finance", icon: "indigo" },
               { name: "Operations", icon: "amber" },
               { name: "Marketing", icon: "rose" }
             ].map((item) => (
               <button key={item.name} className="flex items-center justify-between group px-3 py-2 rounded-lg text-sm text-slate-600 hover:bg-slate-100 transition-all">
                  <div className="flex items-center gap-3">
                     <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                     <span className="font-medium">{item.name}</span>
                  </div>
               </button>
             ))}
           </nav>
        </div>

        <div className="mt-8 pt-6 border-t border-slate-200">
           <nav className="flex flex-col gap-1">
             <Link href="/reservations" className={`px-3 py-2 rounded-lg text-sm transition-colors ${pathname === "/reservations" ? "bg-white shadow-sm border border-slate-100 text-slate-900 font-semibold" : "text-slate-500 hover:bg-slate-100"}`}>Live Reservations</Link>
             <Link href="/managed-data" className={`px-3 py-2 rounded-lg text-sm transition-colors ${pathname === "/managed-data" ? "bg-white shadow-sm border border-slate-100 text-slate-900 font-semibold" : "text-slate-500 hover:bg-slate-100"}`}>Managed Data</Link>
             <Link href="/members" className={`px-3 py-2 rounded-lg text-sm transition-colors ${pathname === "/members" ? "bg-white shadow-sm border border-slate-100 text-slate-900 font-semibold" : "text-slate-500 hover:bg-slate-100"}`}>Members</Link>
             <Link href="/payments" className={`px-3 py-2 rounded-lg text-sm transition-colors ${pathname === "/payments" ? "bg-white shadow-sm border border-slate-100 text-slate-900 font-semibold" : "text-slate-500 hover:bg-slate-100"}`}>Payments</Link>
           </nav>
        </div>

        <div className="mt-auto px-3">
           <div className="text-[9px] font-bold text-slate-300 uppercase tracking-widest text-center">
              POWERED BY JIRAWAT.K
           </div>
        </div>
      </aside>
      
      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        <UserHeader />
        <main className="flex-1 overflow-y-auto bg-white">
          {children}
        </main>
      </div>
    </div>
  );
}
