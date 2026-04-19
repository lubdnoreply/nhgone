"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import PageHeader from "@/components/PageHeader";

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

  const [isAdding, setIsAdding] = useState(false);
  const [newForm, setNewForm] = useState({
    property_name: "",
    client_name: "XPossible Hotel Connec",
    client_token: "",
    access_token: ""
  });

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
      const response = await fetch(`${apiUrl}/admin/sync/properties`);
      const res = await response.json();
      if (res.status === "success") {
        setSettings(res.data);
      }
    } catch (err) {
      console.error("Fetch error:", err);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const handleEdit = (prop: PropertySetting) => {
    setEditingId(prop.id);
    setEditForm({ ...prop });
  };

  const handleAdd = async () => {
    if (!newForm.property_name || !newForm.client_token || !newForm.access_token) {
      alert("Please fill in all fields");
      return;
    }

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
      const response = await fetch(`${apiUrl}/admin/sync/properties`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newForm)
      });
      const res = await response.json();

      if (res.status === "success") {
        setSettings([...settings, res.data].sort((a, b) => a.property_name.localeCompare(b.property_name)));
        setIsAdding(false);
        setNewForm({ property_name: "", client_name: "XPossible Hotel Connec", client_token: "", access_token: "" });
      } else {
        alert("Error adding property: " + res.detail);
      }
    } catch (err) {
      alert("Error adding property");
    }
  };

  const handleSave = async () => {
    if (!editForm) return;

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
      const response = await fetch(`${apiUrl}/admin/sync/properties/${editForm.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          property_name: editForm.property_name,
          client_name: editForm.client_name,
          client_token: editForm.client_token,
          access_token: editForm.access_token
        })
      });
      const res = await response.json();

      if (res.status === "success") {
        setSettings(settings.map(s => s.id === editForm.id ? editForm : s));
        setEditingId(null);
      } else {
        alert("Error saving: " + res.detail);
      }
    } catch (err) {
      alert("Error saving");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this property?")) return;
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
      const response = await fetch(`${apiUrl}/admin/sync/properties/${id}`, {
        method: "DELETE"
      });
      const res = await response.json();
      if (res.status === "success") {
        setSettings(settings.filter(s => s.id !== id));
      }
    } catch (err) {
      alert("Error deleting");
    }
  };

  return (
    <div className="p-8 bg-white min-h-screen text-slate-900">
      <PageHeader 
        title="API Settings" 
        description="Configure MEWS API Credentials for each property"
      >
        <button 
          onClick={() => setIsAdding(!isAdding)}
          className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${isAdding ? "bg-red-50 text-red-600 border border-red-200" : "bg-[#AAA024] text-white shadow-lg shadow-[#AAA024]/20"}`}
        >
          {isAdding ? "Cancel" : "Add New Property"}
        </button>
      </PageHeader>

      {isAdding && (
        <div className="mb-10 bg-slate-50 border border-slate-200 rounded-3xl p-8 animate-in slide-in-from-top-4 duration-300 shadow-sm">
           <h3 className="text-xl font-bold mb-6 flex items-center gap-2 text-slate-800">
             <div className="w-2 h-6 bg-[#AAA024] rounded-full"></div>
             New Property Credentials
           </h3>
           <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              <div className="space-y-1.5">
                <label className="text-[10px] text-slate-400 font-bold uppercase tracking-widest ml-1">Property Name</label>
                <input 
                  placeholder="e.g. Lub d Koh Samui"
                  className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#AAA024]/20 transition-all text-slate-900"
                  value={newForm.property_name}
                  onChange={(e) => setNewForm({...newForm, property_name: e.target.value})}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] text-slate-400 font-bold uppercase tracking-widest ml-1">Client Name</label>
                <input 
                  className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#AAA024]/20 transition-all text-slate-900"
                  value={newForm.client_name}
                  onChange={(e) => setNewForm({...newForm, client_name: e.target.value})}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] text-slate-400 font-bold uppercase tracking-widest ml-1">Client Token</label>
                <input 
                  placeholder="Paste Client Token here..."
                  className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[#AAA024]/20 transition-all text-slate-900"
                  value={newForm.client_token}
                  onChange={(e) => setNewForm({...newForm, client_token: e.target.value})}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] text-slate-400 font-bold uppercase tracking-widest ml-1">Access Token</label>
                <input 
                  placeholder="Paste Access Token here..."
                  className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[#AAA024]/20 transition-all text-slate-900"
                  value={newForm.access_token}
                  onChange={(e) => setNewForm({...newForm, access_token: e.target.value})}
                />
              </div>
           </div>
           <button 
             onClick={handleAdd}
             className="w-full py-4 bg-[#AAA024] hover:bg-[#8f871e] text-white rounded-2xl font-bold shadow-xl shadow-[#AAA024]/20 transition-all active:scale-[0.98]"
           >
             Save New Property
           </button>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#AAA024]"></div>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6">
          {settings.map((prop) => (
            <div key={prop.id} className="bg-slate-50 border border-slate-200 rounded-3xl p-6 transition-all hover:bg-slate-100/50 shadow-sm">
              {editingId === prop.id ? (
                <div className="space-y-4">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-xl font-bold text-[#AAA024]">{prop.property_name}</h3>
                    <div className="flex gap-2">
                       <button onClick={handleSave} className="px-4 py-1.5 bg-[#AAA024] text-white rounded-lg text-sm font-bold shadow-md shadow-[#AAA024]/20">Save</button>
                       <button onClick={() => setEditingId(null)} className="px-4 py-1.5 bg-white border border-slate-200 text-slate-600 rounded-lg text-sm font-bold">Cancel</button>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] text-slate-400 font-bold uppercase tracking-widest px-1">Property Name</label>
                      <input 
                        className="bg-white border border-slate-200 rounded-xl px-4 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#AAA024]/20"
                        value={editForm?.property_name}
                        onChange={(e) => setEditForm({...editForm!, property_name: e.target.value})}
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] text-slate-400 font-bold uppercase tracking-widest px-1">Client Name</label>
                      <input 
                        className="bg-white border border-slate-200 rounded-xl px-4 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#AAA024]/20"
                        value={editForm?.client_name}
                        onChange={(e) => setEditForm({...editForm!, client_name: e.target.value})}
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] text-slate-400 font-bold uppercase tracking-widest px-1">Client Token</label>
                      <input 
                        className="bg-white border border-slate-200 rounded-xl px-4 py-2 text-sm text-slate-900 font-mono focus:outline-none focus:ring-2 focus:ring-[#AAA024]/20"
                        value={editForm?.client_token}
                        onChange={(e) => setEditForm({...editForm!, client_token: e.target.value})}
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] text-slate-400 font-bold uppercase tracking-widest px-1">Access Token</label>
                      <input 
                        className="bg-white border border-slate-200 rounded-xl px-4 py-2 text-sm text-slate-900 font-mono focus:outline-none focus:ring-2 focus:ring-[#AAA024]/20"
                        value={editForm?.access_token}
                        onChange={(e) => setEditForm({...editForm!, access_token: e.target.value})}
                      />
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="text-xl font-bold mb-1 text-slate-800">{prop.property_name}</h3>
                    <div className="flex gap-4 text-xs">
                       <span className="text-slate-500">Client: <span className="text-slate-700">{prop.client_name}</span></span>
                       <span className="text-slate-500">Access Token: <span className="text-slate-700 font-mono italic">***{prop.access_token.slice(-6)}</span></span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button 
                      onClick={() => handleEdit(prop)}
                      className="px-6 py-2 bg-white hover:bg-slate-50 text-slate-700 rounded-xl text-sm font-bold border border-slate-200 transition-all shadow-sm"
                    >
                      Edit
                    </button>
                    <button 
                      onClick={() => handleDelete(prop.id)}
                      className="px-3 py-2 bg-red-50 hover:bg-red-100 text-red-500 rounded-xl text-sm font-bold border border-red-100 transition-all shadow-sm"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
