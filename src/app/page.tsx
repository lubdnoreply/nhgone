"use client";

import React, { useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const [showEmailLogin, setShowEmailLogin] = useState(false);
  const router = useRouter();

  const handleGoogleLogin = async () => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback?next=/dashboard`,
        },
      });
      if (error) throw error;
    } catch (err) {
      console.error("Google Auth Error", err);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f0f2f5] p-4 font-sans text-[#1a1f36]">
      {/* Background soft gradient for extra premium feel */}
      <div className="absolute inset-0 bg-gradient-to-tr from-blue-50/50 via-white to-emerald-50/50 pointer-events-none" />
      
      <div className="relative w-full max-w-md bg-white rounded-[24px] shadow-[0_8px_30px_rgb(0,0,0,0.04)] p-10 md:p-12 transition-all hover:shadow-[0_20px_50px_rgba(0,0,0,0.1)]">
        <div className="flex flex-col items-center">
          {/* Logo */}
          <div className="mb-8 p-1 rounded-xl shadow-sm border border-gray-100 overflow-hidden bg-white">
             <img 
               src="https://guideline.lubd.com/wp-content/uploads/2025/11/NHG128.png" 
               alt="NHG Logo" 
               className="w-12 h-12 object-contain"
             />
          </div>

          <h1 className="text-2xl font-bold mb-2 tracking-tight">NHGOne</h1>
          <p className="text-gray-500 text-sm mb-10 text-center">Log in to your workspace</p>

          {/* Google Button */}
          <button 
            onClick={handleGoogleLogin}
            className="w-full flex items-center justify-center gap-3 py-3 px-4 border border-gray-200 rounded-xl text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 hover:border-gray-300 transition-all active:scale-[0.98] group"
          >
            <svg width="18" height="18" viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg">
              <path d="M17.64 9.20455C17.64 8.56636 17.5827 7.95273 17.4764 7.36364H9V10.845H13.8436C13.635 11.97 13.0009 12.9232 12.0477 13.5614V15.8195H14.9564C16.6582 14.2527 17.64 11.9455 17.64 9.20455Z" fill="#4285F4"/>
              <path d="M9 18C11.43 18 13.4673 17.1941 14.9564 15.8195L12.0477 13.5614C11.2418 14.1014 10.2109 14.4205 9 14.4205C6.65591 14.4205 4.67182 12.8373 3.96409 10.71H0.957273V13.0418C2.43818 15.9832 5.48182 18 9 18Z" fill="#34A853"/>
              <path d="M3.96409 10.71C3.78409 10.1741 3.68182 9.60136 3.68182 9C3.68182 8.39864 3.78409 7.82591 3.96409 7.29V4.95818H0.957273C0.347727 6.17318 0 7.54773 0 9C0 10.4523 0.347727 11.8268 0.957273 13.0418L3.96409 10.71Z" fill="#FBBC05"/>
              <path d="M9 3.57955C10.3214 3.57955 11.5077 4.03364 12.4405 4.92545L15.0218 2.34409C13.4632 0.891818 11.4259 0 9 0C5.48182 0 2.43818 2.01682 0.957273 4.95818L3.96409 7.29C4.67182 5.16273 6.65591 3.57955 9 3.57955Z" fill="#EA4335"/>
            </svg>
            Continue with Google
          </button>

          {/* Divider with Toggle functionality */}
          <div className="relative w-full flex items-center my-10 group">
            <div className="flex-grow border-t border-gray-100"></div>
            <button 
              onClick={() => setShowEmailLogin(!showEmailLogin)}
              className="flex-shrink mx-4 text-[10px] font-bold tracking-widest text-[#6366f1] uppercase hover:text-[#4f46e5] transition-colors cursor-pointer focus:outline-none"
            >
              {showEmailLogin ? "HIDE EMAIL OPTION" : "Or sign in with email"}
            </button>
            <div className="flex-grow border-t border-gray-100"></div>
          </div>

          {/* Conditional Email Input */}
          {showEmailLogin && (
            <div className="w-full space-y-5 animate-in fade-in slide-in-from-top-2 duration-300">
              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-gray-700 ml-1">Email Address</label>
                <input 
                  type="email" 
                  placeholder="name@company.com" 
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-[#6366f1] focus:ring-2 focus:ring-[#6366f1]/20 outline-none transition-all text-sm text-[#1a1f36]"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-gray-700 ml-1">Password</label>
                <input 
                  type="password" 
                  placeholder="Enter your password" 
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-[#6366f1] focus:ring-2 focus:ring-[#6366f1]/20 outline-none transition-all text-sm text-[#1a1f36]"
                />
              </div>
              <button className="w-full py-3.5 px-4 bg-[#6366f1] text-white rounded-xl text-sm font-semibold hover:bg-[#4f46e5] shadow-lg shadow-indigo-200 transition-all active:scale-[0.98]">
                Log In
              </button>
              
              <div className="text-center">
                <a href="#" className="text-sm font-medium text-[#6366f1] hover:underline transition-all">
                  Need an account? Sign Up
                </a>
              </div>
            </div>
          )}
          
          {!showEmailLogin && (
            <div className="mt-8 text-center text-xs text-gray-400">
              New to NHG? <a href="#" className="text-[#6366f1] font-semibold hover:underline">Create an account</a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
