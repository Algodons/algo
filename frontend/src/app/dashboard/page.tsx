'use client';

import { useSession } from 'next-auth/react';
import { redirect } from 'next/navigation';
import { DashboardHeader } from '@/components/dashboard/header';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ProjectsSection } from '@/components/dashboard/projects-section';
import { ResourcesSection } from '@/components/dashboard/resources-section';
import { ApiManagementSection } from '@/components/dashboard/api-management-section';
import { SettingsSection } from '@/components/dashboard/settings-section';
import { LayoutDashboard, FolderKanban, Activity, Key, Settings } from 'lucide-react';

export default function DashboardPage() {
  const { data: session, status } = useSession();

  if (status === 'loading') {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (!session) {
    redirect('/login');
  }

  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader />
      <main className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">
            Manage your projects, monitor resources, and configure your account
          </p>
        </div>

        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2 lg:grid-cols-5">
            <TabsTrigger value="overview" className="flex items-center gap-2">
              <LayoutDashboard className="h-4 w-4" />
              <span className="hidden sm:inline">Overview</span>
            </TabsTrigger>
            <TabsTrigger value="projects" className="flex items-center gap-2">
              <FolderKanban className="h-4 w-4" />
              <span className="hidden sm:inline">Projects</span>
            </TabsTrigger>
            <TabsTrigger value="resources" className="flex items-center gap-2">
              <Activity className="h-4 w-4" />
              <span className="hidden sm:inline">Resources</span>
            </TabsTrigger>
            <TabsTrigger value="api" className="flex items-center gap-2">
              <Key className="h-4 w-4" />
              <span className="hidden sm:inline">API</span>
            </TabsTrigger>
            <TabsTrigger value="settings" className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              <span className="hidden sm:inline">Settings</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <div className="grid gap-6">
              <ProjectsSection />
              <ResourcesSection />
            </div>
          </TabsContent>

          <TabsContent value="projects">
            <ProjectsSection />
          </TabsContent>

          <TabsContent value="resources">
            <ResourcesSection />
          </TabsContent>

          <TabsContent value="api">
            <ApiManagementSection />
          </TabsContent>

          <TabsContent value="settings">
            <SettingsSection />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
