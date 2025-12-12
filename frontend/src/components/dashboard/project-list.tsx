'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, Folder, Code, Calendar } from 'lucide-react';

export function ProjectList() {
  const router = useRouter();
  const [projects] = useState([
    { id: '1', name: 'My First Project', language: 'JavaScript', lastModified: '2 hours ago' },
    { id: '2', name: 'Python API', language: 'Python', lastModified: '1 day ago' },
    { id: '3', name: 'React Dashboard', language: 'TypeScript', lastModified: '3 days ago' },
  ]);

  const createNewProject = () => {
    // TODO: Implement create project modal
    alert('Create project modal - to be implemented');
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Your Projects</CardTitle>
            <CardDescription>Manage and access your cloud projects</CardDescription>
          </div>
          <Button onClick={createNewProject}>
            <Plus className="mr-2 h-4 w-4" />
            New Project
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {projects.map((project) => (
            <div
              key={project.id}
              className="flex items-center justify-between rounded-lg border p-4 hover:bg-accent cursor-pointer transition-colors"
              onClick={() => router.push(`/editor/${project.id}`)}
            >
              <div className="flex items-center space-x-4">
                <Folder className="h-8 w-8 text-primary" />
                <div>
                  <h3 className="font-semibold">{project.name}</h3>
                  <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                    <Code className="h-3 w-3" />
                    <span>{project.language}</span>
                    <span>•</span>
                    <Calendar className="h-3 w-3" />
                    <span>{project.lastModified}</span>
                  </div>
                </div>
              </div>
              <Button variant="ghost" size="sm">
                Open
              </Button>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
