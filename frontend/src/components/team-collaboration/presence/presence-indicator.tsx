'use client';

import { useState, useEffect } from 'react';
import { UserPresence } from '@/lib/types/collaboration';
import { presenceApi } from '@/lib/team-api';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';

interface PresenceIndicatorProps {
  projectId: number;
}

const STATUS_COLORS = {
  online: 'bg-green-500',
  away: 'bg-yellow-500',
  offline: 'bg-gray-400',
};

const USER_COLORS = [
  '#3b82f6', // blue
  '#ef4444', // red
  '#10b981', // green
  '#f59e0b', // amber
  '#8b5cf6', // purple
  '#ec4899', // pink
  '#06b6d4', // cyan
  '#f97316', // orange
];

export function PresenceIndicator({ projectId }: PresenceIndicatorProps) {
  const [activeUsers, setActiveUsers] = useState<UserPresence[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadActiveUsers();
    // Poll for updates every 5 seconds
    const interval = setInterval(loadActiveUsers, 5000);
    return () => clearInterval(interval);
  }, [projectId]);

  const loadActiveUsers = async () => {
    try {
      const users = await presenceApi.getActiveUsers(projectId);
      // Assign colors to users
      const usersWithColors = users.map((user, index) => ({
        ...user,
        color: user.color || USER_COLORS[index % USER_COLORS.length],
      }));
      setActiveUsers(usersWithColors);
    } catch (err) {
      console.error('Failed to load active users:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center space-x-2 px-3 py-2 bg-gray-50 rounded-lg">
        <div className="animate-pulse h-6 w-24 bg-gray-200 rounded"></div>
      </div>
    );
  }

  return (
    <div className="flex items-center space-x-3 px-3 py-2 bg-gray-50 rounded-lg">
      <span className="text-sm font-medium text-gray-700">Active:</span>
      
      <div className="flex items-center -space-x-2">
        {activeUsers.slice(0, 5).map((user) => (
          <div
            key={user.id}
            className="relative group"
            title={`${user.user_name} - ${user.current_file || 'Browsing'}`}
          >
            <Avatar
              className="w-8 h-8 border-2 border-white"
              style={{ borderColor: user.color }}
            >
              <AvatarFallback style={{ backgroundColor: user.color + '20', color: user.color }}>
                {user.user_name.substring(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-white ${STATUS_COLORS[user.status]}`}></div>
            
            {/* Tooltip */}
            <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10">
              <div className="font-medium">{user.user_name}</div>
              {user.current_file && (
                <div className="text-gray-300">{user.current_file}</div>
              )}
              {user.cursor_position && (
                <div className="text-gray-400">
                  Line {user.cursor_position.line}, Col {user.cursor_position.column}
                </div>
              )}
              <Badge variant="outline" className="mt-1 text-xs">
                {user.status}
              </Badge>
            </div>
          </div>
        ))}
      </div>

      {activeUsers.length > 5 && (
        <div className="text-xs text-gray-500 font-medium">
          +{activeUsers.length - 5} more
        </div>
      )}

      {activeUsers.length === 0 && (
        <span className="text-sm text-gray-500">No active users</span>
      )}
    </div>
  );
}
