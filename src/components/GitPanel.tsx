import React, { useState } from 'react';
import './GitPanel.css';

interface GitPanelProps {
  workspaceId: string;
}

const GitPanel: React.FC<GitPanelProps> = ({ workspaceId }) => {
  const [repoUrl, setRepoUrl] = useState('');
  const [commitMessage, setCommitMessage] = useState('');
  const [currentBranch, setCurrentBranch] = useState('main');
  const [status, setStatus] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const clone = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/git/clone', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: repoUrl, workspaceId })
      });
      const data = await response.json();
      setMessage(data.success ? 'Repository cloned successfully' : data.error);
    } catch (error) {
      setMessage('Failed to clone repository');
    }
    setLoading(false);
  };

  const getStatus = async () => {
    try {
      const response = await fetch(`/api/git/status?workspaceId=${workspaceId}`);
      const data = await response.json();
      if (data.success) {
        setStatus(data.status);
        setCurrentBranch(data.status.current);
      }
    } catch (error) {
      console.error('Failed to get status:', error);
    }
  };

  const commit = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/git/commit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workspaceId, message: commitMessage })
      });
      const data = await response.json();
      setMessage(data.success ? 'Changes committed' : data.error);
      setCommitMessage('');
      getStatus();
    } catch (error) {
      setMessage('Failed to commit');
    }
    setLoading(false);
  };

  const push = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/git/push', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workspaceId })
      });
      const data = await response.json();
      setMessage(data.success ? 'Changes pushed' : data.error);
    } catch (error) {
      setMessage('Failed to push');
    }
    setLoading(false);
  };

  const pull = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/git/pull', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workspaceId })
      });
      const data = await response.json();
      setMessage(data.success ? 'Changes pulled' : data.error);
      getStatus();
    } catch (error) {
      setMessage('Failed to pull');
    }
    setLoading(false);
  };

  return (
    <div className="git-panel panel">
      <div className="panel-title">Git</div>
      
      <div className="git-section">
        <input
          type="text"
          placeholder="Repository URL"
          value={repoUrl}
          onChange={(e) => setRepoUrl(e.target.value)}
        />
        <button className="btn" onClick={clone} disabled={loading}>
          Clone Repository
        </button>
      </div>

      <div className="git-section">
        <button className="btn" onClick={getStatus}>
          Refresh Status
        </button>
        {status && (
          <div className="git-status">
            <p>Branch: <strong>{currentBranch}</strong></p>
            <p>Modified: {status.modified?.length || 0}</p>
            <p>Staged: {status.staged?.length || 0}</p>
          </div>
        )}
      </div>

      <div className="git-section">
        <input
          type="text"
          placeholder="Commit message"
          value={commitMessage}
          onChange={(e) => setCommitMessage(e.target.value)}
        />
        <button className="btn" onClick={commit} disabled={loading}>
          Commit
        </button>
      </div>

      <div className="git-section">
        <button className="btn" onClick={push} disabled={loading}>
          Push
        </button>
        <button className="btn" onClick={pull} disabled={loading}>
          Pull
        </button>
      </div>

      {message && (
        <div className={message.includes('Failed') ? 'error' : 'success'}>
          {message}
        </div>
      )}
    </div>
  );
};

export default GitPanel;
