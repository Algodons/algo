'use client';

import { useState, useEffect } from 'react';
import { Shield, Users, User, Plus, Trash2 } from 'lucide-react';
import { ProjectPermissions } from '@/lib/types/collaboration';
import { permissionsApi } from '@/lib/team-api';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface ProjectPermissionsManagerProps {
  projectId: number;
}

export function ProjectPermissionsManager({ projectId }: ProjectPermissionsManagerProps) {
  const [permissions, setPermissions] = useState<ProjectPermissions[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPermissions();
  }, [projectId]);

  const loadPermissions = async () => {
    try {
      setLoading(true);
      const perms = await permissionsApi.list(projectId);
      setPermissions(perms);
    } catch (err) {
      console.error('Failed to load permissions:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleTogglePermission = async (
    permId: number,
    permType: 'read' | 'write' | 'deploy' | 'admin',
    currentValue: boolean
  ) => {
    // Update locally optimistically
    const perm = permissions.find((p) => p.id === permId);
    if (!perm) return;

    const updatedPerms = {
      ...perm.permissions,
      [permType]: !currentValue,
    };

    try {
      await permissionsApi.set(projectId, {
        userId: perm.user_id,
        organizationId: perm.organization_id,
        permissions: updatedPerms,
      });
      await loadPermissions();
    } catch (err) {
      console.error('Failed to update permission:', err);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Shield className="w-6 h-6" />
            Project Permissions
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            Manage who can access and modify this project
          </p>
        </div>
        <Button>
          <Plus className="w-4 h-4 mr-2" />
          Add Permission
        </Button>
      </div>

      {/* Permission Types Legend */}
      <Card className="p-4 bg-blue-50">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <span className="font-semibold">Read:</span> View files and code
          </div>
          <div>
            <span className="font-semibold">Write:</span> Edit and commit code
          </div>
          <div>
            <span className="font-semibold">Deploy:</span> Deploy to environments
          </div>
          <div>
            <span className="font-semibold">Admin:</span> Manage project settings
          </div>
        </div>
      </Card>

      {/* Permissions List */}
      {permissions.length === 0 ? (
        <Card className="p-8 text-center">
          <Shield className="w-12 h-12 mx-auto mb-4 text-gray-400" />
          <h3 className="text-lg font-medium mb-2">No permissions set</h3>
          <p className="text-gray-500 mb-4">
            Add permissions to control access to this project
          </p>
          <Button>
            <Plus className="w-4 h-4 mr-2" />
            Add First Permission
          </Button>
        </Card>
      ) : (
        <div className="space-y-3">
          {permissions.map((perm) => (
            <Card key={perm.id} className="p-4">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  {perm.organization_id ? (
                    <Users className="w-5 h-5 text-primary" />
                  ) : (
                    <User className="w-5 h-5 text-primary" />
                  )}
                </div>

                <div className="flex-1">
                  <div className="font-medium">
                    {perm.organization_id
                      ? `Organization #${perm.organization_id}`
                      : `User #${perm.user_id}`}
                  </div>
                  <div className="text-sm text-gray-500">
                    Granted {new Date(perm.granted_at).toLocaleDateString()}
                    {perm.expires_at && (
                      <> • Expires {new Date(perm.expires_at).toLocaleDateString()}</>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {(['read', 'write', 'deploy', 'admin'] as const).map((permType) => (
                    <label
                      key={permType}
                      className="flex items-center gap-2 cursor-pointer px-3 py-2 rounded-md hover:bg-gray-50"
                    >
                      <input
                        type="checkbox"
                        checked={perm.permissions[permType]}
                        onChange={() =>
                          handleTogglePermission(
                            perm.id,
                            permType,
                            perm.permissions[permType]
                          )
                        }
                        className="w-4 h-4"
                      />
                      <span className="text-sm font-medium capitalize">{permType}</span>
                    </label>
                  ))}

                  <Button variant="ghost" size="sm" className="text-red-600 hover:text-red-700">
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
