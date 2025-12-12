import React, { useState, useEffect } from 'react';
import './MigrationManager.css';

interface MigrationManagerProps {
  connectionId: string;
}

interface Migration {
  id: string;
  name: string;
  version: number;
  status: 'pending' | 'applied' | 'failed' | 'rolled_back';
  up: string;
  down: string;
  createdAt: string;
  appliedAt?: string;
}

const MigrationManager: React.FC<MigrationManagerProps> = ({ connectionId }) => {
  const [migrations, setMigrations] = useState<Migration[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newMigration, setNewMigration] = useState({
    name: '',
    up: '',
    down: '',
  });
  const [expandedMigration, setExpandedMigration] = useState<string | null>(null);

  useEffect(() => {
    if (connectionId) {
      fetchMigrations();
    }
  }, [connectionId]);

  const fetchMigrations = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch(
        `http://localhost:4000/api/databases/connections/${connectionId}/migrations`
      );
      const data = await response.json();
      
      if (data.error) {
        setError(data.error);
      } else {
        setMigrations(data.migrations || []);
      }
    } catch (error) {
      console.error('Failed to fetch migrations:', error);
      setError('Failed to load migrations');
    } finally {
      setLoading(false);
    }
  };

  const createMigration = async () => {
    if (!newMigration.name || !newMigration.up || !newMigration.down) {
      setError('Please fill in all fields');
      return;
    }

    setLoading(true);
    setError('');
    try {
      const response = await fetch(
        `http://localhost:4000/api/databases/connections/${connectionId}/migrations`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(newMigration),
        }
      );

      const data = await response.json();
      
      if (data.error) {
        setError(data.error);
      } else {
        setNewMigration({ name: '', up: '', down: '' });
        setShowCreateForm(false);
        fetchMigrations();
      }
    } catch (error) {
      console.error('Failed to create migration:', error);
      setError('Failed to create migration');
    } finally {
      setLoading(false);
    }
  };

  const applyMigration = async (migrationId: string) => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch(
        `http://localhost:4000/api/databases/connections/${connectionId}/migrations/${migrationId}/apply`,
        { method: 'POST' }
      );

      const data = await response.json();
      
      if (data.error) {
        setError(data.error);
      } else {
        fetchMigrations();
      }
    } catch (error) {
      console.error('Failed to apply migration:', error);
      setError('Failed to apply migration');
    } finally {
      setLoading(false);
    }
  };

  const rollbackMigration = async (migrationId: string) => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch(
        `http://localhost:4000/api/databases/connections/${connectionId}/migrations/${migrationId}/rollback`,
        { method: 'POST' }
      );

      const data = await response.json();
      
      if (data.error) {
        setError(data.error);
      } else {
        fetchMigrations();
      }
    } catch (error) {
      console.error('Failed to rollback migration:', error);
      setError('Failed to rollback migration');
    } finally {
      setLoading(false);
    }
  };

  const applyAllPending = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch(
        `http://localhost:4000/api/databases/connections/${connectionId}/migrations/apply-all`,
        { method: 'POST' }
      );

      const data = await response.json();
      
      if (data.error) {
        setError(data.error);
      } else {
        fetchMigrations();
      }
    } catch (error) {
      console.error('Failed to apply migrations:', error);
      setError('Failed to apply all migrations');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'applied':
        return '#89d185';
      case 'pending':
        return '#f0ad4e';
      case 'failed':
        return '#e81123';
      case 'rolled_back':
        return '#888888';
      default:
        return '#cccccc';
    }
  };

  const pendingCount = migrations.filter((m) => m.status === 'pending').length;
  const appliedCount = migrations.filter((m) => m.status === 'applied').length;

  return (
    <div className="migration-manager">
      <div className="mm-header">
        <div className="mm-title">
          <h3>Migration Manager</h3>
          <div className="mm-stats">
            <span className="stat">Applied: {appliedCount}</span>
            <span className="stat">Pending: {pendingCount}</span>
          </div>
        </div>
        <div className="mm-actions">
          {pendingCount > 0 && (
            <button className="btn-primary" onClick={applyAllPending} disabled={loading}>
              Apply All Pending
            </button>
          )}
          <button
            className="btn-small"
            onClick={() => setShowCreateForm(!showCreateForm)}
          >
            {showCreateForm ? 'Cancel' : '+ New Migration'}
          </button>
        </div>
      </div>

      {error && <div className="mm-error">{error}</div>}

      {showCreateForm && (
        <div className="mm-create-form">
          <h4>Create New Migration</h4>
          <div className="form-field">
            <label>Migration Name:</label>
            <input
              type="text"
              placeholder="e.g., add_users_table"
              value={newMigration.name}
              onChange={(e) => setNewMigration({ ...newMigration, name: e.target.value })}
            />
          </div>
          <div className="form-field">
            <label>UP Migration (SQL to apply):</label>
            <textarea
              placeholder="CREATE TABLE users (id SERIAL PRIMARY KEY, ...);"
              value={newMigration.up}
              onChange={(e) => setNewMigration({ ...newMigration, up: e.target.value })}
              rows={6}
            />
          </div>
          <div className="form-field">
            <label>DOWN Migration (SQL to rollback):</label>
            <textarea
              placeholder="DROP TABLE users;"
              value={newMigration.down}
              onChange={(e) => setNewMigration({ ...newMigration, down: e.target.value })}
              rows={6}
            />
          </div>
          <button className="btn-primary" onClick={createMigration} disabled={loading}>
            Create Migration
          </button>
        </div>
      )}

      {loading && <div className="mm-loading">Loading...</div>}

      <div className="mm-list">
        {migrations.length === 0 && !loading && (
          <div className="mm-empty">No migrations found. Create your first migration!</div>
        )}
        
        {migrations.map((migration) => (
          <div key={migration.id} className="mm-item">
            <div className="mm-item-header" onClick={() => setExpandedMigration(
              expandedMigration === migration.id ? null : migration.id
            )}>
              <div className="mm-item-info">
                <span className="mm-item-name">{migration.name}</span>
                <span className="mm-item-version">v{migration.version}</span>
                <span
                  className="mm-item-status"
                  style={{ color: getStatusColor(migration.status) }}
                >
                  {migration.status}
                </span>
              </div>
              <div className="mm-item-actions" onClick={(e) => e.stopPropagation()}>
                {migration.status === 'pending' && (
                  <button
                    className="btn-action"
                    onClick={() => applyMigration(migration.id)}
                    disabled={loading}
                  >
                    Apply
                  </button>
                )}
                {migration.status === 'applied' && (
                  <button
                    className="btn-action rollback"
                    onClick={() => rollbackMigration(migration.id)}
                    disabled={loading}
                  >
                    Rollback
                  </button>
                )}
              </div>
            </div>
            
            {expandedMigration === migration.id && (
              <div className="mm-item-details">
                <div className="mm-sql-section">
                  <strong>UP Migration:</strong>
                  <pre>{migration.up}</pre>
                </div>
                <div className="mm-sql-section">
                  <strong>DOWN Migration:</strong>
                  <pre>{migration.down}</pre>
                </div>
                <div className="mm-meta">
                  <span>Created: {new Date(migration.createdAt).toLocaleString()}</span>
                  {migration.appliedAt && (
                    <span>Applied: {new Date(migration.appliedAt).toLocaleString()}</span>
                  )}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default MigrationManager;
