import React, { useState, useEffect } from 'react';
import './PreviewPanel.css';

interface PreviewPanelProps {
  workspaceId: string;
}

const PreviewPanel: React.FC<PreviewPanelProps> = ({ workspaceId }) => {
  const [previewUrl, setPreviewUrl] = useState('/api/preview/' + workspaceId + '/index.html');
  const [isWatching, setIsWatching] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const startWatching = async () => {
    try {
      const response = await fetch('/api/preview/watch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workspaceId })
      });
      const data = await response.json();
      if (data.success) {
        setIsWatching(true);
      }
    } catch (error) {
      console.error('Failed to start watching:', error);
    }
  };

  const stopWatching = async () => {
    try {
      const response = await fetch('/api/preview/unwatch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workspaceId })
      });
      const data = await response.json();
      if (data.success) {
        setIsWatching(false);
      }
    } catch (error) {
      console.error('Failed to stop watching:', error);
    }
  };

  const refresh = () => {
    setRefreshKey(prev => prev + 1);
  };

  useEffect(() => {
    startWatching();
    return () => {
      stopWatching();
    };
  }, [workspaceId]);

  return (
    <div className="preview-panel">
      <div className="preview-header">
        <span>Live Preview</span>
        <div className="preview-controls">
          <input
            type="text"
            className="preview-url"
            value={previewUrl}
            onChange={(e) => setPreviewUrl(e.target.value)}
          />
          <button className="btn-small" onClick={refresh}>
            🔄
          </button>
          <span className={`watch-status ${isWatching ? 'watching' : ''}`}>
            {isWatching ? '👁️ Watching' : '👁️‍🗨️ Not watching'}
          </span>
        </div>
      </div>
      <iframe
        key={refreshKey}
        src={previewUrl}
        className="preview-iframe"
        sandbox="allow-scripts allow-same-origin allow-forms allow-modals"
        title="Preview"
      />
    </div>
  );
};

export default PreviewPanel;
