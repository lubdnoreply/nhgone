"use client";

import { useEffect, useState } from "react";

interface ManagedPayment {
  mews_id: string;
  amount: number;
  currency: string;
  status: string;
  processed_at: string;
}

export default function ManagedPaymentsPage() {
  const [payments, setPayments] = useState<ManagedPayment[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchManaged = async () => {
    setLoading(true);
    try {
      // Note: We'd need a backend route for /payments/managed as well
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
      const response = await fetch(`${apiUrl}/payments/managed`);
      const result = await response.json();
      if (result.status === "success") {
        setPayments(result.data);
      }
    } catch (err) {
      // Fail silently if not implemented yet
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
        <h1 className="text-3xl font-bold tracking-tight mb-2">Synced Payments</h1>
        <p className="text-slate-400 mb-10 text-lg">Financial Audit Log (NHGOne Stored)</p>

        {loading ? (
          <div className="text-center py-20 text-slate-500">Loading audit log...</div>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-white/10 bg-white/5">
             <table className="w-full text-left">
               <thead className="bg-white/10 text-xs font-bold text-slate-400 uppercase tracking-wider">
                 <tr>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4">Amount</th>
                    <th className="px-6 py-4">Transaction Reference</th>
                    <th className="px-6 py-4">Sync Date</th>
                 </tr>
               </thead>
               <tbody className="divide-y divide-white/5">
                 {payments.map(p => (
                   <tr key={p.mews_id} className="text-sm">
                      <td className="px-6 py-4">
                        <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 font-bold text-[10px]">VERIFIED</span>
                      </td>
                      <td className="px-6 py-4 font-bold">{p.amount} {p.currency}</td>
                      <td className="px-6 py-4 font-mono text-xs text-slate-500">{p.mews_id}</td>
                      <td className="px-6 py-4 text-slate-400">{new Date(p.processed_at).toLocaleDateString()}</td>
                   </tr>
                 ))}
               </tbody>
             </table>
          </div>
        )}
      </div>
    </div>
  );
}
