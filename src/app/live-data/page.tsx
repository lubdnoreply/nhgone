"use client";

import DashboardView from "@/components/DashboardView";

export default function LiveDataPage() {
  return (
    <DashboardView 
      title="Live Data"
      subtitle="Direct one-way feed data from MEWS"
      defaultDataSource="live"
      defaultSection="reservations"
      allowToggleDataSource={false}
    />
  );
}
