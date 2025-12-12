import { WebSocketServer, WebSocket } from 'ws';
import * as Y from 'yjs';
import { setupWSConnection } from 'y-websocket/bin/utils';

const docs = new Map<string, Y.Doc>();

export function setupYjsServer(wss: WebSocketServer) {
  wss.on('connection', (ws: WebSocket, req) => {
    const url = new URL(req.url || '', `http://${req.headers.host}`);
    
    if (url.pathname.startsWith('/yjs')) {
      const docName = url.searchParams.get('docName') || 'default';
      
      // Get or create document
      let doc = docs.get(docName);
      if (!doc) {
        doc = new Y.Doc();
        docs.set(docName, doc);
        console.log(`📄 Created new Yjs document: ${docName}`);
      }

      // Setup WebSocket connection for this document
      setupWSConnection(ws, req, { docName, gc: true });
      
      ws.on('close', () => {
        console.log(`🔌 Client disconnected from document: ${docName}`);
      });

      console.log(`✅ Client connected to document: ${docName}`);
    }
  });
}

export function getDocument(docName: string): Y.Doc | undefined {
  return docs.get(docName);
}

export function createDocument(docName: string): Y.Doc {
  const doc = new Y.Doc();
  docs.set(docName, doc);
  return doc;
}

export function deleteDocument(docName: string): boolean {
  return docs.delete(docName);
}
