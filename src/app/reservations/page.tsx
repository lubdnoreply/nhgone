"use client";

import DashboardView from "@/components/DashboardView";

export default function ReservationsDatabasePage() {
  return (
    <DashboardView 
      title="Reservation"
      subtitle="Historical reservation data saved in NHGOne database"
      defaultDataSource="saved"
      defaultSection="reservations"
      allowToggleDataSource={false}
      showSectionTabs={false}
    />
  );
}
