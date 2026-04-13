"use client";

import { useEffect, useState } from "react";

interface ManagedReservation {
  mews_id: string;
  guest_name: string;
  status: string;
  check_in: string;
  check_out: string;
  notes: string;
}

export default function ManagedReservationsPage() {
  const [reservations, setReservations] = useState<ManagedReservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [tempNotes, setTempNotes] = useState("");

  const fetchManaged = async () => {
    setLoading(true);
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
      const response = await fetch(`${apiUrl}/reservations/managed`);
      const result = await response.json();
      if (result.status === "success") {
        setReservations(result.data);
      }
    } catch (err: any) {
      setError("Failed to fetch managed data");
      console.warn("Fetch error:", err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async (mews_id: string) => {
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
      const response = await fetch(`${apiUrl}/reservations/update/${mews_id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notes: tempNotes }),
      });
      const result = await response.json();
      if (result.status === "success") {
        setReservations(reservations.map(r => r.mews_id === mews_id ? { ...r, notes: tempNotes } : r));
        setEditingId(null);
      }
    } catch (err: any) {
      alert("Update failed");
      console.warn("Update error:", err.message);
    }
  };

  useEffect(() => {
    fetchManaged();
  }, []);

  return (
    <div className="flex-1 flex flex-col bg-slate-950 text-white p-8">
      <div className="max-w-7xl mx-auto w-full">
        <h1 className="text-3xl font-bold tracking-tight mb-2">NHGOne Managed Data</h1>
        <p className="text-slate-400 mb-10 text-lg">Chinatown Member Management Layer</p>

        {loading ? (
          <div className="flex justify-center py-20 animate-pulse text-slate-500">Loading managed database...</div>
        ) : (
          <div className="grid grid-cols-1 gap-6">
            {reservations.map((res) => (
              <div key={res.mews_id} className="p-6 rounded-2xl border border-white/10 bg-white/5 backdrop-blur-md hover:bg-white/[0.07] transition-all">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-xl font-semibold">{res.guest_name}</h3>
                    <p className="text-sm text-slate-400">MEWS ID: {res.mews_id}</p>
                  </div>
                  <span className="px-3 py-1 bg-blue-500/10 text-blue-400 rounded-full text-xs font-bold uppercase tracking-wider">
                    {res.status}
                  </span>
                </div>
                
                <div className="grid grid-cols-2 gap-4 mb-6 text-sm text-slate-300">
                  <div className="flex flex-col">
                    <span className="text-slate-500 text-xs uppercase mb-1">Check In</span>
                    <span>{new Date(res.check_in).toLocaleString()}</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-slate-500 text-xs uppercase mb-1">Check Out</span>
                    <span>{new Date(res.check_out).toLocaleString()}</span>
                  </div>
                </div>

                <div className="mt-4 pt-4 border-t border-white/5">
                  <label className="text-xs text-slate-500 uppercase font-bold mb-2 block">Internal Notes</label>
                  {editingId === res.mews_id ? (
                    <div className="flex gap-2">
                      <textarea 
                        className="flex-1 bg-black/40 border border-white/20 rounded-lg p-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        value={tempNotes}
                        onChange={(e) => setTempNotes(e.target.value)}
                      />
                      <div className="flex flex-col gap-2">
                        <button onClick={() => handleUpdate(res.mews_id)} className="px-3 py-1 bg-blue-600 rounded-md text-xs">Save</button>
                        <button onClick={() => setEditingId(null)} className="px-3 py-1 bg-white/10 rounded-md text-xs">Cancel</button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex justify-between items-center group">
                      <p className="text-slate-300 italic">{res.notes || "No internal notes added yet."}</p>
                      <button 
                        onClick={() => { setEditingId(res.mews_id); setTempNotes(res.notes || ""); }}
                        className="text-blue-400 text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        Edit
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
