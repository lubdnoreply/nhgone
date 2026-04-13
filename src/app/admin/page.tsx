export default function AdminPage() {
  return (
    <div className="p-8 bg-slate-950 min-h-screen">
      <header className="mb-10">
        <h1 className="text-3xl font-extrabold tracking-tight mb-2">Admin Console</h1>
        <p className="text-slate-400 font-medium">Manage system infrastructure and MEWS API connections</p>
      </header>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
        <div className="bg-white/5 border border-white/10 p-6 rounded-3xl">
          <p className="text-[10px] font-bold text-purple-400 uppercase tracking-widest mb-1">Total Properties</p>
          <p className="text-4xl font-black">8</p>
        </div>
        <div className="bg-white/5 border border-white/10 p-6 rounded-3xl">
          <p className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest mb-1">Active Sync</p>
          <p className="text-4xl font-black">Online</p>
        </div>
      </div>

      <div className="p-12 text-center bg-white/5 border border-white/10 rounded-3xl backdrop-blur-xl">
        <h2 className="text-xl font-bold text-white mb-2">System Overview</h2>
        <p className="text-slate-400 text-sm">Select a section from the admin menu to manage configurations.</p>
      </div>
    </div>
  );
}
