declare module 'y-websocket/bin/utils' {
  import { WebSocket } from 'ws';
  import { IncomingMessage } from 'http';

  export interface SetupWSConnectionOptions {
    docName?: string;
    gc?: boolean;
  }

  export function setupWSConnection(
    ws: WebSocket,
    req: IncomingMessage,
    options?: SetupWSConnectionOptions
  ): void;
}
