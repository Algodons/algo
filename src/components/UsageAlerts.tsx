import React, { useState, useEffect } from 'react';
import './UsageAlerts.css';

interface Alert {
  id: number;
  metricType: string;
  thresholdPercentage: number;
  notificationChannels: string[];
  isActive: boolean;
  lastTriggeredAt?: string;
  triggerCount: number;
}

interface AlertHistory {
  id: number;
  metricType: string;
  thresholdValue: number;
  currentValue: number;
  percentageUsed: number;
  triggeredAt: string;
}

const UsageAlerts: React.FC = () => {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [history, setHistory] = useState<AlertHistory[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newAlert, setNewAlert] = useState({
    metricType: 'storage',
    thresholdPercentage: 75,
    notificationChannels: ['email'],
  });
  const [loading, setLoading] = useState(true);

  const metricTypes = [
    { value: 'storage', label: 'Storage' },
    { value: 'deployment_hours', label: 'Deployment Hours' },
    { value: 'bandwidth', label: 'Bandwidth' },
  ];

  const notificationOptions = [
    { value: 'email', label: 'Email' },
    { value: 'sms', label: 'SMS' },
    { value: 'dashboard', label: 'Dashboard' },
  ];

  useEffect(() => {
    fetchAlertsData();
  }, []);

  const fetchAlertsData = async () => {
    try {
      // Fetch alerts
      const alertsResponse = await fetch('/api/alerts');
      const alertsData = await alertsResponse.json();
      setAlerts(alertsData.alerts);

      // Fetch history
      const historyResponse = await fetch('/api/alerts/history?limit=10');
      const historyData = await historyResponse.json();
      setHistory(historyData.history);
    } catch (error) {
      console.error('Error fetching alerts data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddAlert = async () => {
    try {
      const response = await fetch('/api/alerts/configure', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          metricType: newAlert.metricType,
          thresholdPercentage: newAlert.thresholdPercentage,
          notificationChannels: newAlert.notificationChannels,
          isActive: true,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create alert');
      }

      alert('Alert created successfully!');
      setShowAddForm(false);
      setNewAlert({
        metricType: 'storage',
        thresholdPercentage: 75,
        notificationChannels: ['email'],
      });
      fetchAlertsData();
    } catch (error: any) {
      alert(`Error: ${error.message}`);
    }
  };

  const handleToggleAlert = async (alertId: number, isActive: boolean) => {
    try {
      const response = await fetch(`/api/alerts/${alertId}/toggle`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ isActive: !isActive }),
      });

      if (!response.ok) {
        throw new Error('Failed to toggle alert');
      }

      fetchAlertsData();
    } catch (error: any) {
      alert(`Error: ${error.message}`);
    }
  };

  const handleDeleteAlert = async (alertId: number) => {
    if (!confirm('Are you sure you want to delete this alert?')) {
      return;
    }

    try {
      const response = await fetch(`/api/alerts/${alertId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete alert');
      }

      alert('Alert deleted successfully!');
      fetchAlertsData();
    } catch (error: any) {
      alert(`Error: ${error.message}`);
    }
  };

  const formatMetricType = (type: string) => {
    return type.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading) {
    return <div className="alerts-loading">Loading alerts...</div>;
  }

  return (
    <div className="usage-alerts">
      <div className="alerts-header">
        <h1>Usage Alerts</h1>
        <p>Get notified when your usage approaches limits</p>
      </div>

      {/* Configured Alerts */}
      <div className="alerts-section">
        <div className="section-header">
          <h2>Configured Alerts</h2>
          <button className="btn-add" onClick={() => setShowAddForm(!showAddForm)}>
            {showAddForm ? 'Cancel' : '+ Add Alert'}
          </button>
        </div>

        {showAddForm && (
          <div className="alert-form">
            <h3>Create New Alert</h3>
            <div className="form-row">
              <div className="form-group">
                <label>Metric Type</label>
                <select
                  value={newAlert.metricType}
                  onChange={(e) =>
                    setNewAlert({ ...newAlert, metricType: e.target.value })
                  }
                >
                  {metricTypes.map((type) => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>Threshold Percentage</label>
                <input
                  type="number"
                  min="1"
                  max="100"
                  value={newAlert.thresholdPercentage}
                  onChange={(e) =>
                    setNewAlert({
                      ...newAlert,
                      thresholdPercentage: parseInt(e.target.value),
                    })
                  }
                />
              </div>
            </div>

            <div className="form-group">
              <label>Notification Channels</label>
              <div className="checkbox-group">
                {notificationOptions.map((option) => (
                  <label key={option.value} className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={newAlert.notificationChannels.includes(option.value)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setNewAlert({
                            ...newAlert,
                            notificationChannels: [
                              ...newAlert.notificationChannels,
                              option.value,
                            ],
                          });
                        } else {
                          setNewAlert({
                            ...newAlert,
                            notificationChannels: newAlert.notificationChannels.filter(
                              (c) => c !== option.value
                            ),
                          });
                        }
                      }}
                    />
                    {option.label}
                  </label>
                ))}
              </div>
            </div>

            <button className="btn-save" onClick={handleAddAlert}>
              Create Alert
            </button>
          </div>
        )}

        <div className="alerts-list">
          {alerts.length === 0 ? (
            <p className="no-alerts">No alerts configured yet</p>
          ) : (
            alerts.map((alert) => (
              <div key={alert.id} className="alert-card">
                <div className="alert-info">
                  <div className="alert-header-row">
                    <h3>{formatMetricType(alert.metricType)}</h3>
                    <div className="alert-actions">
                      <label className="toggle-switch-small">
                        <input
                          type="checkbox"
                          checked={alert.isActive}
                          onChange={() =>
                            handleToggleAlert(alert.id, alert.isActive)
                          }
                        />
                        <span className="toggle-slider-small"></span>
                      </label>
                      <button
                        className="btn-delete"
                        onClick={() => handleDeleteAlert(alert.id)}
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                  <div className="alert-details">
                    <p>
                      <strong>Threshold:</strong> {alert.thresholdPercentage}% of limit
                    </p>
                    <p>
                      <strong>Notifications:</strong>{' '}
                      {alert.notificationChannels.join(', ')}
                    </p>
                    {alert.lastTriggeredAt && (
                      <p>
                        <strong>Last triggered:</strong>{' '}
                        {formatDate(alert.lastTriggeredAt)} ({alert.triggerCount}{' '}
                        times total)
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Alert History */}
      <div className="alerts-section">
        <h2>Alert History</h2>
        <div className="history-list">
          {history.length === 0 ? (
            <p className="no-history">No alerts have been triggered yet</p>
          ) : (
            history.map((item) => (
              <div key={item.id} className="history-item">
                <div className="history-icon">⚠️</div>
                <div className="history-details">
                  <h3>{formatMetricType(item.metricType)}</h3>
                  <p>
                    Usage reached {item.percentageUsed.toFixed(1)}% ({item.currentValue}{' '}
                    of {item.thresholdValue})
                  </p>
                  <p className="history-date">{formatDate(item.triggeredAt)}</p>
                </div>
                <div
                  className="history-badge"
                  style={{
                    backgroundColor:
                      item.percentageUsed >= 100
                        ? '#fc8181'
                        : item.percentageUsed >= 90
                        ? '#ed8936'
                        : '#ecc94b',
                  }}
                >
                  {item.percentageUsed.toFixed(0)}%
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default UsageAlerts;
