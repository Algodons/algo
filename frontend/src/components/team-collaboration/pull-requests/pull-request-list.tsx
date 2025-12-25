'use client';

import { useState, useEffect } from 'react';
import { GitPullRequest, GitMerge, Clock, CheckCircle2, XCircle, MessageSquare } from 'lucide-react';
import { PullRequest, PullRequestStatus } from '@/lib/types/collaboration';
import { pullRequestApi } from '@/lib/team-api';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface PullRequestListProps {
  projectId: number;
}

const STATUS_CONFIG: Record<PullRequestStatus, { icon: any; color: string; label: string }> = {
  open: { icon: GitPullRequest, color: 'text-green-500', label: 'Open' },
  draft: { icon: Clock, color: 'text-gray-500', label: 'Draft' },
  merged: { icon: GitMerge, color: 'text-purple-500', label: 'Merged' },
  closed: { icon: XCircle, color: 'text-red-500', label: 'Closed' },
};

export function PullRequestList({ projectId }: PullRequestListProps) {
  const [pullRequests, setPullRequests] = useState<PullRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'open' | 'closed' | 'all'>('open');

  useEffect(() => {
    loadPullRequests();
  }, [projectId, activeTab]);

  const loadPullRequests = async () => {
    try {
      setLoading(true);
      const status = activeTab === 'all' ? undefined : activeTab;
      const prs = await pullRequestApi.list(projectId, status);
      setPullRequests(prs);
    } catch (err) {
      console.error('Failed to load pull requests:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (seconds < 60) return 'just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return `${Math.floor(seconds / 86400)}d ago`;
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
        <h2 className="text-2xl font-bold">Pull Requests</h2>
        <Button>
          <GitPullRequest className="w-4 h-4 mr-2" />
          New Pull Request
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
        <TabsList>
          <TabsTrigger value="open">Open</TabsTrigger>
          <TabsTrigger value="closed">Closed</TabsTrigger>
          <TabsTrigger value="all">All</TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="space-y-3 mt-4">
          {pullRequests.length === 0 ? (
            <Card className="p-8 text-center">
              <GitPullRequest className="w-12 h-12 mx-auto mb-4 text-gray-400" />
              <h3 className="text-lg font-medium mb-2">No pull requests</h3>
              <p className="text-gray-500">
                {activeTab === 'open'
                  ? 'There are no open pull requests'
                  : 'No pull requests found'}
              </p>
            </Card>
          ) : (
            <div className="space-y-3">
              {pullRequests.map((pr) => {
                const config = STATUS_CONFIG[pr.status];
                const Icon = config.icon;

                return (
                  <Card
                    key={pr.id}
                    className="p-4 hover:shadow-md transition-shadow cursor-pointer"
                  >
                    <div className="flex items-start gap-4">
                      <div className={`mt-1 ${config.color}`}>
                        <Icon className="w-5 h-5" />
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <div className="flex-1">
                            <h3 className="font-semibold text-lg mb-1 hover:text-primary">
                              {pr.title}
                            </h3>
                            <div className="flex items-center gap-2 text-sm text-gray-600">
                              <span>#{pr.number}</span>
                              <span>•</span>
                              <span>by {pr.author_name || 'Unknown'}</span>
                              <span>•</span>
                              <span>{formatTimeAgo(pr.created_at)}</span>
                            </div>
                          </div>
                          <Badge variant={pr.status === 'open' ? 'default' : 'secondary'}>
                            {config.label}
                          </Badge>
                        </div>

                        {pr.description && (
                          <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                            {pr.description}
                          </p>
                        )}

                        <div className="flex items-center gap-4 text-sm">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs px-2 py-1 bg-blue-50 text-blue-700 rounded">
                              {pr.source_branch}
                            </span>
                            <span className="text-gray-400">→</span>
                            <span className="font-mono text-xs px-2 py-1 bg-green-50 text-green-700 rounded">
                              {pr.target_branch}
                            </span>
                          </div>

                          {pr.labels.length > 0 && (
                            <div className="flex items-center gap-1">
                              {pr.labels.map((label) => (
                                <Badge key={label} variant="outline" className="text-xs">
                                  {label}
                                </Badge>
                              ))}
                            </div>
                          )}
                        </div>

                        {pr.status === 'merged' && pr.merged_at && (
                          <div className="mt-2 flex items-center gap-2 text-sm text-purple-600">
                            <CheckCircle2 className="w-4 h-4" />
                            <span>
                              Merged {formatTimeAgo(pr.merged_at)}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
