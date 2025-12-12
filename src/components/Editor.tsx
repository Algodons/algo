import React, { useEffect, useRef, useState } from 'react';
import * as Y from 'yjs';
import { WebsocketProvider } from 'y-websocket';
import { EditorView, basicSetup } from 'codemirror';
import { EditorState } from '@codemirror/state';
import { javascript } from '@codemirror/lang-javascript';
import { python } from '@codemirror/lang-python';
import { html } from '@codemirror/lang-html';
import { css } from '@codemirror/lang-css';
import { json } from '@codemirror/lang-json';
import { markdown } from '@codemirror/lang-markdown';
import { rust } from '@codemirror/lang-rust';
import { yCollab } from 'y-codemirror.next';
import './Editor.css';

interface EditorProps {
  workspaceId: string;
  filePath: string | null;
}

const Editor: React.FC<EditorProps> = ({ workspaceId, filePath }) => {
  const editorRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  const providerRef = useRef<WebsocketProvider | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    if (!editorRef.current || !filePath) return;

    // Clean up previous editor
    if (viewRef.current) {
      viewRef.current.destroy();
    }
    if (providerRef.current) {
      providerRef.current.destroy();
    }

    // Create Yjs document and provider - dynamically construct WebSocket URL
    const doc = new Y.Doc();
    const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsHost = window.location.hostname;
    const wsPort = window.location.port ? `:${window.location.port}` : '';
    const wsUrl = `${wsProtocol}//${wsHost}${wsPort}/yjs`;
    
    const provider = new WebsocketProvider(
      wsUrl,
      `${workspaceId}:${filePath}`,
      doc
    );
    providerRef.current = provider;

    provider.on('status', (event: { status: string }) => {
      setIsConnected(event.status === 'connected');
    });

    const yText = doc.getText('codemirror');
    
    // Determine language based on file extension
    const extension = filePath.split('.').pop()?.toLowerCase();
    let languageSupport = javascript();
    
    switch (extension) {
      case 'py':
        languageSupport = python();
        break;
      case 'html':
        languageSupport = html();
        break;
      case 'css':
        languageSupport = css();
        break;
      case 'json':
        languageSupport = json();
        break;
      case 'md':
        languageSupport = markdown();
        break;
      case 'rs':
        languageSupport = rust();
        break;
    }

    // Create editor state with Yjs binding
    const state = EditorState.create({
      doc: yText.toString(),
      extensions: [
        basicSetup,
        languageSupport,
        yCollab(yText, provider.awareness),
        EditorView.theme({
          '&': {
            height: '100%',
            backgroundColor: '#1e1e1e',
            color: '#d4d4d4'
          }
        })
      ]
    });

    // Create editor view
    const view = new EditorView({
      state,
      parent: editorRef.current
    });
    viewRef.current = view;

    return () => {
      view.destroy();
      provider.destroy();
    };
  }, [workspaceId, filePath]);

  if (!filePath) {
    return (
      <div className="editor-placeholder">
        <p>Select a file to start editing</p>
      </div>
    );
  }

  return (
    <div className="editor-container">
      <div className="editor-header">
        <span className="editor-filename">{filePath}</span>
        <span className={`editor-status ${isConnected ? 'connected' : 'disconnected'}`}>
          {isConnected ? '● Connected' : '○ Disconnected'}
        </span>
      </div>
      <div ref={editorRef} className="editor" />
    </div>
  );
};

export default Editor;
