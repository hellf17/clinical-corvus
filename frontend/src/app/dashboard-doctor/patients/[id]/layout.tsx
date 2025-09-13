"use client";

import React from "react";
import { usePathname, useParams } from "next/navigation";
import Link from "next/link";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/Tabs";

const tabs = [
  { label: "Overview", slug: "overview" },
  { label: "Vitals", slug: "vitals" },
  { label: "Labs", slug: "labs" },
  { label: "Exams", slug: "exams" },
  { label: "Medications", slug: "medications" },
  { label: "Notes", slug: "notes" },
  { label: "Scores", slug: "scores" },
  { label: "Chat", slug: "chat" },
  { label: "Charts", slug: "charts" },
];

export default function PatientLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const params = useParams();
  const id = params.id as string;
  
  // Extract last segment of pathname to detect active tab
  const activeTab =
    tabs.find((t) => pathname.includes(`/${t.slug}`))?.slug || "overview";

  return (
    <div className="container mx-auto px-4 md:px-6">
      {/* Tabs Navigation under DoctorDashboardHeader */}
      <Tabs value={activeTab} className="w-full mt-4">
        <TabsList className="flex-nowrap overflow-x-auto whitespace-nowrap gap-2 bg-blue-50 p-1 rounded-lg border border-blue-200">
          {tabs.map((tab) => (
            <TabsTrigger
              key={tab.slug}
              value={tab.slug}
              className="data-[state=active]:bg-blue-600 data-[state=active]:text-white
                         data-[state=inactive]:hover:bg-blue-100
                         data-[state=inactive]:text-blue-700
                         rounded-md px-3 py-2 text-sm font-medium transition-all"
              asChild
            >
              <Link href={`/dashboard-doctor/patients/${id}/${tab.slug}`}>
                {tab.label}
              </Link>
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>
      <div className="mt-6">{children}</div>
    </div>
  );
}