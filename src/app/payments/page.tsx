"use client";

import { useEffect, useState } from "react";

interface Payment {
  mews_id: string;
  amount: number;
  currency: string;
  status: string;
  processed_at: string;
}

export default function PaymentsPage() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncingId, setSyncingId] = useState<string | null>(null);

  const fetchPayments = async () => {
    setLoading(true);
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
      const response = await fetch(`${apiUrl}/payments/live`);
      const result = await response.json();
      if (result.status === "success") {
        setPayments(result.data);
      }
    } catch (err: any) {
      console.warn("Fetch error", err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSync = async (payment: Payment) => {
    setSyncingId(payment.mews_id);
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
      const response = await fetch(`${apiUrl}/payments/sync`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payment),
      });
      const result = await response.json();
      if (result.status === "success") alert("Payment synced!");
    } catch (err: any) {
      alert("Sync failed");
    } finally {
      setSyncingId(null);
    }
  };

  useEffect(() => {
    fetchPayments();
  }, []);

  return (
    <div className="flex-1 flex flex-col bg-slate-950 text-white p-8">
      <div className="max-w-7xl mx-auto w-full">
        <div className="flex justify-between items-center mb-10">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Payments</h1>
            <p className="text-slate-400 mt-1">Transaction History & Reconciliation</p>
          </div>
          <button onClick={fetchPayments} className="px-4 py-2 bg-blue-600 text-white rounded-lg">Refresh</button>
        </div>

        {loading ? (
          <div className="text-center py-20 text-slate-500">Loading transactions...</div>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-white/10 bg-white/5">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-white/10 bg-white/5 text-slate-400 text-sm">
                  <th className="px-6 py-4">Transaction ID</th>
                  <th className="px-6 py-4">Value</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4">Processed Date</th>
                  <th className="px-6 py-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {payments.map((p) => (
                  <tr key={p.mews_id} className="hover:bg-white/5 transition-colors">
                    <td className="px-6 py-4 font-mono text-xs">{p.mews_id}</td>
                    <td className="px-6 py-4 font-bold text-blue-400">{p.amount} {p.currency}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${p.status === 'Paid' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-slate-500/10 text-slate-400'}`}>
                        {p.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-400">{new Date(p.processed_at).toLocaleString()}</td>
                    <td className="px-6 py-4 text-right">
                       <button 
                        onClick={() => handleSync(p)}
                        disabled={syncingId === p.mews_id}
                        className="p-2 hover:bg-white/10 rounded-full transition-colors disabled:opacity-50"
                       >
                         {syncingId === p.mews_id ? "..." : "🔄"}
                       </button>
                    </td>
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
