'use client';

import { useSession } from 'next-auth/react';
import { redirect } from 'next/navigation';
import { ProjectList } from '@/components/dashboard/project-list';
import { ResourceMonitor } from '@/components/dashboard/resource-monitor';
import { DashboardHeader } from '@/components/dashboard/header';

export default function DashboardPage() {
  const { data: session, status } = useSession();

  if (status === 'loading') {
    return <div>Loading...</div>;
  }

  if (!session) {
    redirect('/login');
  }

  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader />
      <main className="container mx-auto px-4 py-8">
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          <div className="col-span-full lg:col-span-2">
            <ProjectList />
          </div>
          <div className="col-span-full lg:col-span-1">
            <ResourceMonitor />
          </div>
        </div>
      </main>
    </div>
  );
}
