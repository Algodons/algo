import { io, Socket } from 'socket.io-client';

interface ResourceMetric {
  type: 'cpu' | 'memory' | 'storage' | 'bandwidth';
  value: number;
  timestamp: Date;
}

interface NotificationMessage {
  id: string;
  type: 'info' | 'success' | 'warning' | 'error';
  title: string;
  message: string;
  timestamp: Date;
}

export class RealtimeService {
  private socket: Socket | null = null;
  private listeners: Map<string, Set<Function>> = new Map();

  connect(url?: string) {
    const socketUrl = url || process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:4000';

    this.socket = io(socketUrl, {
      transports: ['websocket'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5,
    });

    this.socket.on('connect', () => {
      console.log('WebSocket connected');
      this.emit('connection', { status: 'connected' });
    });

    this.socket.on('disconnect', () => {
      console.log('WebSocket disconnected');
      this.emit('connection', { status: 'disconnected' });
    });

    this.socket.on('resource:update', (data: ResourceMetric) => {
      this.emit('resource:update', data);
    });

    this.socket.on('notification', (data: NotificationMessage) => {
      this.emit('notification', data);
    });

    this.socket.on('deployment:status', (data: any) => {
      this.emit('deployment:status', data);
    });

    this.socket.on('webhook:delivery', (data: any) => {
      this.emit('webhook:delivery', data);
    });

    return this;
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  on(event: string, callback: Function) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback);

    return () => {
      const callbacks = this.listeners.get(event);
      if (callbacks) {
        callbacks.delete(callback);
        if (callbacks.size === 0) {
          this.listeners.delete(event);
        }
      }
    };
  }

  off(event: string, callback?: Function) {
    if (!callback) {
      this.listeners.delete(event);
      return;
    }

    const callbacks = this.listeners.get(event);
    if (callbacks) {
      callbacks.delete(callback);
      if (callbacks.size === 0) {
        this.listeners.delete(event);
      }
    }
  }

  private emit(event: string, data: any) {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      callbacks.forEach((callback) => callback(data));
    }
  }

  // Resource monitoring
  subscribeToResourceUpdates(projectId?: string) {
    if (this.socket) {
      this.socket.emit('subscribe:resources', { projectId });
    }
  }

  unsubscribeFromResourceUpdates(projectId?: string) {
    if (this.socket) {
      this.socket.emit('unsubscribe:resources', { projectId });
    }
  }

  // Notifications
  subscribeToNotifications(userId: string) {
    if (this.socket) {
      this.socket.emit('subscribe:notifications', { userId });
    }
  }

  unsubscribeFromNotifications(userId: string) {
    if (this.socket) {
      this.socket.emit('unsubscribe:notifications', { userId });
    }
  }

  // Deployment status
  subscribeToDeploymentStatus(projectId: string) {
    if (this.socket) {
      this.socket.emit('subscribe:deployment', { projectId });
    }
  }

  unsubscribeFromDeploymentStatus(projectId: string) {
    if (this.socket) {
      this.socket.emit('unsubscribe:deployment', { projectId });
    }
  }

  // Send custom events
  send(event: string, data: any) {
    if (this.socket) {
      this.socket.emit(event, data);
    }
  }

  get isConnected(): boolean {
    return this.socket?.connected || false;
  }
}

// Singleton instance
let realtimeServiceInstance: RealtimeService | null = null;

export function getRealtimeService(): RealtimeService {
  if (!realtimeServiceInstance) {
    realtimeServiceInstance = new RealtimeService();
  }
  return realtimeServiceInstance;
}
