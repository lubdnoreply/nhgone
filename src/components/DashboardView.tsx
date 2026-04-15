"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import PageHeader from "./PageHeader";
import * as XLSX from 'xlsx';
import ImportChart from "./ImportChart";

type Section = "reservations" | "members" | "payments";
type DataSource = "live" | "saved";

interface DashboardViewProps {
  title: string;
  subtitle: string;
  defaultDataSource: DataSource;
  defaultSection: Section;
  allowToggleDataSource?: boolean;
}

export default function DashboardView({ 
  title, 
  subtitle, 
  defaultDataSource, 
  defaultSection,
  allowToggleDataSource = false 
}: DashboardViewProps) {
  const [activeSection, setActiveSection] = useState<Section>(defaultSection);
  const [dataSource, setDataSource] = useState<DataSource>(defaultDataSource);
  
  const [properties, setProperties] = useState<string[]>([]);
  const [selectedProperty, setSelectedProperty] = useState("");
  const [data, setData] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [showSyncModal, setShowSyncModal] = useState(false);
  const [syncStatus, setSyncStatus] = useState<{inserted: number, skipped: number} | null>(null);

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(20);

  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const isSuperAdmin = userRole?.toLowerCase() === "super_admin" || 
                      userRole?.toLowerCase() === "super admin" || 
                      userRole?.toLowerCase() === "admin";

  const showCheckboxes = isSuperAdmin && dataSource === "saved";

  const getDefaultRange = () => {
    const now = new Date();
    const start = new Date(now);
    start.setDate(now.getDate() - 1); // Yesterday
    start.setHours(0, 1, 0, 0); // 12:01 AM
    const end = new Date(now);
    end.setDate(now.getDate() - 1); // Yesterday
    end.setHours(23, 59, 59, 999); // 11:59 PM
    return {
      start: new Date(start.getTime() - (start.getTimezoneOffset() * 60000)).toISOString().slice(0, 16),
      end: new Date(end.getTime() - (end.getTimezoneOffset() * 60000)).toISOString().slice(0, 16)
    };
  };

  const initialRange = getDefaultRange();
  const [startDate, setStartDate] = useState(initialRange.start);
  const [endDate, setEndDate] = useState(initialRange.end);

  const setPreviousDay = () => {
    const start = new Date(startDate);
    start.setDate(start.getDate() - 1);
    const end = new Date(endDate);
    end.setDate(end.getDate() - 1);
    
    setStartDate(new Date(start.getTime() - (start.getTimezoneOffset() * 60000)).toISOString().slice(0, 16));
    setEndDate(new Date(end.getTime() - (end.getTimezoneOffset() * 60000)).toISOString().slice(0, 16));
  };

  const fetchProperties = async () => {
    const { data: props, error } = await supabase.from("property_api_settings").select("property_name").order("property_name");
    if (props && props.length > 0) {
      const names = props.map(p => p.property_name);
      setProperties(names);
      setSelectedProperty(names[0]);
    }
  };

  const fetchData = async () => {
    if (!selectedProperty) return;
    setLoading(true);
    setError(null);
    setSelectedIds([]); // Reset selection on fetch
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
      let endpoint = "";
      let queryParams = new URLSearchParams();
      
      if (dataSource === "live") {
        endpoint = activeSection === "reservations" ? "/reservations/live" : 
                          activeSection === "members" ? "/members/live" : "/payments/live";
        queryParams.append("property_name", selectedProperty);
        queryParams.append("start_date", startDate ? `${startDate}:00Z` : "");
        queryParams.append("end_date", endDate ? `${endDate}:00Z` : "");
      } else {
        endpoint = activeSection === "reservations" ? "/reservations/saved" :
                   activeSection === "members" ? "/members/managed" : "/payments/managed";
        queryParams.append("property", selectedProperty);
        
        // Add date filters for saved reservations as requested
        if (activeSection === "reservations") {
            if (startDate) queryParams.append("start_date", startDate);
            if (endDate) queryParams.append("end_date", endDate);
        }
      }
      
      const response = await fetch(`${apiUrl}${endpoint}?${queryParams.toString()}`);
      const result = await response.json();
      
      if (result.status === "success") {
        setData(result.data);
      } else {
        setError(result.message || `Failed to fetch ${dataSource} ${activeSection} data`);
      }
    } catch (err: any) {
      setError("Backend server unreachable");
      console.warn("Fetch error:", err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleManualSync = async () => {
    if (data.length === 0 || activeSection !== "reservations") return;
    setSyncing(true);
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
      const response = await fetch(`${apiUrl}/reservations/sync-manual`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          property: selectedProperty,
          data: data
        })
      });
      const result = await response.json();
      if (result.status === "success") {
        setSyncStatus({ inserted: result.inserted, skipped: result.skipped });
        setShowSyncModal(true);
      } else {
        setError("Failed to sync: " + result.message);
      }
    } catch (err: any) {
      setError("Error syncing data.");
    } finally {
      setSyncing(false);
    }
  };

  const handleDeleteSelected = async () => {
    if (selectedIds.length === 0) return;
    if (!confirm(`Are you sure you want to delete ${selectedIds.length} records?`)) return;
    
    setLoading(true);
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
      const response = await fetch(`${apiUrl}/reservations/saved`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mews_ids: selectedIds })
      });
      const result = await response.json();
      if (result.status === "success") {
        setData(prev => prev.filter(item => !selectedIds.includes(item.Identifier)));
        setSelectedIds([]);
      } else {
        setError("Delete failed: " + result.message);
      }
    } catch (err: any) {
      setError("Error deleting records");
    } finally {
      setLoading(false);
    }
  };

  const sectionKeys: Record<Section, string[]> = {
    reservations: [
      "Number", "Group name", "Last name", "First name", "Email", "Telephone", "Address", 
      "Customer nationality", "Send marketing emails", "Booker", "Status", "Creator", 
      "Created", "Release", "Confirmed", "Canceled", "Arrival", "Departure", "Count (nights)", 
      "Person count", "Count (bed, nightly)", "Requested category", "Space category", 
      "Space number", "Origin", "Channel manager ID", "Group channel manager ID", 
      "Group channel confirmation number", "Travel agency confirmation number", "Segment", 
      "Rate", "Voucher", "Products", "Company", "Travel agency", "Average rate (nightly)", 
      "Total amount", "Canceled cost", "Commission", "Customer cost", "Balance of companions", 
      "Payment card type", "Payment card number", "Expiration", "Automatic payment", "Bills", 
      "Cancellation reason", "Notes", "Customer notes", "Customer classifications", 
      "Pricing classification", "Booking purpose", "Reservation source", "Identifier", 
      "Company Identifier", "Travel agency Identifier", "Reservation origin details", 
      "Restoration reason"
    ],
    members: ["mews_id", "full_name", "email", "phone", "loyalty"],
    payments: ["mews_id", "amount", "currency", "status", "processed_at"]
  };

  // Prepend Import Date for saved reservations
  let allKeys = sectionKeys[activeSection];
  if (dataSource === "saved" && activeSection === "reservations") {
    allKeys = ["Import Date", ...allKeys];
  }

  const filteredData = data.filter(item => 
    allKeys.some(key => 
      String(item[key] || "").toLowerCase().includes(searchTerm.toLowerCase())
    )
  );

  const totalPages = Math.ceil(filteredData.length / rowsPerPage);
  const paginatedData = filteredData.slice(
    (currentPage - 1) * rowsPerPage,
    currentPage * rowsPerPage
  );

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === data.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(data.map(item => item.Identifier));
    }
  };

  const toggleSelectRow = (id: string) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const exportToExcel = () => {
    if (data.length === 0) return;
    const sanitizedData = data.map(item => {
      const fullItem: any = {};
      allKeys.forEach(key => {
        fullItem[key] = item[key] !== undefined ? item[key] : null;
      });
      return fullItem;
    });

    const worksheet = XLSX.utils.json_to_sheet(sanitizedData);
    const parametersData = [
      [`${title} report - ${new Date().toLocaleString()}`],
      [],
      ["Property", selectedProperty],
      ["Source", dataSource === "live" ? "Mews Live API" : "NHGOne Managed Database"],
    ];
    if (dataSource === "live" || (dataSource === "saved" && activeSection === "reservations")) {
      parametersData.push(["Interval", `${startDate} to ${endDate}`]);
    }
    const paramSheet = XLSX.utils.aoa_to_sheet(parametersData);

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, paramSheet, "Parameters");
    XLSX.utils.book_append_sheet(workbook, worksheet, "Data");
    XLSX.writeFile(workbook, `NHGOne_${activeSection}_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  // State to track first load for "magic" pre-load
  const [isFirstLoad, setIsFirstLoad] = useState(true);

  useEffect(() => {
    fetchProperties();
    const getUserRole = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      if (user.user_metadata?.role) {
        setUserRole(user.user_metadata.role);
        return;
      }
      const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
      if (profile?.role) setUserRole(profile.role);
    };
    getUserRole();
  }, []);

  const generateChartData = () => {
    if (dataSource !== "saved" || activeSection !== "reservations" || data.length === 0) return [];
    
    const countMap = new Map<string, number>();
    data.forEach(item => {
      const importDateStr = item["Import Date"] || item.synced_at || item.created_at;
      if (importDateStr) {
        try {
          const d = new Date(importDateStr);
          if (!isNaN(d.getTime())) {
            const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
            const dateKey = `${String(d.getDate()).padStart(2, '0')}-${months[d.getMonth()]}-${d.getFullYear()}`;
            countMap.set(dateKey, (countMap.get(dateKey) || 0) + 1);
          }
        } catch {
          // ignore
        }
      }
    });

    const chartData = Array.from(countMap.entries()).map(([dateStr, count]) => {
      return { date: dateStr, count };
    });
    
    chartData.sort((a, b) => {
      const partsA = a.date.split('-');
      const partsB = b.date.split('-');
      const dA = new Date(`${partsA[1]} ${partsA[0]} ${partsA[2]}`);
      const dB = new Date(`${partsB[1]} ${partsB[0]} ${partsB[2]}`);
      return dA.getTime() - dB.getTime();
    });

    return chartData.slice(-7);
  };

  const chartData = generateChartData();

  // Automatic data fetch when selection changes
  useEffect(() => {
    if (selectedProperty) {
      if (isFirstLoad && dataSource === "saved" && activeSection === "reservations") {
        // "Magic" pre-load: fetch 1 extra day but keep filter UI same
        const now = new Date();
        const magicStart = new Date(now);
        magicStart.setDate(now.getDate() - 2); // 11th if today is 13th
        magicStart.setHours(0, 0, 0, 0);
        const isoStart = new Date(magicStart.getTime() - (magicStart.getTimezoneOffset() * 60000)).toISOString().slice(0, 16);
        
        // Custom fetch logic for initial load
        const triggerInitialFetch = async () => {
          setLoading(true);
          setError(null);
          try {
            const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
            const queryParams = new URLSearchParams();
            queryParams.append("property", selectedProperty);
            queryParams.append("start_date", isoStart);
            queryParams.append("end_date", endDate);
            
            const response = await fetch(`${apiUrl}/reservations/saved?${queryParams.toString()}`);
            const result = await response.json();
            if (result.status === "success") setData(result.data);
          } catch (err) {
            console.warn("Initial magic fetch failed", err);
          } finally {
            setLoading(false);
            setIsFirstLoad(false);
          }
        };
        triggerInitialFetch();
      } else {
        fetchData();
      }
    }
  }, [selectedProperty, dataSource, activeSection]);

  return (
    <div className="flex-1 flex flex-col bg-background text-foreground p-8 transition-colors duration-300">
      <div className="max-w-7xl mx-auto w-full">
        <PageHeader 
          title={title} 
          description={subtitle}
        >
          {allowToggleDataSource && (
            <div className="flex items-center gap-1 bg-white/5 border border-white/10 rounded-full p-1">
              <button
                onClick={() => { setDataSource("live"); setData([]); setCurrentPage(1); }}
                className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all ${
                  dataSource === "live" ? "bg-emerald-500 text-white shadow-lg" : "text-slate-400 hover:text-white"
                }`}
              >
                Live API
              </button>
              <button
                onClick={() => { setDataSource("saved"); setData([]); setCurrentPage(1); }}
                className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all ${
                  dataSource === "saved" ? "bg-blue-500 text-white shadow-lg" : "text-slate-400 hover:text-white"
                }`}
              >
                Database
              </button>
            </div>
          )}
        </PageHeader>
          
          <div className="flex flex-wrap items-end gap-4">
            <div className="flex flex-col gap-2 w-full md:w-80">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Select Property</label>
              <div className="relative group">
                <select 
                  value={selectedProperty}
                  onChange={(e) => setSelectedProperty(e.target.value)}
                  className="w-full bg-slate-100/10 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-2.5 text-sm appearance-none cursor-pointer text-foreground shadow-sm focus:ring-[#AAA024] focus:outline-none focus:ring-2"
                >
                  {properties.map(p => <option key={p} value={p} className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">{p}</option>)}
                </select>
                <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                </div>
              </div>
            </div>

            {(dataSource === "live" || (activeSection === "reservations")) && (
              <>
                <div className="flex flex-col gap-2 w-full md:w-60">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Start Date & Time</label>
                  <input type="datetime-local" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="w-full bg-slate-100/10 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-2 text-sm text-foreground shadow-sm" />
                </div>
                <div className="flex flex-col gap-2 w-full md:w-60">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">End Date & Time</label>
                  <input type="datetime-local" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="w-full bg-slate-100/10 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-2 text-sm text-foreground shadow-sm" />
                </div>
                <button onClick={setPreviousDay} className="px-4 py-2.5 bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-400 rounded-xl text-xs font-bold hover:bg-slate-200 dark:hover:bg-white/10 transition-all h-[42px]">Previous Day</button>
              </>
            )}

            <button 
              onClick={fetchData} 
              disabled={loading} 
              className="px-6 py-2.5 bg-[#AAA024] text-white rounded-xl text-sm font-bold shadow-lg shadow-[#AAA024]/20 hover:bg-[#8f871e] transition-all h-[42px] disabled:opacity-50"
            >
              Fetch Data
            </button>
          </div>

        <div className="flex flex-wrap items-center justify-between gap-6 mb-8 bg-white/5 p-4 rounded-3xl border border-white/10 shadow-lg">
          <div className="flex gap-1 p-1 bg-black/20 rounded-2xl w-fit">
            {(["reservations", "members", "payments"] as Section[]).map((s) => (
              <button
                key={s}
                onClick={() => { setActiveSection(s); setCurrentPage(1); setSearchTerm(""); }}
                className={`px-6 py-2 rounded-xl text-sm font-bold transition-all capitalize ${
                  activeSection === s ? "bg-[#AAA024] text-white shadow-lg" : "text-slate-400 hover:text-white"
                }`}
              >
                {s}
              </button>
            ))}
          </div>

          <div className="flex flex-1 flex-wrap items-center justify-end gap-4 min-w-[300px]">
            <div className="relative flex-1 max-w-md group">
               <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 transition-colors group-focus-within:text-[#AAA024]">
                 <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
               </div>
               <input type="text" placeholder={`Search in ${activeSection}...`} value={searchTerm} onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }} className="w-full bg-black/20 border border-white/5 rounded-2xl pl-11 pr-4 py-2.5 text-sm text-foreground shadow-inner placeholder:text-slate-600 focus:ring-2 focus:ring-[#AAA024] focus:outline-none" />
            </div>

            <div className="flex gap-2">
              {isSuperAdmin && dataSource === "saved" && selectedIds.length > 0 && (
                <button onClick={handleDeleteSelected} disabled={loading} className="flex items-center gap-2 px-5 py-2.5 bg-red-500/10 border border-red-500/20 text-red-500 rounded-2xl text-xs font-bold hover:bg-red-500/20 transition-all disabled:opacity-30">
                   <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                   Delete ({selectedIds.length})
                </button>
              )}
              {isSuperAdmin && activeSection === "reservations" && dataSource === "live" && (
                <button onClick={handleManualSync} disabled={data.length === 0 || syncing} className="flex items-center gap-2 px-5 py-2.5 bg-blue-500/10 border border-blue-500/20 text-blue-500 rounded-2xl text-xs font-bold hover:bg-blue-500/20 transition-all disabled:opacity-30">
                  {syncing ? <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-500/20 border-t-blue-500"></div> : <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>}
                  Import
                </button>
              )}
              <button onClick={exportToExcel} disabled={data.length === 0} className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600/10 border border-emerald-500/20 text-emerald-500 rounded-2xl text-xs font-bold hover:bg-emerald-600/20 transition-all disabled:opacity-30">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                Excel
              </button>
            </div>
          </div>
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
          <div className="overflow-hidden rounded-3xl border border-white/10 bg-white/5 backdrop-blur-xl shadow-2xl flex flex-col">
            <div className="overflow-x-auto custom-scrollbar">
              <table className="w-full text-left border-collapse min-w-max">
                <thead className="bg-white/5 sticky top-0 z-10 backdrop-blur-md">
                  <tr>
                    {isSuperAdmin && dataSource === "saved" && (
                      <th className="px-6 py-4 w-10">
                        <input 
                          type="checkbox" 
                          checked={data.length > 0 && selectedIds.length === data.length}
                          onChange={toggleSelectAll}
                          className="w-4 h-4 rounded border-white/10 bg-black/50 text-[#AAA024] focus:ring-[#AAA024] cursor-pointer"
                        />
                      </th>
                    )}
                    {allKeys.map((key) => (
                      <th key={key} className="px-6 py-4 font-bold text-slate-300 text-[10px] uppercase tracking-wider whitespace-nowrap">
                        {key.replace(/([A-Z])/g, ' $1').trim()}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {data.length === 0 ? (
                    <tr><td colSpan={allKeys.length + (showCheckboxes ? 1 : 0)} className="px-6 py-20 text-center text-slate-500 font-medium italic">No records found for this property.</td></tr>
                  ) : (
                    paginatedData.map((item, idx) => (
                      <tr key={item.Identifier || item.mews_id || idx} className={`hover:bg-white/10 transition-colors group ${selectedIds.includes(item.Identifier) ? 'bg-white/5' : ''}`}>
                        {showCheckboxes && (
                          <td className="px-6 py-4 w-10">
                            <input 
                              type="checkbox"
                              checked={selectedIds.includes(item.Identifier)}
                              onChange={() => toggleSelectRow(item.Identifier)}
                              className="w-4 h-4 rounded border-white/10 bg-black/50 text-[#AAA024] focus:ring-[#AAA024] cursor-pointer"
                            />
                          </td>
                        )}
                        {allKeys.map((key, colIdx) => (
                          <td key={colIdx} className="px-6 py-4 text-sm text-slate-400 whitespace-nowrap overflow-hidden max-w-[300px] text-ellipsis">
                            {renderValue(key, item[key])}
                          </td>
                        ))}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            
            {data.length > 0 && (
              <div className="p-4 bg-white/5 border-t border-white/5 text-[10px] text-slate-500 flex flex-wrap justify-between items-center gap-4 px-8">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <label className="text-slate-500 uppercase font-bold text-[9px]">Rows per page:</label>
                    <select value={rowsPerPage} onChange={(e) => { setRowsPerPage(Number(e.target.value)); setCurrentPage(1); }} className="bg-transparent border border-white/10 rounded px-2 py-1 text-[10px] focus:outline-none focus:ring-1 focus:ring-[#AAA024]">
                      {[20, 50, 100, 200, 500].map(v => <option key={v} value={v} className="bg-slate-900 text-white">{v}</option>)}
                    </select>
                  </div>
                  <span className="text-slate-400 font-medium">Showing {(currentPage-1)*rowsPerPage + 1} to {Math.min(currentPage*rowsPerPage, data.length)} of {data.length} records</span>
                </div>

                <div className="flex items-center gap-1">
                  <button disabled={currentPage === 1} onClick={() => handlePageChange(currentPage - 1)} className="p-2 hover:bg-white/5 rounded-lg disabled:opacity-30 transition-all">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                  </button>
                  <div className="flex gap-1">
                    {[...Array(totalPages)].map((_, i) => {
                      const p = i + 1;
                      if (totalPages > 7 && (p > 1 && p < totalPages && (p < currentPage - 1 || p > currentPage + 1))) {
                        if (p === currentPage - 2 || p === currentPage + 2) return <span key={p} className="px-1 text-slate-600">...</span>;
                        return null;
                      }
                      return (
                        <button key={p} onClick={() => handlePageChange(p)} className={`w-7 h-7 flex items-center justify-center rounded-lg text-[10px] font-bold transition-all ${currentPage === p ? "bg-[#AAA024] text-white shadow-lg" : "text-slate-400 hover:bg-white/5"}`}>{p}</button>
                      );
                    })}
                  </div>
                  <button disabled={currentPage === totalPages} onClick={() => handlePageChange(currentPage + 1)} className="p-2 hover:bg-white/5 rounded-lg disabled:opacity-30 transition-all">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {dataSource === "saved" && activeSection === "reservations" && (
          <ImportChart data={chartData} />
        )}

        {showSyncModal && syncStatus && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowSyncModal(false)}></div>
            <div className="bg-slate-900 border border-white/10 rounded-3xl p-8 shadow-2xl max-w-sm w-full relative animate-in zoom-in-95 duration-200">
              <div className="flex flex-col items-center text-center gap-6">
                <div className="w-16 h-16 bg-emerald-500/10 rounded-full flex items-center justify-center text-emerald-500"><svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg></div>
                <div><h3 className="text-xl font-bold text-white mb-2">Import Complete</h3><p className="text-slate-400 text-sm">Reservation data has been synchronized with the database.</p></div>
                <div className="grid grid-cols-2 gap-4 w-full">
                  <div className="bg-white/5 border border-white/5 p-4 rounded-2xl"><p className="text-[10px] uppercase font-bold text-slate-500 tracking-wider mb-1">New Records</p><p className="text-2xl font-bold text-emerald-400">{syncStatus.inserted}</p></div>
                  <div className="bg-white/5 border border-white/5 p-4 rounded-2xl"><p className="text-[10px] uppercase font-bold text-slate-500 tracking-wider mb-1">Duplicates</p><p className="text-2xl font-bold text-slate-300">{syncStatus.skipped}</p></div>
                </div>
                <button onClick={() => setShowSyncModal(false)} className="w-full py-3 bg-[#AAA024] text-white font-bold rounded-2xl shadow-lg shadow-[#AAA024]/20 hover:bg-[#8f871e] transition-all">Confirm</button>
              </div>
            </div>
          </div>
        )}
      </div>
      <style jsx>{`
        .custom-scrollbar::-webkit-scrollbar { height: 8px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: rgba(255, 255, 255, 0.02); border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(170, 160, 36, 0.3); border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(170, 160, 36, 0.5); }
      `}</style>
    </div>
  );

  function renderValue(key: string, value: any) {
    if (value === null || value === undefined) return <span className="text-slate-600 italic">null</span>;
    if (typeof value === 'boolean') return value ? <span className="text-emerald-400 font-bold">YES</span> : <span className="text-slate-500 italic">no</span>;
    
    // Custom format for Import Date
    if (key === "Import Date" && value) {
      try {
        const d = new Date(value);
        const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
        const day = String(d.getDate()).padStart(2, '0');
        const month = months[d.getMonth()];
        const year = d.getFullYear();
        const hours = String(d.getHours()).padStart(2, '0');
        const mins = String(d.getMinutes()).padStart(2, '0');
        return <span className="text-[#AAA024] font-bold">{`${day}-${month}-${year} ${hours}:${mins}`}</span>;
      } catch (e) {
        return <span>{String(value)}</span>;
      }
    }

    if (key.toLowerCase().includes('utc') && typeof value === 'string' && value.includes('T')) return <span className="text-slate-300 font-mono text-xs">{new Date(value).toLocaleString()}</span>;
    if (key === 'State' || key === 'status') return <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase ${value === 'Confirmed' ? 'bg-emerald-500/10 text-emerald-400' : value === 'Started' ? 'bg-blue-500/10 text-blue-400' : 'bg-white/5 text-slate-400'}`}>{value}</span>;
    if (typeof value === 'object') return <span className="text-[10px] text-slate-500 truncate block">{JSON.stringify(value).substring(0, 50)}...</span>;
    return <span className={typeof value === 'number' ? 'text-[#AAA024] font-bold' : 'text-slate-300'}>{String(value)}</span>;
  }
}
