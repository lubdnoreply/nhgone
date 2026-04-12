export default function UserManagementPage() {
  const users = [
    { name: "Executive House Keeper Lub d Bangkok Chinatown", email: "ehk.chinatown@lubd.com", role: "User", status: "Active", lastLogin: "Apr 12, 2026, 6:01 PM", joined: "4/12/2026" },
    { name: "Pattiya chauenla-or", email: "pattiya.c@naraihospitality.com", role: "User", status: "Active", lastLogin: "Apr 10, 2026, 6:19 PM", joined: "4/10/2026" },
    { name: "Adipa Sriratchatchawan", email: "adipa.s@lubd.com", role: "User", status: "Active", lastLogin: "Apr 10, 2026, 1:40 PM", joined: "4/10/2026" },
    { name: "Guest Experience Leader Chinatown", email: "gxp.chinatown@lubd.com", role: "User", status: "Active", lastLogin: "Apr 9, 2026, 7:11 PM", joined: "4/9/2026" },
    { name: "crew.chinatown", email: "crew.chinatown@lubd.com", role: "User", status: "Active", lastLogin: "Apr 9, 2026, 7:03 PM", joined: "4/9/2026" },
    { name: "parika.k", email: "parika.k@lubd.com", role: "User", status: "Active", lastLogin: "Apr 9, 2026, 5:50 PM", joined: "4/9/2026" },
    { name: "Ketpaitoon Teerachote", email: "ketpaitoon.t@naraihospitality.com", role: "User", status: "Active", lastLogin: "Apr 8, 2026, 5:23 PM", joined: "4/8/2026" },
  ];

  return (
    <div className="animate-in fade-in duration-300 w-full max-w-6xl">
       <div className="mb-8">
          <h1 className="text-2xl font-bold text-slate-800 tracking-tight">User Management</h1>
          <p className="text-sm text-slate-500 mt-1">
             Welcome back, Khemmarin Khuntong (UI). managing system as super_admin.
          </p>
       </div>

       <div className="bg-white rounded-2xl border border-slate-200/60 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between gap-4">
             <div className="relative flex-1 max-w-md">
                <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none text-slate-400">
                   <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                </div>
                <input 
                  type="text" 
                  placeholder="Search users..." 
                  className="w-full bg-slate-50/50 border border-slate-200 rounded-xl py-2 pl-9 pr-4 text-sm outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                />
             </div>
             
             <div className="flex items-center gap-2">
                <button className="flex items-center gap-2 px-3 py-2 text-xs font-semibold text-slate-600 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg transition-colors">
                   <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                   Refresh
                </button>
                <button className="flex items-center gap-2 px-3 py-2 text-xs font-semibold text-slate-600 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg transition-colors">
                   <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" /></svg>
                   Filter
                </button>
             </div>
          </div>
          
          <div className="overflow-x-auto">
             <table className="w-full text-left border-collapse">
                <thead>
                   <tr className="border-b border-slate-200 bg-slate-50/50">
                      <th className="py-3 px-6 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Name ↑↓</th>
                      <th className="py-3 px-6 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Email ↑↓</th>
                      <th className="py-3 px-6 text-[10px] font-bold text-slate-500 uppercase tracking-widest text-center">Role ↑↓</th>
                      <th className="py-3 px-6 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Status ↑↓</th>
                      <th className="py-3 px-6 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Last Log-In ↑↓</th>
                      <th className="py-3 px-6 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Joined ↓</th>
                      <th className="py-3 px-6 text-[10px] font-bold text-slate-500 uppercase tracking-widest text-center">Actions</th>
                   </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                   {users.map((user, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                         <td className="py-3.5 px-6 text-sm font-semibold text-slate-700 max-w-[250px] truncate">{user.name}</td>
                         <td className="py-3.5 px-6 text-sm text-slate-500">{user.email}</td>
                         <td className="py-3.5 px-6 text-sm text-slate-500 text-center">
                            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-600">
                               {user.role}
                            </span>
                         </td>
                         <td className="py-3.5 px-6 text-sm">
                            <div className="flex items-center gap-1.5 text-emerald-600 font-medium">
                               <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>
                               {user.status}
                            </div>
                         </td>
                         <td className="py-3.5 px-6 text-sm text-slate-500">
                            {user.lastLogin.split(', ').map((line, i) => (
                               <div key={i}>{line}</div>
                            ))}
                         </td>
                         <td className="py-3.5 px-6 text-sm text-slate-500">{user.joined}</td>
                         <td className="py-3.5 px-6 text-center">
                            <button className="text-slate-400 hover:text-slate-600 p-1 rounded transition-colors">
                               <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path d="M6 10a2 2 0 11-4 0 2 2 0 014 0zM12 10a2 2 0 11-4 0 2 2 0 014 0zM16 12a2 2 0 100-4 2 2 0 000 4z" /></svg>
                            </button>
                         </td>
                      </tr>
                   ))}
                </tbody>
             </table>
          </div>
       </div>
    </div>
  );
}
