"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type Section = "reservations" | "members" | "payments";

export default function LiveDataPage() {
  const [activeSection, setActiveSection] = useState<Section>("reservations");
  const [properties, setProperties] = useState<string[]>([]);
  const [selectedProperty, setSelectedProperty] = useState("");
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const getPreviousDayRange = () => {
    const now = new Date();
    
    // Previous Day 00:00 AM
    const start = new Date(now);
    start.setDate(now.getDate() - 1);
    start.setHours(0, 0, 0, 0);
    
    // Current Day 12:00 AM (End of yesterday)
    const end = new Date(now);
    end.setHours(0, 0, 0, 0);
    
    return {
      start: new Date(start.getTime() - (start.getTimezoneOffset() * 60000)).toISOString().slice(0, 16),
      end: new Date(end.getTime() - (end.getTimezoneOffset() * 60000)).toISOString().slice(0, 16)
    };
  };

  const initialRange = getPreviousDayRange();
  const [startDate, setStartDate] = useState(initialRange.start);
  const [endDate, setEndDate] = useState(initialRange.end);

  const setPreviousDay = () => {
    const range = getPreviousDayRange();
    setStartDate(range.start);
    setEndDate(range.end);
  };

  const fetchProperties = async () => {
    const { data, error } = await supabase.from("property_api_settings").select("property_name").order("property_name");
    if (data && data.length > 0) {
      const names = data.map(p => p.property_name);
      setProperties(names);
      setSelectedProperty(names[0]);
    }
  };

  const fetchData = async () => {
    if (!selectedProperty) return;
    setLoading(true);
    setError(null);
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
      const endpoint = activeSection === "reservations" ? "/reservations/live" : 
                       activeSection === "members" ? "/members/live" : "/payments/live";
      
      const queryParams = new URLSearchParams({
        property_name: selectedProperty,
        start_date: startDate ? `${startDate}:00Z` : "",
        end_date: endDate ? `${endDate}:00Z` : ""
      });
      
      const response = await fetch(`${apiUrl}${endpoint}?${queryParams.toString()}`);
      const result = await response.json();
      
      if (result.status === "success") {
        setData(result.data);
      } else {
        setError(result.message || `Failed to fetch ${activeSection} data`);
      }
    } catch (err: any) {
      setError("Backend server unreachable");
      console.warn("Fetch error:", err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProperties();
  }, []);

  useEffect(() => {
    fetchData();
  }, [activeSection, selectedProperty]);

  return (
    <div className="flex-1 flex flex-col bg-background text-foreground p-8 transition-colors duration-300">
      <div className="max-w-7xl mx-auto w-full">
        <div className="flex flex-col gap-6 mb-10">
          <div>
            <h1 className="text-4xl font-extrabold tracking-tight text-foreground">Live Data</h1>
            <p className="text-slate-500 mt-1">Direct one-way feed data from MEWS</p>
          </div>
          
          <div className="flex flex-wrap items-end gap-4">
            {/* Property Select */}
            <div className="flex flex-col gap-2 w-full md:w-64">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Select Property</label>
              <div className="relative group">
                <select 
                  value={selectedProperty}
                  onChange={(e) => setSelectedProperty(e.target.value)}
                  className="w-full bg-slate-100/10 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#AAA024] transition-all appearance-none cursor-pointer hover:bg-slate-200/20 dark:hover:bg-white/10 text-foreground shadow-sm"
                >
                  {properties.map(p => <option key={p} value={p} className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">{p}</option>)}
                </select>
                <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                </div>
              </div>
            </div>

            {/* Start Date */}
            <div className="flex flex-col gap-2 w-full md:w-48">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Start Date & Time</label>
              <input 
                type="datetime-local"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full bg-slate-100/10 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#AAA024] transition-all text-foreground shadow-sm"
              />
            </div>

            {/* End Date */}
            <div className="flex flex-col gap-2 w-full md:w-48">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">End Date & Time</label>
              <input 
                type="datetime-local"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full bg-slate-100/10 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#AAA024] transition-all text-foreground shadow-sm"
              />
            </div>

            {/* Quick Actions */}
            <div className="flex gap-2">
              <button 
                onClick={setPreviousDay}
                className="px-4 py-2.5 bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-400 rounded-xl text-xs font-bold hover:bg-slate-200 dark:hover:bg-white/10 transition-all h-[42px]"
              >
                Previous Day
              </button>

              <button 
                onClick={fetchData}
                className="px-6 py-2.5 bg-[#AAA024] text-white rounded-xl text-sm font-bold shadow-lg shadow-[#AAA024]/20 hover:bg-[#8f871e] transition-all active:scale-[0.98] h-[42px]"
              >
                Fetch Data
              </button>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 p-1 bg-white/5 rounded-2xl w-fit mb-8">
          {(["reservations", "members", "payments"] as Section[]).map((s) => (
            <button
              key={s}
              onClick={() => setActiveSection(s)}
              className={`px-6 py-2 rounded-xl text-sm font-bold transition-all capitalize ${
                activeSection === s 
                ? "bg-[#AAA024] text-white shadow-lg shadow-[#AAA024]/20" 
                : "text-slate-400 hover:text-white hover:bg-white/5"
              }`}
            >
              {s}
            </button>
          ))}
        </div>

        {error ? (
          <div className="p-6 bg-red-500/10 border border-red-500/20 text-red-400 rounded-2xl flex items-center gap-3">
             <div className="h-2 w-2 rounded-full bg-red-500 animate-pulse"></div>
            {error}
          </div>
        ) : loading ? (
          <div className="flex flex-col items-center justify-center py-24 gap-4">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-[#AAA024]/20 border-t-[#AAA024]"></div>
            <p className="text-slate-500 font-medium animate-pulse">Fetching {activeSection} data...</p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-3xl border border-white/10 bg-white/5 backdrop-blur-xl shadow-2xl">
            <table className="w-full text-left border-collapse">
              <thead className="bg-white/5">
                {activeSection === "reservations" && (
                  <tr>
                    <th className="px-6 py-4 font-bold text-slate-300 text-xs uppercase tracking-wider">Guest Name</th>
                    <th className="px-6 py-4 font-bold text-slate-300 text-xs uppercase tracking-wider">Status</th>
                    <th className="px-6 py-4 font-bold text-slate-300 text-xs uppercase tracking-wider">Check In</th>
                    <th className="px-6 py-4 font-bold text-slate-300 text-xs uppercase tracking-wider">Check Out</th>
                  </tr>
                )}
                {activeSection === "members" && (
                  <tr>
                    <th className="px-6 py-4 font-bold text-slate-300 text-xs uppercase tracking-wider">Full Name</th>
                    <th className="px-6 py-4 font-bold text-slate-300 text-xs uppercase tracking-wider">Email</th>
                    <th className="px-6 py-4 font-bold text-slate-300 text-xs uppercase tracking-wider">Loyalty</th>
                  </tr>
                )}
                {activeSection === "payments" && (
                  <tr>
                    <th className="px-6 py-4 font-bold text-slate-300 text-xs uppercase tracking-wider">Reference ID</th>
                    <th className="px-6 py-4 font-bold text-slate-300 text-xs uppercase tracking-wider">Amount</th>
                    <th className="px-6 py-4 font-bold text-slate-300 text-xs uppercase tracking-wider">Currency</th>
                    <th className="px-6 py-4 font-bold text-slate-300 text-xs uppercase tracking-wider">Date</th>
                  </tr>
                )}
              </thead>
              <tbody className="divide-y divide-white/5">
                {data.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-20 text-center text-slate-500 font-medium italic">
                      No records found for this property.
                    </td>
                  </tr>
                ) : (
                  data.map((item, idx) => (
                    <tr key={item.mews_id || idx} className="hover:bg-white/5 transition-colors group">
                      {activeSection === "reservations" && (
                        <>
                          <td className="px-6 py-4 font-medium text-white">{item.guest_name}</td>
                          <td className="px-6 py-4">
                            <span className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-tighter ${
                              item.status === 'Confirmed' ? 'bg-emerald-500/10 text-emerald-400' :
                              item.status === 'Started' ? 'bg-blue-500/10 text-blue-400' :
                              item.status === 'Processed' ? 'bg-slate-500/20 text-slate-400' :
                              'bg-amber-500/10 text-amber-400'
                            }`}>
                              {item.status}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-slate-400 text-sm">{new Date(item.check_in).toLocaleDateString()}</td>
                          <td className="px-6 py-4 text-slate-400 text-sm">{new Date(item.check_out).toLocaleDateString()}</td>
                        </>
                      )}
                      {activeSection === "members" && (
                        <>
                          <td className="px-6 py-4 font-medium text-white">{item.full_name}</td>
                          <td className="px-6 py-4 text-slate-400 text-sm">{item.email}</td>
                          <td className="px-6 py-4">
                            <span className="px-2 py-0.5 bg-indigo-500/10 text-indigo-400 rounded text-[10px] font-bold">
                              {item.loyalty}
                            </span>
                          </td>
                        </>
                      )}
                      {activeSection === "payments" && (
                        <>
                          <td className="px-6 py-4 font-mono text-xs text-slate-500">{item.mews_id.substring(0, 12)}...</td>
                          <td className="px-6 py-4 font-bold text-white text-lg">{item.amount || 0}</td>
                          <td className="px-6 py-4 text-slate-400 text-sm font-bold">{item.currency}</td>
                          <td className="px-6 py-4 text-slate-400 text-sm">{new Date(item.processed_at).toLocaleDateString()}</td>
                        </>
                      )}
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
