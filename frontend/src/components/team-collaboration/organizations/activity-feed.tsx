'use client';

import { useState, useEffect } from 'react';
import { Activity, GitBranch, Users, Settings, FileText, Lock, Trash2 } from 'lucide-react';
import { TeamActivityLog } from '@/lib/types/collaboration';
import { activityApi } from '@/lib/team-api';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface ActivityFeedProps {
  organizationId: number;
  limit?: number;
}

const ACTIVITY_ICONS: Record<string, any> = {
  member_invited: Users,
  member_joined: Users,
  member_removed: Users,
  role_updated: Settings,
  project_created: FileText,
  project_deleted: Trash2,
  branch_created: GitBranch,
  branch_deleted: GitBranch,
  pr_created: GitBranch,
  pr_merged: GitBranch,
  deployment: Activity,
  settings_updated: Settings,
  secret_added: Lock,
  secret_removed: Lock,
};

const ACTIVITY_COLORS: Record<string, string> = {
  member_invited: 'text-blue-500',
  member_joined: 'text-green-500',
  member_removed: 'text-red-500',
  role_updated: 'text-purple-500',
  project_created: 'text-green-500',
  project_deleted: 'text-red-500',
  branch_created: 'text-blue-500',
  branch_deleted: 'text-red-500',
  pr_created: 'text-blue-500',
  pr_merged: 'text-purple-500',
  deployment: 'text-orange-500',
  settings_updated: 'text-gray-500',
  secret_added: 'text-green-500',
  secret_removed: 'text-red-500',
};

export function ActivityFeed({ organizationId, limit = 50 }: ActivityFeedProps) {
  const [activities, setActivities] = useState<TeamActivityLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadActivities();
    // Refresh every 30 seconds
    const interval = setInterval(loadActivities, 30000);
    return () => clearInterval(interval);
  }, [organizationId, limit]);

  const loadActivities = async () => {
    try {
      setLoading(true);
      const logs = await activityApi.list(organizationId, limit);
      setActivities(logs);
    } catch (err) {
      console.error('Failed to load activities:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatActivityMessage = (activity: TeamActivityLog): string => {
    const userName = activity.user_name || 'Unknown';
    const details = activity.details || {};

    switch (activity.activity_type) {
      case 'member_invited':
        return `${userName} invited ${details.email} as ${details.role}`;
      case 'member_joined':
        return `${userName} joined the organization`;
      case 'member_removed':
        return `${userName} removed ${details.removed_user_name || 'a member'}`;
      case 'role_updated':
        return `${userName} updated ${details.target_user_name}'s role to ${details.new_role}`;
      case 'project_created':
        return `${userName} created project "${details.project_name}"`;
      case 'project_deleted':
        return `${userName} deleted project "${details.project_name}"`;
      case 'branch_created':
        return `${userName} created branch "${details.branch_name}"`;
      case 'branch_deleted':
        return `${userName} deleted branch "${details.branch_name}"`;
      case 'pr_created':
        return `${userName} created pull request #${details.pr_number}`;
      case 'pr_merged':
        return `${userName} merged pull request #${details.pr_number}`;
      case 'deployment':
        return `${userName} deployed to ${details.environment}`;
      case 'settings_updated':
        return `${userName} updated organization settings`;
      case 'secret_added':
        return `${userName} added secret "${details.key}"`;
      case 'secret_removed':
        return `${userName} removed secret "${details.key}"`;
      default:
        return `${userName} performed ${activity.activity_type}`;
    }
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (seconds < 60) return 'just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
    return date.toLocaleDateString();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <Activity className="w-6 h-6" />
          Activity Feed
        </h2>
      </div>

      {activities.length === 0 ? (
        <Card className="p-8 text-center">
          <Activity className="w-12 h-12 mx-auto mb-4 text-gray-400" />
          <h3 className="text-lg font-medium mb-2">No activity yet</h3>
          <p className="text-gray-500">
            Team activity will appear here as members interact with the organization
          </p>
        </Card>
      ) : (
        <div className="space-y-2">
          {activities.map((activity) => {
            const Icon = ACTIVITY_ICONS[activity.activity_type] || Activity;
            const color = ACTIVITY_COLORS[activity.activity_type] || 'text-gray-500';

            return (
              <Card key={activity.id} className="p-4 hover:shadow-md transition-shadow">
                <div className="flex items-start gap-3">
                  <div className={`mt-0.5 ${color}`}>
                    <Icon className="w-5 h-5" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-900">
                      {formatActivityMessage(activity)}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs text-gray-500">
                        {formatTimeAgo(activity.created_at)}
                      </span>
                      {activity.resource_type && (
                        <>
                          <span className="text-gray-300">•</span>
                          <Badge variant="outline" className="text-xs">
                            {activity.resource_type}
                          </Badge>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
