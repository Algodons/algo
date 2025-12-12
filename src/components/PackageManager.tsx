import React, { useState, useEffect } from 'react';
import './PackageManager.css';

interface PackageManagerProps {
  workspaceId: string;
}

const PackageManager: React.FC<PackageManagerProps> = ({ workspaceId }) => {
  const [packageManager, setPackageManager] = useState<'npm' | 'pip' | 'cargo'>('npm');
  const [packageName, setPackageName] = useState('');
  const [packages, setPackages] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const install = async () => {
    if (!packageName.trim()) return;
    
    setLoading(true);
    try {
      const response = await fetch(`/api/package/${packageManager}/install`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workspaceId, packages: packageName })
      });
      const data = await response.json();
      setMessage(data.success ? 'Package installed' : data.error);
      setPackageName('');
      listPackages();
    } catch (error) {
      setMessage('Failed to install package');
    }
    setLoading(false);
  };

  const uninstall = async (pkg: string) => {
    setLoading(true);
    try {
      const response = await fetch(`/api/package/${packageManager}/uninstall`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workspaceId, packages: pkg })
      });
      const data = await response.json();
      setMessage(data.success ? 'Package uninstalled' : data.error);
      listPackages();
    } catch (error) {
      setMessage('Failed to uninstall package');
    }
    setLoading(false);
  };

  const listPackages = async () => {
    try {
      const response = await fetch(`/api/package/${packageManager}/list?workspaceId=${workspaceId}`);
      const data = await response.json();
      if (data.success) {
        setPackages(Array.isArray(data.packages) ? data.packages : []);
      }
    } catch (error) {
      console.error('Failed to list packages:', error);
    }
  };

  useEffect(() => {
    listPackages();
  }, [packageManager, workspaceId]);

  return (
    <div className="package-manager panel">
      <div className="panel-title">Package Manager</div>
      
      <div className="pm-section">
        <select 
          value={packageManager} 
          onChange={(e) => setPackageManager(e.target.value as any)}
        >
          <option value="npm">npm</option>
          <option value="pip">pip</option>
          <option value="cargo">cargo</option>
        </select>
      </div>

      <div className="pm-section">
        <input
          type="text"
          placeholder="Package name"
          value={packageName}
          onChange={(e) => setPackageName(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && install()}
        />
        <button className="btn" onClick={install} disabled={loading}>
          Install
        </button>
      </div>

      {message && (
        <div className={message.includes('Failed') ? 'error' : 'success'}>
          {message}
        </div>
      )}

      <div className="package-list">
        <div className="package-list-header">
          <span>Installed Packages</span>
          <button className="btn-small" onClick={listPackages}>
            Refresh
          </button>
        </div>
        {packages.length > 0 ? (
          <ul>
            {packages.slice(0, 10).map((pkg: any, idx) => (
              <li key={idx}>
                <span>{pkg.name || pkg}</span>
                <button 
                  className="btn-remove"
                  onClick={() => uninstall(pkg.name || pkg)}
                >
                  ×
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <div className="empty-state">No packages installed</div>
        )}
      </div>
    </div>
  );
};

export default PackageManager;
