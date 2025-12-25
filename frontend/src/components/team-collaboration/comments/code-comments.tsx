'use client';

import { useState, useEffect } from 'react';
import { MessageSquare, Check, X, Send } from 'lucide-react';
import { CodeComment } from '@/lib/types/collaboration';
import { commentsApi } from '@/lib/team-api';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';

interface CodeCommentsProps {
  projectId: number;
  filePath?: string;
}

export function CodeComments({ projectId, filePath }: CodeCommentsProps) {
  const [comments, setComments] = useState<CodeComment[]>([]);
  const [loading, setLoading] = useState(true);
  const [showResolved, setShowResolved] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [selectedLine, setSelectedLine] = useState<number | null>(null);

  useEffect(() => {
    loadComments();
  }, [projectId, filePath, showResolved]);

  const loadComments = async () => {
    try {
      setLoading(true);
      const allComments = await commentsApi.list(projectId, filePath);
      const filtered = showResolved
        ? allComments
        : allComments.filter((c) => !c.resolved);
      setComments(filtered);
    } catch (err) {
      console.error('Failed to load comments:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddComment = async () => {
    if (!newComment.trim() || selectedLine === null) return;

    try {
      await commentsApi.create(projectId, {
        filePath: filePath || '',
        lineNumber: selectedLine,
        content: newComment,
      });
      setNewComment('');
      setSelectedLine(null);
      await loadComments();
    } catch (err) {
      console.error('Failed to add comment:', err);
    }
  };

  const handleResolve = async (commentId: number) => {
    try {
      await commentsApi.resolve(commentId);
      await loadComments();
    } catch (err) {
      console.error('Failed to resolve comment:', err);
    }
  };

  const groupedComments = comments.reduce((acc, comment) => {
    const key = `${comment.file_path}:${comment.line_number}`;
    if (!acc[key]) {
      acc[key] = [];
    }
    acc[key].push(comment);
    return acc;
  }, {} as Record<string, CodeComment[]>);

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
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <MessageSquare className="w-5 h-5" />
          Code Comments
        </h3>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowResolved(!showResolved)}
        >
          {showResolved ? 'Hide' : 'Show'} Resolved
        </Button>
      </div>

      {/* New Comment Form */}
      {filePath && (
        <Card className="p-4 bg-blue-50">
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Input
                type="number"
                placeholder="Line number"
                value={selectedLine || ''}
                onChange={(e) => setSelectedLine(parseInt(e.target.value) || null)}
                className="w-32"
              />
              <Input
                placeholder="Add a comment..."
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddComment()}
              />
              <Button onClick={handleAddComment} size="sm">
                <Send className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Comments List */}
      {Object.keys(groupedComments).length === 0 ? (
        <Card className="p-8 text-center">
          <MessageSquare className="w-12 h-12 mx-auto mb-4 text-gray-400" />
          <h3 className="text-lg font-medium mb-2">No comments</h3>
          <p className="text-gray-500">
            {showResolved
              ? 'No comments found'
              : 'No unresolved comments. Toggle to show resolved comments.'}
          </p>
        </Card>
      ) : (
        <div className="space-y-4">
          {Object.entries(groupedComments).map(([location, locationComments]) => {
            const [file, line] = location.split(':');
            const isResolved = locationComments.every((c) => c.resolved);

            return (
              <Card
                key={location}
                className={`p-4 ${isResolved ? 'opacity-60' : ''}`}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <code className="text-sm font-mono bg-gray-100 px-2 py-1 rounded">
                        {file}
                      </code>
                      <Badge variant="outline" className="text-xs">
                        Line {line}
                      </Badge>
                      {isResolved && (
                        <Badge variant="secondary" className="text-xs">
                          <Check className="w-3 h-3 mr-1" />
                          Resolved
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  {locationComments.map((comment) => (
                    <div
                      key={comment.id}
                      className="flex items-start gap-3 pl-4 border-l-2 border-gray-200"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium text-sm">
                            {comment.user_name || 'Unknown'}
                          </span>
                          <span className="text-xs text-gray-500">
                            {new Date(comment.created_at).toLocaleString()}
                          </span>
                        </div>
                        <p className="text-sm text-gray-700">{comment.content}</p>
                      </div>

                      {!comment.resolved && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleResolve(comment.id)}
                          title="Mark as resolved"
                        >
                          <Check className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
