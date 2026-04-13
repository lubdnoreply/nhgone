"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";

export default function UserHeader() {
  const [isOpen, setIsOpen] = useState(false);
  const [user, setUser] = useState<any>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [theme, setTheme] = useState("dark");
  const router = useRouter();

  const [profile, setProfile] = useState<any>(null);

  useEffect(() => {
    // Initial theme check
    const savedTheme = localStorage.getItem("theme") || "dark";
    setTheme(savedTheme);
    document.documentElement.setAttribute("data-theme", savedTheme);
    
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);

      if (user) {
        const { data } = await supabase
          .from("profiles")
          .select("role, full_name")
          .eq("id", user.id)
          .single();
        setProfile(data);
      }
    };
    getUser();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) getUser();
    });

    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      subscription.unsubscribe();
    };
  }, []);

  const toggleTheme = () => {
    const newTheme = theme === "dark" ? "light" : "dark";
    setTheme(newTheme);
    localStorage.setItem("theme", newTheme);
    document.documentElement.setAttribute("data-theme", newTheme);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/");
  };

  // Check Super Admin ONLY from Database role
  const isSuperAdmin = 
    profile?.role === "Super Admin" || 
    profile?.role === "super_admin";

  return (
    <div className="absolute top-8 right-8 z-50 font-sans">
      <div className="relative" ref={dropdownRef}>
        <div className="flex items-center gap-3">
          {/* Theme Toggle Button */}
          <button 
            onClick={toggleTheme}
            className={`p-2 rounded-xl border transition-all shadow-sm ${
              theme === 'dark' 
              ? 'bg-slate-900/50 border-white/10 text-slate-400 hover:text-white hover:bg-slate-800' 
              : 'bg-white border-slate-200 text-slate-500 hover:text-slate-900 hover:bg-slate-50'
            }`}
            title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`}
          >
            {theme === 'dark' ? (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707M16.243 17.657l.707.707M7.757 7.757l.707-.707M12 8a4 4 0 100 8 4 4 0 000-8z" /></svg>
            ) : (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" /></svg>
            )}
          </button>

          {/* Profile Circle */}
          <button 
            onClick={() => setIsOpen(!isOpen)}
            className="w-10 h-10 rounded-full overflow-hidden border-2 border-white/10 hover:border-blue-400 transition-all font-sans cursor-pointer focus:outline-none shadow-lg shadow-black/20"
          >
            {user?.user_metadata?.avatar_url ? (
              <img src={user.user_metadata.avatar_url} alt="Profile" className="w-full h-full object-cover" />
            ) : (
               <div className="w-full h-full bg-gradient-to-tr from-blue-500 to-emerald-500 flex items-center justify-center text-sm font-bold text-white uppercase shadow-inner">
                  {profile?.full_name?.split(' ').map((n: string)=>n[0]).join('') || user?.email?.substring(0, 2) || "U"}
               </div>
            )}
          </button>
        </div>

        {isOpen && (
          <div className="absolute right-0 mt-3 w-72 bg-background rounded-2xl shadow-2xl border border-border-primary overflow-hidden z-50 animate-in fade-in zoom-in-95 duration-200 transform origin-top-right font-sans transition-colors duration-300">
            <div className={`p-6 border-b border-border-primary ${theme === 'dark' ? 'bg-white/5' : 'bg-slate-50'}`}>
               <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Signed in as</p>
               <p className="font-bold truncate text-foreground">{user?.email}</p>
               <p className={`text-[11px] mt-1 font-bold inline-block px-2 py-0.5 rounded ${theme === 'dark' ? 'bg-[#AAA024]/20 text-[#AAA024]' : 'bg-[#AAA024] text-white'}`}>{profile?.role || "User"}</p>
            </div>
            
            <div className="p-2">
                {isSuperAdmin && (
                  <Link 
                    href="/admin" 
                    onClick={() => setIsOpen(false)}
                    className="flex items-center gap-3 px-4 py-3 text-sm font-medium text-purple-100 hover:bg-white/5 rounded-xl transition-all group"
                  >
                    <div className="w-8 h-8 rounded-lg bg-purple-500/10 flex items-center justify-center text-purple-400 group-hover:bg-purple-500 group-hover:text-white transition-colors">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                      </svg>
                    </div>
                    Admin Console
                  </Link>
                )}
                
                <Link 
                  href="/profile" 
                  onClick={() => setIsOpen(false)}
                  className="flex items-center gap-3 px-4 py-3 text-sm font-medium text-slate-300 hover:bg-white/5 rounded-xl transition-all group"
                >
                  <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center text-slate-400 group-hover:bg-white/10 group-hover:text-white transition-colors">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </div>
                  Profile Settings
                </Link>

                <div className="h-px bg-white/5 my-1 mx-2" />
                
                <button 
                  onClick={handleLogout}
                  className="w-full flex items-center gap-3 px-4 py-3 text-sm font-medium text-red-400 hover:bg-red-500/10 rounded-xl transition-all group text-left"
                >
                  <div className="w-8 h-8 rounded-lg bg-red-500/10 flex items-center justify-center text-red-500 group-hover:bg-red-500 group-hover:text-white transition-colors">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                    </svg>
                  </div>
                  Log out
                </button>
             </div>
          </div>
        )}
      </div>
    </div>
  );
}
