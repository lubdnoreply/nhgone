"use client";

import { useEffect, useState } from "react";

interface Member {
  mews_id: string;
  full_name: string;
  email: string;
  phone: string;
  loyalty: string;
}

export default function MembersPage() {
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncingId, setSyncingId] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const fetchMembers = async () => {
    setLoading(true);
    try {
      const response = await fetch(`http://localhost:8000/members/live?search=${search}`);
      const result = await response.json();
      if (result.status === "success") {
        setMembers(result.data);
      }
    } catch (err) {
      console.error("Fetch error", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSync = async (member: Member) => {
    setSyncingId(member.mews_id);
    try {
      const response = await fetch("http://localhost:8000/members/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(member),
      });
      const result = await response.json();
      if (result.status === "success") alert("Member synced!");
    } catch (err) {
      alert("Sync failed");
    } finally {
      setSyncingId(null);
    }
  };

  useEffect(() => {
    fetchMembers();
  }, []);

  return (
    <div className="flex-1 flex flex-col bg-slate-950 text-white p-8">
      <div className="max-w-7xl mx-auto w-full">
        <div className="flex justify-between items-center mb-10">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Members</h1>
            <p className="text-slate-400 mt-1">Guest Profiles & Loyalty (Chinatown)</p>
          </div>
          <div className="flex gap-2 text-black">
            <input 
              type="text" 
              placeholder="Search by email..." 
              className="px-4 py-2 rounded-lg bg-white/10 border border-white/20 text-white focus:outline-none"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <button onClick={fetchMembers} className="px-4 py-2 bg-blue-600 text-white rounded-lg">Search</button>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-20 text-slate-500">Loading guests...</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {members.map((m) => (
              <div key={m.mews_id} className="p-6 bg-white/5 border border-white/10 rounded-2xl hover:border-blue-500/50 transition-colors">
                <div className="flex justify-between items-start mb-4">
                  <div className="h-12 w-12 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-400 font-bold text-lg">
                    {m.full_name[0]}
                  </div>
                  <span className="text-[10px] bg-white/10 px-2 py-0.5 rounded text-slate-400 font-mono italic">
                    {m.loyalty}
                  </span>
                </div>
                <h3 className="text-lg font-semibold mb-1">{m.full_name}</h3>
                <p className="text-sm text-slate-400 mb-4">{m.email}</p>
                <div className="flex justify-between items-center mt-6 pt-4 border-t border-white/5">
                   <span className="text-xs text-slate-500">{m.phone || "No phone"}</span>
                   <button 
                    onClick={() => handleSync(m)}
                    disabled={syncingId === m.mews_id}
                    className="text-blue-400 text-sm font-medium hover:underline disabled:opacity-50"
                   >
                     {syncingId === m.mews_id ? "Syncing..." : "Sync Profile"}
                   </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
