"use client";

import React from "react";
import UserHeader from "./UserHeader";

interface PageHeaderProps {
  title: React.ReactNode;
  description?: string;
  children?: React.ReactNode; // For action buttons, search, etc.
}

export default function PageHeader({ title, description, children }: PageHeaderProps) {
  return (
    <div className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white mb-2">
          {title}
        </h1>
        {description && (
          <p className="text-slate-500 dark:text-slate-400 text-sm">
            {description}
          </p>
        )}
      </div>
      <div className="flex items-center gap-3">
        {children}
        <UserHeader />
      </div>
    </div>
  );
}
