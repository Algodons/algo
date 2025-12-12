'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Activity, Database, HardDrive } from 'lucide-react';

export function ResourceMonitor() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Resource Usage</CardTitle>
        <CardDescription>Monitor your platform resource consumption</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Activity className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium">CPU Usage</span>
            </div>
            <span className="text-sm text-muted-foreground">23%</span>
          </div>
          <div className="h-2 w-full rounded-full bg-secondary">
            <div className="h-2 w-[23%] rounded-full bg-primary" />
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Database className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium">Memory</span>
            </div>
            <span className="text-sm text-muted-foreground">1.2GB / 2GB</span>
          </div>
          <div className="h-2 w-full rounded-full bg-secondary">
            <div className="h-2 w-[60%] rounded-full bg-primary" />
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <HardDrive className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium">Storage</span>
            </div>
            <span className="text-sm text-muted-foreground">3.5GB / 10GB</span>
          </div>
          <div className="h-2 w-full rounded-full bg-secondary">
            <div className="h-2 w-[35%] rounded-full bg-primary" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
