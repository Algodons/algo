import React, { useState, useEffect } from 'react';
import './BackupManager.css';

interface BackupManagerProps {
  connectionId: string;
}

interface Backup {
  id: string;
  connectionId: string;
  timestamp: string;
  size: number;
  format: string;
  compressed: boolean;
  encrypted: boolean;
  path: string;
}

interface BackupSchedule {
  id: string;
  connectionId: string;
  cron: string;
  retention: number;
  options: any;
  enabled: boolean;
}

const BackupManager: React.FC<BackupManagerProps> = ({ connectionId }) => {
  const [backups, setBackups] = useState<Backup[]>([]);
  const [schedules, setSchedules] = useState<BackupSchedule[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showScheduleForm, setShowScheduleForm] = useState(false);
  
  const [backupOptions, setBackupOptions] = useState({
    format: 'sql',
    compress: true,
    schemaOnly: false,
    dataOnly: false,
  });

  const [scheduleOptions, setScheduleOptions] = useState({
    cron: '0 2 * * *',
    retention: 7,
  });

  useEffect(() => {
    if (connectionId) {
      fetchBackups();
      fetchSchedules();
    }
  }, [connectionId]);

  const fetchBackups = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch(
        `http://localhost:4000/api/databases/connections/${connectionId}/backups`
      );
      const data = await response.json();
      
      if (data.error) {
        setError(data.error);
      } else {
        setBackups(data.backups || []);
      }
    } catch (error) {
      console.error('Failed to fetch backups:', error);
      setError('Failed to load backups');
    } finally {
      setLoading(false);
    }
  };

  const fetchSchedules = async () => {
    try {
      const response = await fetch(
        `http://localhost:4000/api/databases/connections/${connectionId}/backups/schedules`
      );
      const data = await response.json();
      
      if (!data.error) {
        setSchedules(data.schedules || []);
      }
    } catch (error) {
      console.error('Failed to fetch schedules:', error);
    }
  };

  const createBackup = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch(
        `http://localhost:4000/api/databases/connections/${connectionId}/backups`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(backupOptions),
        }
      );

      const data = await response.json();
      
      if (data.error) {
        setError(data.error);
      } else {
        setShowCreateForm(false);
        fetchBackups();
      }
    } catch (error) {
      console.error('Failed to create backup:', error);
      setError('Failed to create backup');
    } finally {
      setLoading(false);
    }
  };

  const restoreBackup = async (backupId: string) => {
    if (!confirm('Are you sure you want to restore this backup? This will overwrite current data.')) {
      return;
    }

    setLoading(true);
    setError('');
    try {
      const response = await fetch(
        `http://localhost:4000/api/databases/connections/${connectionId}/backups/${backupId}/restore`,
        { method: 'POST' }
      );

      const data = await response.json();
      
      if (data.error) {
        setError(data.error);
      } else {
        alert('Backup restored successfully');
      }
    } catch (error) {
      console.error('Failed to restore backup:', error);
      setError('Failed to restore backup');
    } finally {
      setLoading(false);
    }
  };

  const deleteBackup = async (backupId: string) => {
    if (!confirm('Are you sure you want to delete this backup?')) {
      return;
    }

    setLoading(true);
    setError('');
    try {
      const response = await fetch(
        `http://localhost:4000/api/databases/connections/${connectionId}/backups/${backupId}`,
        { method: 'DELETE' }
      );

      const data = await response.json();
      
      if (data.error) {
        setError(data.error);
      } else {
        fetchBackups();
      }
    } catch (error) {
      console.error('Failed to delete backup:', error);
      setError('Failed to delete backup');
    } finally {
      setLoading(false);
    }
  };

  const createSchedule = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch(
        `http://localhost:4000/api/databases/connections/${connectionId}/backups/schedules`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...scheduleOptions,
            options: backupOptions,
          }),
        }
      );

      const data = await response.json();
      
      if (data.error) {
        setError(data.error);
      } else {
        setShowScheduleForm(false);
        fetchSchedules();
      }
    } catch (error) {
      console.error('Failed to create schedule:', error);
      setError('Failed to create schedule');
    } finally {
      setLoading(false);
    }
  };

  const deleteSchedule = async (scheduleId: string) => {
    if (!confirm('Are you sure you want to delete this schedule?')) {
      return;
    }

    setLoading(true);
    setError('');
    try {
      const response = await fetch(
        `http://localhost:4000/api/databases/connections/${connectionId}/backups/schedules/${scheduleId}`,
        { method: 'DELETE' }
      );

      const data = await response.json();
      
      if (data.error) {
        setError(data.error);
      } else {
        fetchSchedules();
      }
    } catch (error) {
      console.error('Failed to delete schedule:', error);
      setError('Failed to delete schedule');
    } finally {
      setLoading(false);
    }
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  return (
    <div className="backup-manager">
      <div className="bm-header">
        <div className="bm-title">
          <h3>Backup Manager</h3>
          <div className="bm-stats">
            <span className="stat">Total Backups: {backups.length}</span>
            <span className="stat">Active Schedules: {schedules.filter(s => s.enabled).length}</span>
          </div>
        </div>
        <div className="bm-actions">
          <button
            className="btn-primary"
            onClick={() => setShowCreateForm(!showCreateForm)}
          >
            {showCreateForm ? 'Cancel' : '+ Create Backup'}
          </button>
          <button
            className="btn-small"
            onClick={() => setShowScheduleForm(!showScheduleForm)}
          >
            {showScheduleForm ? 'Cancel' : 'Schedule Backup'}
          </button>
        </div>
      </div>

      {error && <div className="bm-error">{error}</div>}

      {showCreateForm && (
        <div className="bm-create-form">
          <h4>Create Backup</h4>
          <div className="form-row">
            <label>
              Format:
              <select
                value={backupOptions.format}
                onChange={(e) => setBackupOptions({ ...backupOptions, format: e.target.value })}
              >
                <option value="sql">SQL</option>
                <option value="custom">Custom</option>
                <option value="tar">TAR</option>
              </select>
            </label>
            <label className="checkbox">
              <input
                type="checkbox"
                checked={backupOptions.compress}
                onChange={(e) => setBackupOptions({ ...backupOptions, compress: e.target.checked })}
              />
              Compress
            </label>
          </div>
          <div className="form-row">
            <label className="checkbox">
              <input
                type="checkbox"
                checked={backupOptions.schemaOnly}
                onChange={(e) => setBackupOptions({ ...backupOptions, schemaOnly: e.target.checked })}
              />
              Schema Only
            </label>
            <label className="checkbox">
              <input
                type="checkbox"
                checked={backupOptions.dataOnly}
                onChange={(e) => setBackupOptions({ ...backupOptions, dataOnly: e.target.checked })}
              />
              Data Only
            </label>
          </div>
          <button className="btn-primary" onClick={createBackup} disabled={loading}>
            Create Backup Now
          </button>
        </div>
      )}

      {showScheduleForm && (
        <div className="bm-create-form">
          <h4>Schedule Automated Backup</h4>
          <div className="form-field">
            <label>Cron Expression:</label>
            <input
              type="text"
              value={scheduleOptions.cron}
              onChange={(e) => setScheduleOptions({ ...scheduleOptions, cron: e.target.value })}
              placeholder="0 2 * * * (daily at 2 AM)"
            />
            <small>Examples: 0 2 * * * (daily 2am), 0 0 * * 0 (weekly Sunday)</small>
          </div>
          <div className="form-field">
            <label>Retention (days):</label>
            <input
              type="number"
              value={scheduleOptions.retention}
              onChange={(e) => setScheduleOptions({ ...scheduleOptions, retention: parseInt(e.target.value) })}
              min="1"
              max="365"
            />
          </div>
          <button className="btn-primary" onClick={createSchedule} disabled={loading}>
            Create Schedule
          </button>
        </div>
      )}

      {loading && <div className="bm-loading">Loading...</div>}

      <div className="bm-section">
        <h4>Backup Schedules</h4>
        {schedules.length === 0 ? (
          <div className="bm-empty">No backup schedules configured</div>
        ) : (
          <div className="bm-list">
            {schedules.map((schedule) => (
              <div key={schedule.id} className="bm-schedule-item">
                <div className="schedule-info">
                  <span className="schedule-cron">{schedule.cron}</span>
                  <span className="schedule-retention">Retention: {schedule.retention} days</span>
                  <span className={`schedule-status ${schedule.enabled ? 'enabled' : 'disabled'}`}>
                    {schedule.enabled ? 'Enabled' : 'Disabled'}
                  </span>
                </div>
                <button
                  className="btn-remove"
                  onClick={() => deleteSchedule(schedule.id)}
                  disabled={loading}
                >
                  Delete
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="bm-section">
        <h4>Available Backups</h4>
        {backups.length === 0 ? (
          <div className="bm-empty">No backups found. Create your first backup!</div>
        ) : (
          <div className="bm-list">
            {backups.map((backup) => (
              <div key={backup.id} className="bm-item">
                <div className="bm-item-info">
                  <span className="bm-item-date">
                    {new Date(backup.timestamp).toLocaleString()}
                  </span>
                  <span className="bm-item-size">{formatBytes(backup.size)}</span>
                  <span className="bm-item-format">{backup.format.toUpperCase()}</span>
                  {backup.compressed && <span className="bm-badge">Compressed</span>}
                  {backup.encrypted && <span className="bm-badge">Encrypted</span>}
                </div>
                <div className="bm-item-actions">
                  <button
                    className="btn-action"
                    onClick={() => restoreBackup(backup.id)}
                    disabled={loading}
                  >
                    Restore
                  </button>
                  <button
                    className="btn-remove"
                    onClick={() => deleteBackup(backup.id)}
                    disabled={loading}
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default BackupManager;
