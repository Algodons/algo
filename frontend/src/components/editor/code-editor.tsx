'use client';

import { useEffect, useRef, useState } from 'react';
import Editor from '@monaco-editor/react';
import * as Y from 'yjs';
import { WebsocketProvider } from 'y-websocket';
import { MonacoBinding } from 'y-monaco';

interface CodeEditorProps {
  projectId: string;
}

export function CodeEditor({ projectId }: CodeEditorProps) {
  const editorRef = useRef<any>(null);
  const [language] = useState('javascript');
  const [code, setCode] = useState('// Start coding...\n\nconsole.log("Hello from Algo Cloud IDE!");');
  const bindingRef = useRef<MonacoBinding | null>(null);

  useEffect(() => {
    // Initialize Yjs for collaborative editing
    const ydoc = new Y.Doc();
    const provider = new WebsocketProvider(
      process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:4000',
      `project-${projectId}`,
      ydoc
    );

    const ytext = ydoc.getText('monaco');

    // Connect Monaco Editor to Yjs when editor is ready
    if (editorRef.current) {
      bindingRef.current = new MonacoBinding(
        ytext,
        editorRef.current.getModel(),
        new Set([editorRef.current]),
        provider.awareness
      );
    }

    return () => {
      bindingRef.current?.destroy();
      provider.destroy();
      ydoc.destroy();
    };
  }, [projectId]);

  const handleEditorDidMount = (editor: any, monaco: any) => {
    editorRef.current = editor;

    // Configure Monaco editor settings
    monaco.languages.typescript.javascriptDefaults.setEagerModelSync(true);
    monaco.languages.typescript.typescriptDefaults.setEagerModelSync(true);

    // Add IntelliSense configuration
    monaco.languages.typescript.javascriptDefaults.setCompilerOptions({
      target: monaco.languages.typescript.ScriptTarget.ES2020,
      allowNonTsExtensions: true,
      moduleResolution: monaco.languages.typescript.ModuleResolutionKind.NodeJs,
      module: monaco.languages.typescript.ModuleKind.CommonJS,
      noEmit: true,
      esModuleInterop: true,
      jsx: monaco.languages.typescript.JsxEmit.React,
      reactNamespace: 'React',
      allowJs: true,
      typeRoots: ['node_modules/@types'],
    });

    // Initialize Yjs binding if Yjs is already set up
    const ydoc = new Y.Doc();
    const ytext = ydoc.getText('monaco');
    const provider = new WebsocketProvider(
      process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:4000',
      `project-${projectId}`,
      ydoc
    );

    bindingRef.current = new MonacoBinding(
      ytext,
      editor.getModel(),
      new Set([editor]),
      provider.awareness
    );
  };

  return (
    <div className="h-full w-full">
      <Editor
        height="100%"
        defaultLanguage={language}
        defaultValue={code}
        theme="vs-dark"
        options={{
          minimap: { enabled: true },
          fontSize: 14,
          lineNumbers: 'on',
          roundedSelection: false,
          scrollBeyondLastLine: false,
          automaticLayout: true,
          tabSize: 2,
          wordWrap: 'on',
          formatOnPaste: true,
          formatOnType: true,
          suggestOnTriggerCharacters: true,
          quickSuggestions: true,
          parameterHints: { enabled: true },
        }}
        onMount={handleEditorDidMount}
        onChange={(value) => setCode(value || '')}
      />
    </div>
  );
}
