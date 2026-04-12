export default function AdminDashboardPage() {
  return (
    <div className="animate-in fade-in duration-300 w-full max-w-5xl">
       <div className="mb-8">
          <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Overview</h1>
          <p className="text-sm text-slate-500 mt-1">
             Welcome back, Khemmarin Khuntong (UI). managing system as super_admin.
          </p>
       </div>

       <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-2xl p-6 border border-slate-200/60 shadow-sm flex items-center gap-5">
             <div className="w-12 h-12 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-500 shrink-0">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
             </div>
             <div>
                <p className="text-xs font-medium text-slate-500 mb-1">Total Users</p>
                <p className="text-2xl font-bold text-slate-800">26</p>
             </div>
          </div>
          
          <div className="bg-white rounded-2xl p-6 border border-slate-200/60 shadow-sm flex items-center gap-5">
             <div className="w-12 h-12 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-500 shrink-0">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" /></svg>
             </div>
             <div>
                <p className="text-xs font-medium text-slate-500 mb-1">Active Workspaces</p>
                <p className="text-2xl font-bold text-slate-800">15</p>
             </div>
          </div>

          <div className="bg-white rounded-2xl p-6 border border-slate-200/60 shadow-sm flex items-center gap-5">
             <div className="w-12 h-12 rounded-xl bg-amber-50 flex items-center justify-center text-amber-500 shrink-0">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>
             </div>
             <div>
                <p className="text-xs font-medium text-slate-500 mb-1">System Health</p>
                <p className="text-2xl font-bold text-slate-800">100%</p>
             </div>
          </div>
       </div>

       <div className="bg-white rounded-2xl border border-slate-200/60 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-slate-100 flex items-center justify-between">
             <h2 className="text-base font-bold text-slate-800 tracking-tight">Recent Activity</h2>
             <button className="flex items-center gap-2 px-3 py-1.5 text-xs font-semibold text-slate-600 bg-slate-50 hover:bg-slate-100 rounded-lg transition-colors border border-slate-200">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                Refresh
             </button>
          </div>
          
          <div className="divide-y divide-slate-100">
             {[
               { action: "group_renamed", by: "parika.k@lubd.com", time: "4/9/2026, 6:54:38 PM", icon: "user", color: "text-indigo-500", bg: "bg-indigo-50" },
               { action: "group_created", by: "parika.k@lubd.com", time: "4/9/2026, 6:54:30 PM", icon: "user", color: "text-emerald-500", bg: "bg-emerald-50" },
               { action: "group_renamed", by: "parika.k@lubd.com", time: "4/9/2026, 6:54:25 PM", icon: "user", color: "text-indigo-500", bg: "bg-indigo-50" },
               { action: "group_created", by: "parika.k@lubd.com", time: "4/9/2026, 6:54:10 PM", icon: "user", color: "text-emerald-500", bg: "bg-emerald-50" },
             ].map((item, idx) => (
               <div key={idx} className="p-5 flex items-start gap-4 hover:bg-slate-50/50 transition-colors">
                  <div className={`w-8 h-8 rounded-lg ${item.bg} ${item.color} flex items-center justify-center shrink-0`}>
                     <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                  </div>
                  <div className="flex-1">
                     <p className="text-sm font-semibold text-slate-700">{item.action}</p>
                     <p className="text-xs text-slate-500 mt-0.5">by {item.by.split('@')[0]} ({item.by})</p>
                     <button className="text-xs text-blue-500 font-medium hover:underline mt-1.5">View Details</button>
                  </div>
                  <div className="text-xs text-slate-400 font-medium">{item.time}</div>
               </div>
             ))}
          </div>
       </div>
    </div>
  );
}
