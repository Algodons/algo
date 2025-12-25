'use client';

import { useState, useEffect } from 'react';
import { GitBranch, GitPullRequest, X } from 'lucide-react';
import { CreatePullRequestRequest } from '@/lib/types/collaboration';
import { pullRequestApi } from '@/lib/team-api';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';

interface CreatePullRequestProps {
  projectId: number;
  branches: string[];
  onSuccess?: () => void;
  onCancel?: () => void;
}

export function CreatePullRequest({
  projectId,
  branches,
  onSuccess,
  onCancel,
}: CreatePullRequestProps) {
  const [formData, setFormData] = useState<CreatePullRequestRequest>({
    title: '',
    description: '',
    sourceBranch: '',
    targetBranch: 'main',
    labels: [],
  });
  const [labelInput, setLabelInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!formData.title.trim()) {
      setError('Title is required');
      return;
    }

    if (!formData.sourceBranch || !formData.targetBranch) {
      setError('Source and target branches are required');
      return;
    }

    if (formData.sourceBranch === formData.targetBranch) {
      setError('Source and target branches must be different');
      return;
    }

    try {
      setLoading(true);
      await pullRequestApi.create(projectId, formData);
      onSuccess?.();
    } catch (err) {
      setError('Failed to create pull request');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const addLabel = () => {
    if (labelInput.trim() && !formData.labels?.includes(labelInput.trim())) {
      setFormData({
        ...formData,
        labels: [...(formData.labels || []), labelInput.trim()],
      });
      setLabelInput('');
    }
  };

  const removeLabel = (label: string) => {
    setFormData({
      ...formData,
      labels: formData.labels?.filter((l) => l !== label),
    });
  };

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <GitPullRequest className="w-6 h-6 text-primary" />
          <h2 className="text-2xl font-bold">Create Pull Request</h2>
        </div>
        {onCancel && (
          <Button variant="ghost" size="sm" onClick={onCancel}>
            <X className="w-4 h-4" />
          </Button>
        )}
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Branch Selection */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium mb-2 block">Source Branch</label>
            <select
              className="w-full border rounded-md p-2"
              value={formData.sourceBranch}
              onChange={(e) => setFormData({ ...formData, sourceBranch: e.target.value })}
              required
            >
              <option value="">Select source branch</option>
              {branches.map((branch) => (
                <option key={branch} value={branch}>
                  {branch}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-sm font-medium mb-2 block">Target Branch</label>
            <select
              className="w-full border rounded-md p-2"
              value={formData.targetBranch}
              onChange={(e) => setFormData({ ...formData, targetBranch: e.target.value })}
              required
            >
              <option value="">Select target branch</option>
              {branches.map((branch) => (
                <option key={branch} value={branch}>
                  {branch}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Branch Visualization */}
        {formData.sourceBranch && formData.targetBranch && (
          <div className="p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center justify-center gap-4 font-mono text-sm">
              <div className="flex items-center gap-2">
                <GitBranch className="w-4 h-4 text-blue-500" />
                <span className="font-semibold text-blue-700">{formData.sourceBranch}</span>
              </div>
              <span className="text-gray-400">→</span>
              <div className="flex items-center gap-2">
                <GitBranch className="w-4 h-4 text-green-500" />
                <span className="font-semibold text-green-700">{formData.targetBranch}</span>
              </div>
            </div>
          </div>
        )}

        {/* Title */}
        <div>
          <label className="text-sm font-medium mb-2 block">
            Title <span className="text-red-500">*</span>
          </label>
          <Input
            placeholder="Brief description of changes"
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            required
          />
        </div>

        {/* Description */}
        <div>
          <label className="text-sm font-medium mb-2 block">Description</label>
          <textarea
            className="w-full border rounded-md p-3 min-h-[120px]"
            placeholder="Detailed description of your changes..."
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          />
          <p className="text-xs text-gray-500 mt-1">
            Support for markdown formatting
          </p>
        </div>

        {/* Labels */}
        <div>
          <label className="text-sm font-medium mb-2 block">Labels</label>
          <div className="flex gap-2 mb-2">
            <Input
              placeholder="Add label"
              value={labelInput}
              onChange={(e) => setLabelInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  addLabel();
                }
              }}
            />
            <Button type="button" variant="outline" onClick={addLabel}>
              Add
            </Button>
          </div>
          {formData.labels && formData.labels.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {formData.labels.map((label) => (
                <Badge key={label} variant="secondary" className="gap-1">
                  {label}
                  <button
                    type="button"
                    onClick={() => removeLabel(label)}
                    className="hover:text-red-600"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </Badge>
              ))}
            </div>
          )}
        </div>

        {/* Milestone (Optional) */}
        <div>
          <label className="text-sm font-medium mb-2 block">Milestone (Optional)</label>
          <Input
            placeholder="e.g., v1.0.0"
            value={formData.milestone || ''}
            onChange={(e) => setFormData({ ...formData, milestone: e.target.value })}
          />
        </div>

        {/* Error Message */}
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-md text-red-700 text-sm">
            {error}
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3 pt-4 border-t">
          <Button type="submit" disabled={loading} className="flex-1">
            {loading ? 'Creating...' : 'Create Pull Request'}
          </Button>
          {onCancel && (
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancel
            </Button>
          )}
        </div>
      </form>
    </Card>
  );
}
