"use client";

import { useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { DashboardNavbar } from '@/components/dashboard/dashboard-navbar';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [queryClient] = useState(() => new QueryClient());

  return (
    <QueryClientProvider client={queryClient}>
      <div className='min-h-screen bg-[linear-gradient(180deg,#fafaf9_0%,#f5f5f4_42%,#fafaf9_100%)]'>
        <DashboardNavbar />
        {children}
      </div>
    </QueryClientProvider>
  );
}
