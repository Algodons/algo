'use client';

import { useState, useEffect } from 'react';
import { UserPlus, Mail, Shield, Trash2, MoreVertical } from 'lucide-react';
import { OrganizationMember, OrganizationRole } from '@/lib/types/collaboration';
import { memberApi } from '@/lib/team-api';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';

interface TeamMembersProps {
  organizationId: number;
}

const ROLE_COLORS: Record<OrganizationRole, string> = {
  owner: 'bg-purple-100 text-purple-800',
  admin: 'bg-blue-100 text-blue-800',
  developer: 'bg-green-100 text-green-800',
  viewer: 'bg-gray-100 text-gray-800',
};

const ROLE_DESCRIPTIONS: Record<OrganizationRole, string> = {
  owner: 'Full access to all settings and billing',
  admin: 'Manage members, projects, and settings',
  developer: 'Create and manage projects',
  viewer: 'Read-only access',
};

export function TeamMembers({ organizationId }: TeamMembersProps) {
  const [members, setMembers] = useState<OrganizationMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<OrganizationRole>('developer');
  const [showInviteDialog, setShowInviteDialog] = useState(false);

  useEffect(() => {
    loadMembers();
  }, [organizationId]);

  const loadMembers = async () => {
    try {
      setLoading(true);
      const teamMembers = await memberApi.list(organizationId);
      setMembers(teamMembers);
    } catch (err) {
      console.error('Failed to load members:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleInvite = async () => {
    if (!inviteEmail.trim()) return;

    try {
      await memberApi.invite(organizationId, {
        email: inviteEmail,
        role: inviteRole,
      });
      setInviteEmail('');
      setShowInviteDialog(false);
      await loadMembers();
    } catch (err) {
      console.error('Failed to invite member:', err);
    }
  };

  const handleRoleChange = async (userId: number, newRole: OrganizationRole) => {
    try {
      await memberApi.updateRole(organizationId, userId, newRole);
      await loadMembers();
    } catch (err) {
      console.error('Failed to update role:', err);
    }
  };

  const handleRemove = async (userId: number) => {
    if (!confirm('Are you sure you want to remove this member?')) return;

    try {
      await memberApi.remove(organizationId, userId);
      await loadMembers();
    } catch (err) {
      console.error('Failed to remove member:', err);
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
          <h2 className="text-2xl font-bold">Team Members</h2>
          <p className="text-sm text-gray-500 mt-1">
            {members.length} {members.length === 1 ? 'member' : 'members'}
          </p>
        </div>
        
        <Dialog open={showInviteDialog} onOpenChange={setShowInviteDialog}>
          <DialogTrigger asChild>
            <Button>
              <UserPlus className="w-4 h-4 mr-2" />
              Invite Member
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Invite Team Member</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Email Address</label>
                <Input
                  type="email"
                  placeholder="colleague@example.com"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">Role</label>
                <select
                  className="w-full border rounded-md p-2"
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value as OrganizationRole)}
                >
                  {Object.entries(ROLE_DESCRIPTIONS).map(([role, description]) => (
                    <option key={role} value={role}>
                      {role.charAt(0).toUpperCase() + role.slice(1)} - {description}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex gap-2">
                <Button onClick={handleInvite} className="flex-1">
                  <Mail className="w-4 h-4 mr-2" />
                  Send Invitation
                </Button>
                <Button variant="outline" onClick={() => setShowInviteDialog(false)}>
                  Cancel
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="space-y-3">
        {members.map((member) => (
          <Card key={member.id} className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4 flex-1">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <span className="text-lg font-semibold text-primary">
                    {(member.user_name || member.user_email || 'U')
                      .substring(0, 2)
                      .toUpperCase()}
                  </span>
                </div>

                <div className="flex-1">
                  <div className="font-medium">{member.user_name || 'Unknown User'}</div>
                  <div className="text-sm text-gray-500">{member.user_email}</div>
                  {member.status === 'pending' && (
                    <Badge variant="outline" className="mt-1 text-xs">
                      Invitation Pending
                    </Badge>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Badge className={ROLE_COLORS[member.role]}>
                  <Shield className="w-3 h-3 mr-1" />
                  {member.role.charAt(0).toUpperCase() + member.role.slice(1)}
                </Badge>

                {member.role !== 'owner' && (
                  <div className="flex items-center gap-1">
                    <select
                      className="text-sm border rounded px-2 py-1"
                      value={member.role}
                      onChange={(e) =>
                        handleRoleChange(member.user_id, e.target.value as OrganizationRole)
                      }
                      onClick={(e) => e.stopPropagation()}
                    >
                      {(Object.keys(ROLE_DESCRIPTIONS) as OrganizationRole[])
                        .filter((r) => r !== 'owner')
                        .map((role) => (
                          <option key={role} value={role}>
                            {role.charAt(0).toUpperCase() + role.slice(1)}
                          </option>
                        ))}
                    </select>

                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemove(member.user_id)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
