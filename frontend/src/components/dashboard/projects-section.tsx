'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Grid, List, Search, Star, Share2, Clock, Activity } from 'lucide-react';

interface Project {
  id: string;
  name: string;
  description?: string;
  language: string;
  deploymentStatus: string;
  lastAccessedAt: string;
  isFavorite: boolean;
  resourceUsage?: {
    cpu: number;
    memory: number;
    storage: number;
  };
}

export function ProjectsSection() {
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterLanguage, setFilterLanguage] = useState('all');
  const [showTemplates, setShowTemplates] = useState(false);

  // Mock data - would come from API
  const projects: Project[] = [
    {
      id: '1',
      name: 'E-commerce Platform',
      description: 'Full-stack online store',
      language: 'TypeScript',
      deploymentStatus: 'running',
      lastAccessedAt: '2 hours ago',
      isFavorite: true,
      resourceUsage: { cpu: 45, memory: 512, storage: 1024 },
    },
    {
      id: '2',
      name: 'ML Model API',
      description: 'Python ML inference service',
      language: 'Python',
      deploymentStatus: 'idle',
      lastAccessedAt: '1 day ago',
      isFavorite: false,
      resourceUsage: { cpu: 12, memory: 256, storage: 512 },
    },
    {
      id: '3',
      name: 'React Dashboard',
      description: 'Analytics dashboard',
      language: 'JavaScript',
      deploymentStatus: 'deploying',
      lastAccessedAt: '30 minutes ago',
      isFavorite: true,
      resourceUsage: { cpu: 78, memory: 1024, storage: 2048 },
    },
  ];

  const templates = [
    { id: 't1', name: 'Next.js Starter', language: 'TypeScript', framework: 'Next.js', category: 'web' },
    { id: 't2', name: 'FastAPI Backend', language: 'Python', framework: 'FastAPI', category: 'api' },
    { id: 't3', name: 'React + Vite', language: 'JavaScript', framework: 'Vite', category: 'web' },
    { id: 't4', name: 'Django REST API', language: 'Python', framework: 'Django', category: 'api' },
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'running':
        return 'success';
      case 'deploying':
        return 'default';
      case 'failed':
        return 'destructive';
      default:
        return 'secondary';
    }
  };

  const filteredProjects = projects.filter((project) => {
    const matchesSearch =
      project.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      project.description?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesLanguage = filterLanguage === 'all' || project.language === filterLanguage;
    return matchesSearch && matchesLanguage;
  });

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Projects</CardTitle>
            <CardDescription>Manage your cloud projects</CardDescription>
          </div>
          <div className="flex gap-2">
            <Dialog open={showTemplates} onOpenChange={setShowTemplates}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  New Project
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-3xl">
                <DialogHeader>
                  <DialogTitle>Create New Project</DialogTitle>
                  <DialogDescription>Choose a template to get started quickly</DialogDescription>
                </DialogHeader>
                <div className="grid grid-cols-2 gap-4 mt-4">
                  {templates.map((template) => (
                    <Card
                      key={template.id}
                      className="cursor-pointer hover:border-primary transition-colors"
                    >
                      <CardHeader>
                        <CardTitle className="text-base">{template.name}</CardTitle>
                        <CardDescription>
                          {template.framework} · {template.language}
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <Button className="w-full" size="sm">
                          Use Template
                        </Button>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Filters */}
          <div className="flex items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search projects..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8"
              />
            </div>
            <Select value={filterLanguage} onValueChange={setFilterLanguage}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by language" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Languages</SelectItem>
                <SelectItem value="TypeScript">TypeScript</SelectItem>
                <SelectItem value="JavaScript">JavaScript</SelectItem>
                <SelectItem value="Python">Python</SelectItem>
              </SelectContent>
            </Select>
            <div className="flex gap-1">
              <Button
                variant={viewMode === 'grid' ? 'default' : 'outline'}
                size="icon"
                onClick={() => setViewMode('grid')}
              >
                <Grid className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === 'list' ? 'default' : 'outline'}
                size="icon"
                onClick={() => setViewMode('list')}
              >
                <List className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Projects Grid/List */}
          {viewMode === 'grid' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredProjects.map((project) => (
                <Card key={project.id} className="hover:border-primary transition-colors">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="text-base flex items-center gap-2">
                          {project.name}
                          {project.isFavorite && <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />}
                        </CardTitle>
                        <CardDescription className="mt-1">{project.description}</CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant="outline">{project.language}</Badge>
                      <Badge variant={getStatusColor(project.deploymentStatus) as any}>
                        {project.deploymentStatus}
                      </Badge>
                    </div>
                    <div className="text-xs text-muted-foreground flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {project.lastAccessedAt}
                    </div>
                    {project.resourceUsage && (
                      <div className="space-y-1 text-xs">
                        <div className="flex items-center justify-between">
                          <span className="text-muted-foreground">CPU</span>
                          <span>{project.resourceUsage.cpu}%</span>
                        </div>
                        <div className="h-1.5 w-full bg-secondary rounded-full overflow-hidden">
                          <div
                            className="h-full bg-primary"
                            style={{ width: `${project.resourceUsage.cpu}%` }}
                          />
                        </div>
                      </div>
                    )}
                    <div className="flex gap-2 pt-2">
                      <Button size="sm" className="flex-1">
                        Open
                      </Button>
                      <Button size="sm" variant="outline">
                        <Share2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="space-y-2">
              {filteredProjects.map((project) => (
                <div
                  key={project.id}
                  className="flex items-center justify-between rounded-lg border p-4 hover:bg-accent cursor-pointer transition-colors"
                >
                  <div className="flex items-center gap-4 flex-1">
                    <Activity className="h-8 w-8 text-primary" />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold">{project.name}</h3>
                        {project.isFavorite && <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />}
                      </div>
                      <p className="text-sm text-muted-foreground">{project.description}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">{project.language}</Badge>
                      <Badge variant={getStatusColor(project.deploymentStatus) as any}>
                        {project.deploymentStatus}
                      </Badge>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      <Clock className="inline h-3 w-3 mr-1" />
                      {project.lastAccessedAt}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm">Open</Button>
                    <Button size="sm" variant="outline">
                      <Share2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
