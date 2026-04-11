"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface Reservation {
  mews_id: string;
  guest_name: string;
  status: string;
  check_in: string;
  check_out: string;
}

export default function ReservationsPage() {
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [syncingId, setSyncingId] = useState<string | null>(null);

  const fetchReservations = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("http://localhost:8000/reservations/live");
      const result = await response.json();
      if (result.status === "success") {
        setReservations(result.data);
      } else {
        setError(result.message || "Failed to fetch reservations");
      }
    } catch (err) {
      setError("Backend server unreachable");
    } finally {
      setLoading(false);
    }
  };

  const handleSync = async (reservation: Reservation) => {
    setSyncingId(reservation.mews_id);
    try {
      const response = await fetch("http://localhost:8000/reservations/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(reservation),
      });
      const result = await response.json();
      if (result.status === "success") {
        alert("Synced successfully!");
      } else {
        alert("Sync failed: " + result.detail);
      }
    } catch (err) {
      alert("Error syncing: Backend unreachable");
    } finally {
      setSyncingId(null);
    }
  };

  useEffect(() => {
    fetchReservations();
  }, []);

  return (
    <div className="flex-1 flex flex-col bg-slate-950 text-white p-8">
      <div className="max-w-7xl mx-auto w-full">
        <div className="flex justify-between items-center mb-10">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Reservations</h1>
            <p className="text-slate-400 mt-1">Live data from MEWS API (Last 24 Hours)</p>
          </div>
          <button 
            onClick={fetchReservations}
            disabled={loading}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg font-medium transition-colors disabled:opacity-50"
          >
            {loading ? "Refreshing..." : "Refresh"}
          </button>
        </div>

        {error ? (
          <div className="p-4 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl">
            {error}
          </div>
        ) : loading ? (
          <div className="flex justify-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-white/10 bg-white/5 backdrop-blur-md">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-white/10 bg-white/5">
                  <th className="px-6 py-4 font-semibold text-slate-300">Guest Name</th>
                  <th className="px-6 py-4 font-semibold text-slate-300">Status</th>
                  <th className="px-6 py-4 font-semibold text-slate-300">Check In</th>
                  <th className="px-6 py-4 font-semibold text-slate-300">Check Out</th>
                  <th className="px-6 py-4 font-semibold text-slate-300 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {reservations.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-10 text-center text-slate-500">
                      No reservations found for the selected period.
                    </td>
                  </tr>
                ) : (
                  reservations.map((res) => (
                    <tr key={res.mews_id} className="hover:bg-white/5 transition-colors group">
                      <td className="px-6 py-4 font-medium">{res.guest_name}</td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                          res.status === 'Confirmed' ? 'bg-emerald-500/10 text-emerald-400' :
                          res.status === 'CheckedIn' ? 'bg-blue-500/10 text-blue-400' :
                          res.status === 'CheckedOut' ? 'bg-slate-500/10 text-slate-400' :
                          'bg-amber-500/10 text-amber-400'
                        }`}>
                          {res.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-slate-400 text-sm">
                        {new Date(res.check_in).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 text-slate-400 text-sm">
                        {new Date(res.check_out).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button 
                          onClick={() => handleSync(res)}
                          disabled={syncingId === res.mews_id}
                          className="px-3 py-1.5 bg-white/10 hover:bg-white/20 rounded-md text-sm font-medium transition-all transform group-hover:scale-105 active:scale-95 disabled:opacity-50"
                        >
                          {syncingId === res.mews_id ? "Syncing..." : "Sync"}
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
