import { createClient } from '@supabase/supabase-js';

export default function ProfilePage() {
  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-slate-800 tracking-tight mb-2">
            Your Profile
          </h1>
          <p className="text-slate-500 font-medium">Manage your account settings</p>
        </div>
      </div>
      
      <div className="bg-white rounded-2xl border border-slate-200/60 shadow-sm p-8 max-w-2xl">
        <div className="flex items-center gap-6 mb-8 pb-8 border-b border-slate-100">
           <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-blue-500 to-emerald-500 flex items-center justify-center text-2xl font-bold text-white uppercase shadow-inner">
              NHG
           </div>
           <div>
              <h2 className="text-xl font-semibold text-slate-800">User Profile</h2>
              <p className="text-slate-500">user@example.com</p>
           </div>
        </div>
        
        <div className="space-y-6">
           <div>
              <h3 className="text-sm font-semibold text-slate-700 mb-4">Account Information</h3>
              <div className="grid grid-cols-2 gap-4">
                 <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                    <p className="text-xs text-slate-500 font-medium mb-1">Role</p>
                    <p className="text-sm font-semibold text-slate-800">Admin</p>
                 </div>
                 <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                    <p className="text-xs text-slate-500 font-medium mb-1">Status</p>
                    <p className="text-sm font-semibold text-emerald-600">Active</p>
                 </div>
              </div>
           </div>
        </div>
      </div>
    </div>
  );
}
