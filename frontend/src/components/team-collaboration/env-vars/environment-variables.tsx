'use client';

import { useState } from 'react';
import { Lock, Plus, Eye, EyeOff, Trash2, Copy, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';

interface EnvVariable {
  id: number;
  key: string;
  value: string;
  encrypted: boolean;
  scope: 'organization' | 'project';
  created_at: string;
}

interface EnvironmentVariablesProps {
  projectId?: number;
  organizationId?: number;
}

export function EnvironmentVariables({ projectId, organizationId }: EnvironmentVariablesProps) {
  const [variables, setVariables] = useState<EnvVariable[]>([]);
  const [showValues, setShowValues] = useState<Set<number>>(new Set());
  const [copiedId, setCopiedId] = useState<number | null>(null);
  const [newKey, setNewKey] = useState('');
  const [newValue, setNewValue] = useState('');
  const [loading, setLoading] = useState(false);

  const toggleShowValue = (id: number) => {
    const newShow = new Set(showValues);
    if (newShow.has(id)) {
      newShow.delete(id);
    } else {
      newShow.add(id);
    }
    setShowValues(newShow);
  };

  const copyToClipboard = async (id: number, value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const handleAdd = async () => {
    if (!newKey.trim() || !newValue.trim()) return;

    try {
      setLoading(true);
      // API call would go here
      // await envVarsApi.create(...)
      
      setNewKey('');
      setNewValue('');
    } catch (err) {
      console.error('Failed to add variable:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this variable?')) return;

    try {
      // API call would go here
      // await envVarsApi.delete(id)
      setVariables(variables.filter((v) => v.id !== id));
    } catch (err) {
      console.error('Failed to delete variable:', err);
    }
  };

  const maskValue = (value: string) => {
    return '•'.repeat(Math.min(value.length, 20));
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Lock className="w-6 h-6" />
            Environment Variables
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            Manage encrypted secrets and configuration for your{' '}
            {projectId ? 'project' : 'organization'}
          </p>
        </div>
      </div>

      {/* Security Notice */}
      <Card className="p-4 bg-yellow-50 border-yellow-200">
        <div className="flex items-start gap-3">
          <Lock className="w-5 h-5 text-yellow-600 mt-0.5" />
          <div className="flex-1">
            <h4 className="font-medium text-yellow-900">Encrypted Storage</h4>
            <p className="text-sm text-yellow-700 mt-1">
              All values are encrypted at rest using AES-256-CBC encryption. Access is logged and
              audited.
            </p>
          </div>
        </div>
      </Card>

      {/* Add New Variable */}
      <Card className="p-4">
        <h3 className="font-semibold mb-3">Add New Variable</h3>
        <div className="grid grid-cols-2 gap-3">
          <Input
            placeholder="KEY_NAME"
            value={newKey}
            onChange={(e) => setNewKey(e.target.value.toUpperCase())}
            className="font-mono"
          />
          <Input
            type="password"
            placeholder="value"
            value={newValue}
            onChange={(e) => setNewValue(e.target.value)}
            className="font-mono"
          />
        </div>
        <div className="flex items-center gap-2 mt-3">
          <Button onClick={handleAdd} disabled={!newKey || !newValue || loading}>
            <Plus className="w-4 h-4 mr-2" />
            Add Variable
          </Button>
          <p className="text-xs text-gray-500">
            Use UPPER_SNAKE_CASE for key names
          </p>
        </div>
      </Card>

      {/* Variables List */}
      {variables.length === 0 ? (
        <Card className="p-8 text-center">
          <Lock className="w-12 h-12 mx-auto mb-4 text-gray-400" />
          <h3 className="text-lg font-medium mb-2">No variables yet</h3>
          <p className="text-gray-500 mb-4">
            Add environment variables to securely store secrets and configuration
          </p>
        </Card>
      ) : (
        <div className="space-y-2">
          {variables.map((variable) => {
            const isValueVisible = showValues.has(variable.id);
            const isCopied = copiedId === variable.id;

            return (
              <Card key={variable.id} className="p-4">
                <div className="flex items-center gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <code className="font-mono font-semibold text-sm">{variable.key}</code>
                      <Badge
                        variant={variable.scope === 'organization' ? 'default' : 'secondary'}
                        className="text-xs"
                      >
                        {variable.scope}
                      </Badge>
                      {variable.encrypted && (
                        <Lock className="w-3 h-3 text-gray-400" title="Encrypted" />
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <code className="font-mono text-sm text-gray-600">
                        {isValueVisible ? variable.value : maskValue(variable.value)}
                      </code>
                    </div>
                    <p className="text-xs text-gray-400 mt-1">
                      Created {new Date(variable.created_at).toLocaleDateString()}
                    </p>
                  </div>

                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleShowValue(variable.id)}
                      title={isValueVisible ? 'Hide value' : 'Show value'}
                    >
                      {isValueVisible ? (
                        <EyeOff className="w-4 h-4" />
                      ) : (
                        <Eye className="w-4 h-4" />
                      )}
                    </Button>

                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => copyToClipboard(variable.id, variable.value)}
                      title="Copy to clipboard"
                    >
                      {isCopied ? (
                        <Check className="w-4 h-4 text-green-500" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                    </Button>

                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(variable.id)}
                      className="text-red-600 hover:text-red-700"
                      title="Delete variable"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
