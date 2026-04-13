"use client";

import DashboardView from "@/components/DashboardView";

export default function MembersDatabasePage() {
  return (
    <DashboardView 
      title="Member"
      subtitle="Historical guest & member data saved in NHGOne database"
      defaultDataSource="saved"
      defaultSection="members"
      allowToggleDataSource={false}
    />
  );
}
