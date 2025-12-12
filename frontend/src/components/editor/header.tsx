'use client';

import { Button } from '@/components/ui/button';
import { Play, Save, GitBranch, Settings, Share } from 'lucide-react';

interface EditorHeaderProps {
  projectId: string;
}

export function EditorHeader({ projectId }: EditorHeaderProps) {
  const handleRun = () => {
    // TODO: Implement run code
    console.log('Running code...');
  };

  const handleSave = () => {
    // TODO: Implement save
    console.log('Saving...');
  };

  return (
    <header className="flex h-12 items-center justify-between border-b bg-background px-4">
      <div className="flex items-center space-x-2">
        <h1 className="text-sm font-semibold">Project {projectId}</h1>
      </div>
      <div className="flex items-center space-x-2">
        <Button variant="ghost" size="sm" onClick={handleSave}>
          <Save className="mr-2 h-4 w-4" />
          Save
        </Button>
        <Button variant="ghost" size="sm">
          <GitBranch className="mr-2 h-4 w-4" />
          Git
        </Button>
        <Button variant="ghost" size="sm">
          <Share className="mr-2 h-4 w-4" />
          Share
        </Button>
        <Button variant="ghost" size="sm">
          <Settings className="h-4 w-4" />
        </Button>
        <Button onClick={handleRun}>
          <Play className="mr-2 h-4 w-4" />
          Run
        </Button>
      </div>
    </header>
  );
}
