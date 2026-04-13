"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

interface PropertySetting {
  id: string;
  property_name: string;
  client_name: string;
  client_token: string;
  access_token: string;
}

export default function ApiSettingsPage() {
  const [settings, setSettings] = useState<PropertySetting[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<PropertySetting | null>(null);

  const fetchSettings = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("property_api_settings")
      .select("*")
      .order("property_name");
    
    if (data) setSettings(data);
    setLoading(false);
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const handleEdit = (prop: PropertySetting) => {
    setEditingId(prop.id);
    setEditForm({ ...prop });
  };

  const handleSave = async () => {
    if (!editForm) return;

    const { error } = await supabase
      .from("property_api_settings")
      .update({
        client_name: editForm.client_name,
        client_token: editForm.client_token,
        access_token: editForm.access_token
      })
      .eq("id", editForm.id);

    if (!error) {
      setSettings(settings.map(s => s.id === editForm.id ? editForm : s));
      setEditingId(null);
    } else {
      alert("Error saving: " + error.message);
    }
  };

  return (
    <div className="p-8 bg-slate-950 min-h-screen text-white">
      <header className="mb-10">
        <h1 className="text-3xl font-extrabold tracking-tight mb-2">API Settings</h1>
        <p className="text-slate-400">Configure MEWS API Credentials for each property</p>
      </header>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-purple-500"></div>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6">
          {settings.map((prop) => (
            <div key={prop.id} className="bg-white/5 border border-white/10 rounded-3xl p-6 backdrop-blur-xl transition-all hover:bg-white/[0.07]">
              {editingId === prop.id ? (
                <div className="space-y-4">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-xl font-bold text-purple-400">{prop.property_name}</h3>
                    <div className="flex gap-2">
                       <button onClick={handleSave} className="px-4 py-1.5 bg-purple-600 rounded-lg text-sm font-bold">Save Changes</button>
                       <button onClick={() => setEditingId(null)} className="px-4 py-1.5 bg-white/10 rounded-lg text-sm font-bold">Cancel</button>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] text-slate-500 font-bold uppercase tracking-widest px-1">Client Name</label>
                      <input 
                        className="bg-black/40 border border-white/10 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-purple-500"
                        value={editForm?.client_name}
                        onChange={(e) => setEditForm({...editForm!, client_name: e.target.value})}
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] text-slate-500 font-bold uppercase tracking-widest px-1">Client Token</label>
                      <input 
                        className="bg-black/40 border border-white/10 rounded-xl px-4 py-2 text-sm font-mono focus:outline-none focus:ring-1 focus:ring-purple-500"
                        value={editForm?.client_token}
                        onChange={(e) => setEditForm({...editForm!, client_token: e.target.value})}
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] text-slate-500 font-bold uppercase tracking-widest px-1">Access Token</label>
                      <input 
                        className="bg-black/40 border border-white/10 rounded-xl px-4 py-2 text-sm font-mono focus:outline-none focus:ring-1 focus:ring-purple-500"
                        value={editForm?.access_token}
                        onChange={(e) => setEditForm({...editForm!, access_token: e.target.value})}
                      />
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="text-xl font-bold mb-1">{prop.property_name}</h3>
                    <div className="flex gap-4 text-xs">
                       <span className="text-slate-500">Client: <span className="text-slate-300">{prop.client_name}</span></span>
                       <span className="text-slate-500">Access Token: <span className="text-slate-300 font-mono italic">***{prop.access_token.slice(-6)}</span></span>
                    </div>
                  </div>
                  <button 
                    onClick={() => handleEdit(prop)}
                    className="px-6 py-2 bg-white/5 hover:bg-white/10 rounded-xl text-sm font-bold border border-white/10 transition-all"
                  >
                    Edit Credentials
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
