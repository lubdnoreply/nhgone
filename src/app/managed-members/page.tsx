"use client";

import { useEffect, useState } from "react";

interface ManagedMember {
  mews_id: string;
  full_name: string;
  email: string;
  phone: string;
  loyalty: string;
  notes?: string;
}

export default function ManagedMembersPage() {
  const [members, setMembers] = useState<ManagedMember[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchManaged = async () => {
    setLoading(true);
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
      const response = await fetch(`${apiUrl}/members/managed`);
      const result = await response.json();
      if (result.status === "success") {
        setMembers(result.data);
      }
    } catch (err: any) {
      console.warn("Could not fetch members:", err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchManaged();
  }, []);

  return (
    <div className="flex-1 flex flex-col bg-slate-950 text-white p-8">
      <div className="max-w-7xl mx-auto w-full">
        <h1 className="text-3xl font-bold tracking-tight mb-2">CHINATOWN Members</h1>
        <p className="text-slate-400 mb-10 text-lg">Managed Profiles in NHGOne Layer</p>

        {loading ? (
          <div className="text-center py-20 text-slate-500">Retrieving members from managed database...</div>
        ) : members.length === 0 ? (
          <div className="p-20 text-center bg-white/5 rounded-3xl border border-dashed border-white/20">
             <p className="text-slate-400">No members imported yet. Go to "Members" (Live) to sync records.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {members.map((m) => (
              <div key={m.mews_id} className="p-6 bg-white/5 border border-white/10 rounded-2xl">
                 <div className="flex justify-between items-center mb-4">
                    <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest">{m.loyalty}</span>
                    <span className="text-[9px] text-slate-500 font-mono italic">Imported</span>
                 </div>
                 <h3 className="text-xl font-bold mb-1">{m.full_name}</h3>
                 <p className="text-sm text-slate-400 mb-4">{m.email}</p>
                 <div className="pt-4 border-t border-white/5 bg-black/20 p-3 rounded-lg">
                    <span className="text-[10px] text-slate-500 font-bold block mb-1">PHONE</span>
                    <span className="text-sm">{m.phone || "---"}</span>
                 </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
