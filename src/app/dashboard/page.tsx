"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import PageHeader from "@/components/PageHeader";

interface Stats {
  reservations: number;
  members: number;
  payments: number;
}

export default function Dashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
        const response = await fetch(`${apiUrl}/stats`);
        const result = await response.json();
        if (result.status === "success") {
          setStats(result.data);
        }
      } catch (err: any) {
        console.warn("Could not fetch dashboard stats. Backend might be offline:", err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  return (
    <div className="flex-1 p-8 bg-slate-950 font-sans">
      <div className="max-w-7xl mx-auto">
        <PageHeader 
          title="Dashboard" 
          description="Your Unified Managed Layer for MEWS PMS"
        />

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
          <StatCard title="Managed Reservations" value={stats?.reservations ?? 0} color="blue" href="/managed-data" />
          <StatCard title="Chinatown Members" value={stats?.members ?? 0} color="emerald" href="/managed-members" />
          <StatCard title="Processed Payments" value={stats?.payments ?? 0} color="amber" href="/managed-payments" />
        </div>

        <section className="bg-white/5 border border-white/10 rounded-3xl p-8 backdrop-blur-xl">
          <h2 className="text-2xl font-bold text-white mb-6">System Health</h2>
          <div className="flex items-center gap-4 p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl w-fit">
            <div className="h-3 w-3 rounded-full bg-emerald-500 animate-pulse"></div>
            <span className="text-emerald-400 font-medium text-sm">FastAPI Backend: Online</span>
          </div>
          <div className="mt-8 text-slate-400 grid grid-cols-1 md:grid-cols-2 gap-8">
             <div>
                <h3 className="text-white font-semibold mb-2">Integration Strategy</h3>
                <p className="text-sm leading-relaxed">Secure server-side token injection with POST-only pattern. No MEWS credentials are exposed to the browser.</p>
             </div>
             <div>
                <h3 className="text-white font-semibold mb-2">Sync Pattern</h3>
                <p className="text-sm leading-relaxed">Local-first management layer in Supabase with RLS. Preserves enriched data while staying synced with PMS.</p>
             </div>
          </div>
        </section>
      </div>
    </div>
  );
}

function StatCard({ title, value, color, href }: { title: string, value: number, color: string, href: string }) {
  const colors: Record<string, string> = {
    blue: "from-blue-500 to-indigo-600 shadow-blue-500/20",
    emerald: "from-emerald-500 to-teal-600 shadow-emerald-500/20",
    amber: "from-amber-500 to-orange-600 shadow-amber-500/20"
  };

  return (
    <Link href={href} className={`block p-8 rounded-3xl bg-gradient-to-br ${colors[color]} shadow-2xl transition-all transform hover:scale-105 active:scale-95 group`}>
      <h3 className="text-white/80 font-medium mb-1 uppercase text-[10px] tracking-widest">{title}</h3>
      <div className="text-5xl font-black text-white group-hover:translate-x-1 transition-transform">{value}</div>
      <div className="mt-4 text-white/70 text-xs group-hover:text-white transition-colors">Manage Records &rarr;</div>
    </Link>
  );
}
