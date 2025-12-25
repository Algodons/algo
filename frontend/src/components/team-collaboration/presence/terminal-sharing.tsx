'use client';

import { useState, useEffect, useRef } from 'react';
import { Terminal, Users, Lock, Unlock, Square, Play } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface TerminalSharingProps {
  projectId: number;
  onConnect?: (sessionId: string) => void;
  onDisconnect?: () => void;
}

export function TerminalSharing({ projectId, onConnect, onDisconnect }: TerminalSharingProps) {
  const [isSharing, setIsSharing] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [participants, setParticipants] = useState<number[]>([]);
  const [accessControl, setAccessControl] = useState<'view-only' | 'interactive'>('view-only');
  const [isRecording, setIsRecording] = useState(false);
  const terminalRef = useRef<HTMLDivElement>(null);

  const startSharing = () => {
    const newSessionId = `terminal-${projectId}-${Date.now()}`;
    setSessionId(newSessionId);
    setIsSharing(true);
    onConnect?.(newSessionId);
  };

  const stopSharing = () => {
    setSessionId(null);
    setIsSharing(false);
    setParticipants([]);
    onDisconnect?.();
  };

  const toggleAccessControl = () => {
    setAccessControl((prev) => (prev === 'view-only' ? 'interactive' : 'view-only'));
  };

  const toggleRecording = () => {
    setIsRecording((prev) => !prev);
  };

  return (
    <div className="space-y-4">
      <Card className="p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <Terminal className="w-5 h-5 text-primary" />
            <div>
              <h3 className="font-semibold">Terminal Sharing</h3>
              <p className="text-sm text-gray-500">
                {isSharing
                  ? `Session active • ${participants.length} participant${participants.length !== 1 ? 's' : ''}`
                  : 'Share your terminal with team members'}
              </p>
            </div>
          </div>

          {!isSharing ? (
            <Button onClick={startSharing}>
              <Play className="w-4 h-4 mr-2" />
              Start Sharing
            </Button>
          ) : (
            <Button variant="destructive" onClick={stopSharing}>
              <Square className="w-4 h-4 mr-2" />
              Stop Sharing
            </Button>
          )}
        </div>

        {isSharing && (
          <div className="space-y-4">
            {/* Session Info */}
            <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="font-mono">
                  {sessionId}
                </Badge>
                <span className="text-sm text-gray-600">Share this ID with your team</span>
              </div>
            </div>

            {/* Controls */}
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={toggleAccessControl}
                className="flex items-center gap-2"
              >
                {accessControl === 'view-only' ? (
                  <>
                    <Lock className="w-4 h-4" />
                    View Only
                  </>
                ) : (
                  <>
                    <Unlock className="w-4 h-4" />
                    Interactive
                  </>
                )}
              </Button>

              <Button
                variant={isRecording ? 'destructive' : 'outline'}
                size="sm"
                onClick={toggleRecording}
                className="flex items-center gap-2"
              >
                <div
                  className={`w-2 h-2 rounded-full ${isRecording ? 'bg-white animate-pulse' : 'bg-red-500'}`}
                />
                {isRecording ? 'Recording' : 'Record'}
              </Button>

              <div className="ml-auto flex items-center gap-2 text-sm text-gray-600">
                <Users className="w-4 h-4" />
                <span>
                  {participants.length} active participant{participants.length !== 1 ? 's' : ''}
                </span>
              </div>
            </div>

            {/* Terminal Preview */}
            <div
              ref={terminalRef}
              className="bg-gray-900 rounded-lg p-4 h-64 font-mono text-sm text-green-400 overflow-auto"
            >
              <div className="mb-2">$ Terminal shared session</div>
              <div className="text-gray-500">
                Waiting for terminal connection...
              </div>
              <div className="mt-2 text-yellow-400">
                Access mode: {accessControl}
              </div>
              {isRecording && (
                <div className="mt-1 text-red-400 animate-pulse">
                  ● Recording session
                </div>
              )}
            </div>

            {/* Participants List */}
            {participants.length > 0 && (
              <div className="border-t pt-4">
                <h4 className="text-sm font-medium mb-2">Active Participants</h4>
                <div className="space-y-2">
                  {participants.map((userId) => (
                    <div
                      key={userId}
                      className="flex items-center justify-between p-2 bg-gray-50 rounded"
                    >
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                          <span className="text-xs font-semibold text-primary">U{userId}</span>
                        </div>
                        <span className="text-sm">User {userId}</span>
                      </div>
                      <Badge variant="outline" className="text-xs">
                        {accessControl === 'view-only' ? 'Viewing' : 'Interactive'}
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </Card>

      {/* Join Session Card */}
      {!isSharing && (
        <Card className="p-4 bg-gray-50">
          <h4 className="font-medium mb-3">Join a Shared Terminal</h4>
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Enter session ID"
              className="flex-1 px-3 py-2 border rounded-md text-sm"
            />
            <Button size="sm">Join</Button>
          </div>
        </Card>
      )}
    </div>
  );
}
