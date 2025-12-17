'use client';

import { useState } from 'react';
import { GitMerge, AlertTriangle, Check, X, ChevronDown, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface ConflictFile {
  path: string;
  conflicts: Conflict[];
}

interface Conflict {
  lineNumber: number;
  baseContent: string;
  sourceContent: string;
  targetContent: string;
  resolution?: 'source' | 'target' | 'manual';
  manualContent?: string;
}

interface MergeConflictResolverProps {
  files: ConflictFile[];
  onResolve: (resolutions: Record<string, Conflict[]>) => void;
  onCancel: () => void;
}

export function MergeConflictResolver({
  files: initialFiles,
  onResolve,
  onCancel,
}: MergeConflictResolverProps) {
  const [files, setFiles] = useState<ConflictFile[]>(initialFiles);
  const [expandedFiles, setExpandedFiles] = useState<Set<string>>(new Set(initialFiles.map(f => f.path)));
  const [expandedConflicts, setExpandedConflicts] = useState<Set<string>>(new Set());

  const toggleFile = (path: string) => {
    const newExpanded = new Set(expandedFiles);
    if (newExpanded.has(path)) {
      newExpanded.delete(path);
    } else {
      newExpanded.add(path);
    }
    setExpandedFiles(newExpanded);
  };

  const toggleConflict = (fileIndex: number, conflictIndex: number) => {
    const key = `${fileIndex}-${conflictIndex}`;
    const newExpanded = new Set(expandedConflicts);
    if (newExpanded.has(key)) {
      newExpanded.delete(key);
    } else {
      newExpanded.add(key);
    }
    setExpandedConflicts(newExpanded);
  };

  const resolveConflict = (
    fileIndex: number,
    conflictIndex: number,
    resolution: 'source' | 'target'
  ) => {
    const newFiles = [...files];
    newFiles[fileIndex].conflicts[conflictIndex].resolution = resolution;
    setFiles(newFiles);
  };

  const setManualResolution = (fileIndex: number, conflictIndex: number, content: string) => {
    const newFiles = [...files];
    newFiles[fileIndex].conflicts[conflictIndex].resolution = 'manual';
    newFiles[fileIndex].conflicts[conflictIndex].manualContent = content;
    setFiles(newFiles);
  };

  const getTotalConflicts = () => {
    return files.reduce((sum, file) => sum + file.conflicts.length, 0);
  };

  const getResolvedConflicts = () => {
    return files.reduce(
      (sum, file) => sum + file.conflicts.filter((c) => c.resolution).length,
      0
    );
  };

  const allResolved = getTotalConflicts() === getResolvedConflicts();

  const handleResolve = () => {
    const resolutions: Record<string, Conflict[]> = {};
    files.forEach((file) => {
      resolutions[file.path] = file.conflicts;
    });
    onResolve(resolutions);
  };

  return (
    <div className="space-y-4">
      <Card className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-6 h-6 text-orange-500" />
            <div>
              <h2 className="text-2xl font-bold">Merge Conflicts</h2>
              <p className="text-sm text-gray-500">
                {getResolvedConflicts()} of {getTotalConflicts()} conflicts resolved
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onCancel}>
              Cancel
            </Button>
            <Button onClick={handleResolve} disabled={!allResolved}>
              <GitMerge className="w-4 h-4 mr-2" />
              Complete Merge
            </Button>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mb-6">
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-green-500 h-2 rounded-full transition-all"
              style={{
                width: `${(getResolvedConflicts() / getTotalConflicts()) * 100}%`,
              }}
            />
          </div>
        </div>

        {/* Files List */}
        <div className="space-y-3">
          {files.map((file, fileIndex) => {
            const isExpanded = expandedFiles.has(file.path);
            const fileResolved = file.conflicts.every((c) => c.resolution);

            return (
              <Card key={file.path} className={`overflow-hidden ${fileResolved ? 'border-green-200' : ''}`}>
                <div
                  className="p-4 cursor-pointer hover:bg-gray-50 flex items-center justify-between"
                  onClick={() => toggleFile(file.path)}
                >
                  <div className="flex items-center gap-2">
                    {isExpanded ? (
                      <ChevronDown className="w-4 h-4" />
                    ) : (
                      <ChevronRight className="w-4 h-4" />
                    )}
                    <code className="font-mono text-sm">{file.path}</code>
                    <Badge variant={fileResolved ? 'default' : 'destructive'}>
                      {file.conflicts.filter((c) => c.resolution).length}/{file.conflicts.length}
                    </Badge>
                  </div>
                  {fileResolved && <Check className="w-5 h-5 text-green-500" />}
                </div>

                {isExpanded && (
                  <div className="border-t">
                    {file.conflicts.map((conflict, conflictIndex) => {
                      const conflictKey = `${fileIndex}-${conflictIndex}`;
                      const isConflictExpanded = expandedConflicts.has(conflictKey);

                      return (
                        <div key={conflictIndex} className="border-b last:border-b-0">
                          <div
                            className="p-3 bg-gray-50 cursor-pointer flex items-center justify-between"
                            onClick={() => toggleConflict(fileIndex, conflictIndex)}
                          >
                            <div className="flex items-center gap-2">
                              {isConflictExpanded ? (
                                <ChevronDown className="w-4 h-4" />
                              ) : (
                                <ChevronRight className="w-4 h-4" />
                              )}
                              <span className="text-sm font-medium">
                                Conflict at line {conflict.lineNumber}
                              </span>
                            </div>
                            {conflict.resolution && (
                              <Badge variant="outline" className="text-xs">
                                {conflict.resolution === 'manual'
                                  ? 'Manual'
                                  : conflict.resolution === 'source'
                                  ? 'Source'
                                  : 'Target'}
                              </Badge>
                            )}
                          </div>

                          {isConflictExpanded && (
                            <div className="p-4 space-y-3">
                              {/* Base Version */}
                              <div className="border rounded-lg overflow-hidden">
                                <div className="bg-gray-100 px-3 py-2 text-sm font-medium">
                                  Base (Original)
                                </div>
                                <pre className="p-3 text-sm bg-white overflow-x-auto">
                                  {conflict.baseContent}
                                </pre>
                              </div>

                              {/* Source Version */}
                              <div className="border border-blue-200 rounded-lg overflow-hidden">
                                <div className="bg-blue-50 px-3 py-2 flex items-center justify-between">
                                  <span className="text-sm font-medium text-blue-900">
                                    Source (Your Changes)
                                  </span>
                                  <Button
                                    size="sm"
                                    variant={conflict.resolution === 'source' ? 'default' : 'outline'}
                                    onClick={() => resolveConflict(fileIndex, conflictIndex, 'source')}
                                  >
                                    {conflict.resolution === 'source' ? (
                                      <Check className="w-4 h-4 mr-1" />
                                    ) : null}
                                    Use This
                                  </Button>
                                </div>
                                <pre className="p-3 text-sm bg-white overflow-x-auto">
                                  {conflict.sourceContent}
                                </pre>
                              </div>

                              {/* Target Version */}
                              <div className="border border-green-200 rounded-lg overflow-hidden">
                                <div className="bg-green-50 px-3 py-2 flex items-center justify-between">
                                  <span className="text-sm font-medium text-green-900">
                                    Target (Incoming Changes)
                                  </span>
                                  <Button
                                    size="sm"
                                    variant={conflict.resolution === 'target' ? 'default' : 'outline'}
                                    onClick={() => resolveConflict(fileIndex, conflictIndex, 'target')}
                                  >
                                    {conflict.resolution === 'target' ? (
                                      <Check className="w-4 h-4 mr-1" />
                                    ) : null}
                                    Use This
                                  </Button>
                                </div>
                                <pre className="p-3 text-sm bg-white overflow-x-auto">
                                  {conflict.targetContent}
                                </pre>
                              </div>

                              {/* Manual Resolution */}
                              <div className="border border-purple-200 rounded-lg overflow-hidden">
                                <div className="bg-purple-50 px-3 py-2 text-sm font-medium text-purple-900">
                                  Manual Resolution
                                </div>
                                <textarea
                                  className="w-full p-3 text-sm font-mono border-0 focus:outline-none focus:ring-2 focus:ring-purple-500"
                                  rows={4}
                                  placeholder="Or edit manually..."
                                  value={conflict.manualContent || ''}
                                  onChange={(e) =>
                                    setManualResolution(fileIndex, conflictIndex, e.target.value)
                                  }
                                />
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      </Card>
    </div>
  );
}
