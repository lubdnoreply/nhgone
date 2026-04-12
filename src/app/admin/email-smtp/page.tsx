export default function EmailSMTPPage() {
  return (
    <div className="animate-in fade-in duration-300 w-full max-w-4xl">
       <div className="mb-8">
          <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Email Settings</h1>
          <p className="text-sm text-slate-500 mt-1">
             Welcome back, Khemmarin Khuntong (UI). managing system as super_admin.
          </p>
       </div>

       <div className="bg-white rounded-2xl border border-slate-200/60 shadow-sm overflow-hidden mb-8">
          <div className="p-5 border-b border-slate-100 flex items-center gap-3">
             <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-500">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" /></svg>
             </div>
             <h2 className="text-base font-bold text-slate-800 tracking-tight">SMTP Configuration</h2>
          </div>
          
          <div className="p-6">
             <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div className="space-y-1.5">
                   <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">SMTP Host</label>
                   <input type="text" defaultValue="smtp.gmail.com" className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 outline-none text-sm text-slate-700 transition-all font-medium" />
                </div>
                
                <div className="space-y-1.5">
                   <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Port</label>
                   <div className="flex items-center gap-4">
                      <input type="text" defaultValue="465" className="flex-1 px-4 py-3 rounded-xl border border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 outline-none text-sm text-slate-700 transition-all font-medium" />
                      <label className="flex items-center gap-2 cursor-pointer whitespace-nowrap">
                         <input type="checkbox" defaultChecked className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500" />
                         <span className="text-sm font-medium text-slate-700">Secure (SSL/TLS)</span>
                      </label>
                   </div>
                </div>
                
                <div className="space-y-1.5">
                   <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Username</label>
                   <input type="text" defaultValue="noreply@naraihospitality.com" className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 outline-none text-sm text-slate-700 transition-all font-medium" />
                </div>
                
                <div className="space-y-1.5 flex flex-col">
                   <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Password / App Password</label>
                   <div className="relative">
                      <input type="password" defaultValue="..............." className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 outline-none text-sm text-slate-700 transition-all font-medium tracking-widest" />
                      <button className="absolute inset-y-0 right-3 flex items-center text-slate-400 hover:text-slate-600">
                         <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                      </button>
                   </div>
                </div>
                
                <div className="space-y-1.5">
                   <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">From Email</label>
                   <input type="text" defaultValue="noreply@naraihospitality.com" className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 outline-none text-sm text-slate-700 transition-all font-medium" />
                </div>
                
                <div className="space-y-1.5">
                   <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">From Name</label>
                   <input type="text" defaultValue="NHG Saturday.com" className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 outline-none text-sm text-slate-700 transition-all font-medium" />
                </div>
             </div>
          </div>
       </div>

       <div className="bg-white rounded-2xl border border-slate-200/60 shadow-sm overflow-hidden">
          <div className="p-5 border-b border-slate-100 flex items-center gap-3">
             <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-500">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
             </div>
             <h2 className="text-base font-bold text-slate-800 tracking-tight">Test SMTP Configuration</h2>
          </div>
          
          <div className="p-6">
             <p className="text-sm text-slate-600 mb-4 font-medium">
                Enter an email address below to send a test message using the current SMTP settings. <span className="text-amber-600">(You don't need to save settings before testing)</span>
             </p>
             
             <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Recipient Email Address</label>
                <div className="flex flex-col sm:flex-row gap-3">
                   <input 
                     type="email" 
                     placeholder="e.g. your-email@example.com" 
                     className="flex-1 px-4 py-3 rounded-xl border border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 outline-none text-sm text-slate-700 transition-all"
                   />
                   <button className="flex items-center justify-center gap-2 px-6 py-3 bg-indigo-500 hover:bg-indigo-600 text-white font-semibold rounded-xl text-sm transition-all shadow-md shadow-indigo-200 whitespace-nowrap active:scale-[0.98]">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                      Test Send Email
                   </button>
                </div>
             </div>
          </div>
       </div>
    </div>
  );
}
