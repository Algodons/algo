import React, { useState, useEffect } from 'react';
import './AdminDashboard.css';

interface User {
  id: number;
  email: string;
  name: string;
  subscription_tier: string;
  is_suspended: boolean;
  created_at: string;
}

interface AnalyticsSummary {
  users: {
    total_users: number;
    new_users_30d: number;
    active_users: number;
  };
  projects: {
    total_projects: number;
    new_projects_30d: number;
    running_projects: number;
  };
  subscriptions: {
    total_subscriptions: number;
    monthly_revenue: string;
  };
  deployments: {
    total_deployments: number;
    deployments_24h: number;
    avg_deployment_time: number;
  };
}

export const AdminDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'summary' | 'users' | 'analytics' | 'affiliates' | 'financial' | 'system'>('summary');
  const [summary, setSummary] = useState<AnalyticsSummary | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Fetch summary data
  useEffect(() => {
    if (activeTab === 'summary') {
      fetchSummary();
    }
  }, [activeTab]);

  const fetchSummary = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/admin/analytics/summary', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('admin_token')}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch summary');
      }

      const data = await response.json();
      setSummary(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const searchUsers = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/admin/users/search?email=${searchQuery}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('admin_token')}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to search users');
      }

      const data = await response.json();
      setUsers(data.users);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const suspendUser = async (userId: number, reason: string) => {
    if (!confirm(`Are you sure you want to suspend this user? Reason: ${reason}`)) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/users/${userId}/suspend`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('admin_token')}`,
          'Content-Type': 'application/json',
          'X-2FA-Token': prompt('Enter 2FA token:') || '',
        },
        body: JSON.stringify({ reason }),
      });

      if (!response.ok) {
        throw new Error('Failed to suspend user');
      }

      alert('User suspended successfully');
      searchUsers(); // Refresh the list
    } catch (err) {
      alert(err instanceof Error ? err.message : 'An error occurred');
    }
  };

  return (
    <div className="admin-dashboard">
      <div className="admin-header">
        <h1>Admin Control Panel</h1>
        <div className="admin-user-info">
          <span>Admin User</span>
          <button className="btn-logout">Logout</button>
        </div>
      </div>

      <nav className="admin-nav">
        <button
          className={activeTab === 'summary' ? 'active' : ''}
          onClick={() => setActiveTab('summary')}
        >
          Dashboard
        </button>
        <button
          className={activeTab === 'users' ? 'active' : ''}
          onClick={() => setActiveTab('users')}
        >
          User Management
        </button>
        <button
          className={activeTab === 'analytics' ? 'active' : ''}
          onClick={() => setActiveTab('analytics')}
        >
          Analytics
        </button>
        <button
          className={activeTab === 'affiliates' ? 'active' : ''}
          onClick={() => setActiveTab('affiliates')}
        >
          Affiliates
        </button>
        <button
          className={activeTab === 'financial' ? 'active' : ''}
          onClick={() => setActiveTab('financial')}
        >
          Financial
        </button>
        <button
          className={activeTab === 'system' ? 'active' : ''}
          onClick={() => setActiveTab('system')}
        >
          System
        </button>
      </nav>

      <div className="admin-content">
        {error && <div className="error-message">{error}</div>}
        {loading && <div className="loading">Loading...</div>}

        {activeTab === 'summary' && summary && (
          <div className="summary-grid">
            <div className="summary-card">
              <h3>Users</h3>
              <div className="stat-value">{summary.users.total_users.toLocaleString()}</div>
              <div className="stat-label">Total Users</div>
              <div className="stat-subtext">
                +{summary.users.new_users_30d} new in last 30 days
              </div>
            </div>

            <div className="summary-card">
              <h3>Projects</h3>
              <div className="stat-value">{summary.projects.total_projects.toLocaleString()}</div>
              <div className="stat-label">Total Projects</div>
              <div className="stat-subtext">
                {summary.projects.running_projects} currently running
              </div>
            </div>

            <div className="summary-card">
              <h3>Revenue</h3>
              <div className="stat-value">${parseFloat(summary.subscriptions.monthly_revenue).toLocaleString()}</div>
              <div className="stat-label">Monthly Revenue</div>
              <div className="stat-subtext">
                {summary.subscriptions.total_subscriptions} active subscriptions
              </div>
            </div>

            <div className="summary-card">
              <h3>Deployments</h3>
              <div className="stat-value">{summary.deployments.total_deployments.toLocaleString()}</div>
              <div className="stat-label">Total Deployments</div>
              <div className="stat-subtext">
                {summary.deployments.deployments_24h} in last 24 hours
              </div>
            </div>
          </div>
        )}

        {activeTab === 'users' && (
          <div className="users-panel">
            <div className="search-bar">
              <input
                type="text"
                placeholder="Search users by email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && searchUsers()}
              />
              <button onClick={searchUsers}>Search</button>
            </div>

            <table className="users-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Email</th>
                  <th>Name</th>
                  <th>Tier</th>
                  <th>Status</th>
                  <th>Created</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.id}>
                    <td>{user.id}</td>
                    <td>{user.email}</td>
                    <td>{user.name}</td>
                    <td>
                      <span className={`badge tier-${user.subscription_tier}`}>
                        {user.subscription_tier}
                      </span>
                    </td>
                    <td>
                      <span className={user.is_suspended ? 'status-suspended' : 'status-active'}>
                        {user.is_suspended ? 'Suspended' : 'Active'}
                      </span>
                    </td>
                    <td>{new Date(user.created_at).toLocaleDateString()}</td>
                    <td>
                      <div className="action-buttons">
                        <button
                          className="btn-small"
                          onClick={() => window.location.href = `/admin/users/${user.id}`}
                        >
                          View
                        </button>
                        {!user.is_suspended && (
                          <button
                            className="btn-small btn-danger"
                            onClick={() => suspendUser(user.id, 'Administrative action')}
                          >
                            Suspend
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {users.length === 0 && !loading && (
              <div className="no-results">
                No users found. Try searching for a user.
              </div>
            )}
          </div>
        )}

        {activeTab === 'analytics' && (
          <div className="analytics-panel">
            <h2>Platform Analytics</h2>
            <p>Advanced analytics dashboards will be displayed here.</p>
            <div className="analytics-placeholders">
              <div className="chart-placeholder">
                <h3>Revenue Trends</h3>
                <p>MRR and ARR charts</p>
              </div>
              <div className="chart-placeholder">
                <h3>User Growth</h3>
                <p>User acquisition and retention</p>
              </div>
              <div className="chart-placeholder">
                <h3>Resource Usage</h3>
                <p>Platform-wide resource consumption</p>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'affiliates' && (
          <div className="affiliates-panel">
            <h2>Affiliate Management</h2>
            <p>Affiliate program management interface</p>
          </div>
        )}

        {activeTab === 'financial' && (
          <div className="financial-panel">
            <h2>Financial Controls</h2>
            <p>Revenue reconciliation, subscriptions, and refunds</p>
          </div>
        )}

        {activeTab === 'system' && (
          <div className="system-panel">
            <h2>System Administration</h2>
            <p>Server health, deployments, and system configuration</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminDashboard;
