import PageHeader from "@/components/PageHeader";

export default function SMTPPage() {
  return (
    <div className="p-8 bg-white min-h-screen text-slate-900">
      <PageHeader 
        title="Email SMTP" 
        description="Configure email server settings for system notifications"
      />
      
      <div className="p-20 text-center bg-slate-50 border border-slate-200 rounded-3xl border-dashed">
        <p className="text-slate-400 font-medium">SMTP Configuration Module - Coming Soon</p>
      </div>
    </div>
  );
}
