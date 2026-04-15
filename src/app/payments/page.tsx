"use client";

import DashboardView from "@/components/DashboardView";

export default function PaymentsDatabasePage() {
  return (
    <DashboardView 
      title="Payment"
      subtitle="Historical payment data saved in NHGOne database"
      defaultDataSource="saved"
      defaultSection="payments"
      allowToggleDataSource={false}
      showSectionTabs={false}
    />
  );
}
