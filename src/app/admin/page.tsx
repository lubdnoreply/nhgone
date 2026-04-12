export default function AdminPage() {
  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-600 to-indigo-600 tracking-tight mb-2">
            Admin Console
          </h1>
          <p className="text-slate-500 font-medium">Manage system settings and configurations</p>
        </div>
      </div>
      
      <div className="p-12 text-center bg-white rounded-2xl border border-slate-200/60 shadow-sm">
        <h2 className="text-xl font-semibold text-slate-700 mb-2">Coming Soon</h2>
        <p className="text-slate-500">The administrative console is currently under construction.</p>
      </div>
    </div>
  );
}
