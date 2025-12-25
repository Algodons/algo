'use client';

import { useState, useEffect } from 'react';
import { Plus, Users, Settings, Calendar } from 'lucide-react';
import { Organization } from '@/lib/types/collaboration';
import { organizationApi } from '@/lib/team-api';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

export function OrganizationList() {
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadOrganizations();
  }, []);

  const loadOrganizations = async () => {
    try {
      setLoading(true);
      const orgs = await organizationApi.list();
      setOrganizations(orgs);
    } catch (err) {
      setError('Failed to load organizations');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 text-red-500 bg-red-50 rounded-lg">
        {error}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Organizations</h2>
        <Button>
          <Plus className="w-4 h-4 mr-2" />
          Create Organization
        </Button>
      </div>

      {organizations.length === 0 ? (
        <Card className="p-8 text-center">
          <Users className="w-12 h-12 mx-auto mb-4 text-gray-400" />
          <h3 className="text-lg font-medium mb-2">No organizations yet</h3>
          <p className="text-gray-500 mb-4">
            Create an organization to collaborate with your team
          </p>
          <Button>
            <Plus className="w-4 h-4 mr-2" />
            Create Your First Organization
          </Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {organizations.map((org) => (
            <Card key={org.id} className="p-6 hover:shadow-lg transition-shadow cursor-pointer">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <h3 className="text-lg font-semibold mb-1">{org.name}</h3>
                  <p className="text-sm text-gray-500">@{org.slug}</p>
                </div>
                <Button variant="ghost" size="sm">
                  <Settings className="w-4 h-4" />
                </Button>
              </div>
              
              {org.description && (
                <p className="text-sm text-gray-600 mb-4 line-clamp-2">
                  {org.description}
                </p>
              )}

              <div className="flex items-center justify-between text-xs text-gray-500">
                <div className="flex items-center">
                  <Users className="w-3 h-3 mr-1" />
                  <span>Members</span>
                </div>
                <div className="flex items-center">
                  <Calendar className="w-3 h-3 mr-1" />
                  <span>{new Date(org.created_at).toLocaleDateString()}</span>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
