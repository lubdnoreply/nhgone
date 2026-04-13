export default function AdminPage() {
  return (
    <div className="p-8 bg-white min-h-screen text-slate-900">
      <header className="mb-10">
        <h1 className="text-3xl font-extrabold tracking-tight mb-2">Admin Console</h1>
        <p className="text-slate-500 font-medium">Manage system infrastructure and MEWS API connections</p>
      </header>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
        <div className="bg-slate-50 border border-slate-200 p-6 rounded-3xl shadow-sm">
          <p className="text-[10px] font-bold text-[#AAA024] uppercase tracking-widest mb-1">Total Properties</p>
          <p className="text-4xl font-black text-slate-900">9</p>
        </div>
        <div className="bg-slate-50 border border-slate-200 p-6 rounded-3xl shadow-sm">
          <p className="text-[10px] font-bold text-[#AAA024] uppercase tracking-widest mb-1">Active Sync</p>
          <p className="text-4xl font-black text-slate-900">Online</p>
        </div>
      </div>

      <div className="p-12 text-center bg-slate-50 border border-slate-200 rounded-3xl">
        <h2 className="text-xl font-bold text-slate-800 mb-2">System Overview</h2>
        <p className="text-slate-500 text-sm">Select a section from the admin menu to manage configurations.</p>
      </div>
    </div>
  );
}
