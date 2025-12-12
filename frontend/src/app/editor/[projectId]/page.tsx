'use client';

import { useSession } from 'next-auth/react';
import { redirect } from 'next/navigation';
import { CodeEditor } from '@/components/editor/code-editor';
import { EditorSidebar } from '@/components/editor/sidebar';
import { EditorTerminal } from '@/components/editor/terminal';
import { EditorHeader } from '@/components/editor/header';
import { useState } from 'react';

export default function EditorPage({ params }: { params: { projectId: string } }) {
  const { data: session, status } = useSession();
  const [sidebarWidth, setSidebarWidth] = useState(250);
  const [terminalHeight, setTerminalHeight] = useState(200);

  if (status === 'loading') {
    return <div>Loading...</div>;
  }

  if (!session) {
    redirect('/login');
  }

  return (
    <div className="flex h-screen flex-col bg-background">
      <EditorHeader projectId={params.projectId} />
      <div className="flex flex-1 overflow-hidden">
        <EditorSidebar width={sidebarWidth} projectId={params.projectId} />
        <div className="flex flex-1 flex-col">
          <div className="flex-1 overflow-hidden">
            <CodeEditor projectId={params.projectId} />
          </div>
          <div style={{ height: terminalHeight }} className="border-t">
            <EditorTerminal projectId={params.projectId} />
          </div>
        </div>
      </div>
    </div>
  );
}
