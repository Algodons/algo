import React, { useState } from 'react';
import './DatabasePanel.css';
import QueryBuilder from './database/QueryBuilder';
import DataBrowser from './database/DataBrowser';
import MigrationManager from './database/MigrationManager';

type DatabaseType = 'postgresql' | 'mysql' | 'mongodb' | 'redis' | 'sqlite' | 'pinecone' | 'weaviate';
type TabType = 'query' | 'visual-builder' | 'data-browser' | 'migrations' | 'schema';

const DatabasePanel: React.FC = () => {
  const [dbType, setDbType] = useState<DatabaseType>('postgresql');
  const [connectionId, setConnectionId] = useState('');
  const [connected, setConnected] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>('query');
  const [connectionName, setConnectionName] = useState('');
  const [host, setHost] = useState('localhost');
  const [port, setPort] = useState('5432');
  const [database, setDatabase] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [query, setQuery] = useState('');
  const [result, setResult] = useState<any>(null);
  const [message, setMessage] = useState('');

  const connect = async () => {
    try {
      const credentials: any = {
        host,
        port: parseInt(port),
        username,
        password,
        database,
      };

      const response = await fetch('http://localhost:4000/api/databases/connections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: connectionName || `${dbType}-connection`,
          type: dbType,
          credentials,
        }),
      });
      
      const data = await response.json();
      if (data.id) {
        setConnectionId(data.id);
        setConnected(true);
        setMessage('Connected successfully');
      } else {
        setMessage(data.error || 'Connection failed');
      }
    } catch (error) {
      setMessage('Connection failed');
    }
  };

  const executeQuery = async (queryToExecute?: string) => {
    if (!connected) {
      setMessage('Please connect first');
      return;
    }

    try {
      const response = await fetch(
        `http://localhost:4000/api/databases/connections/${connectionId}/query`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query: queryToExecute || query }),
        }
      );
      
      const data = await response.json();
      if (data.rows || data.result) {
        setResult(data.rows || data.result);
        setMessage('Query executed successfully');
      } else if (data.error) {
        setMessage(data.error);
        setResult(null);
      }
    } catch (error) {
      setMessage('Query failed');
    }
  };

  const disconnect = async () => {
    try {
      await fetch(`http://localhost:4000/api/databases/connections/${connectionId}`, {
        method: 'DELETE',
      });
      setConnected(false);
      setConnectionId('');
      setMessage('Disconnected');
      setActiveTab('query');
    } catch (error) {
      setMessage('Failed to disconnect');
    }
  };

  return (
    <div className="database-panel">
      <div className="panel-title">Database Management</div>
      
      {!connected ? (
        <>
          <div className="db-section">
            <h3>Connect to Database</h3>
            <div className="form-field">
              <label>Connection Name:</label>
              <input
                type="text"
                placeholder="My Database"
                value={connectionName}
                onChange={(e) => setConnectionName(e.target.value)}
              />
            </div>
            <div className="form-field">
              <label>Database Type:</label>
              <select value={dbType} onChange={(e) => setDbType(e.target.value as DatabaseType)}>
                <option value="postgresql">PostgreSQL</option>
                <option value="mysql">MySQL</option>
                <option value="mongodb">MongoDB</option>
                <option value="redis">Redis</option>
                <option value="sqlite">SQLite</option>
                <option value="pinecone">Pinecone (Vector DB)</option>
                <option value="weaviate">Weaviate (Vector DB)</option>
              </select>
            </div>
            <div className="form-field">
              <label>Host:</label>
              <input
                type="text"
                placeholder="localhost"
                value={host}
                onChange={(e) => setHost(e.target.value)}
              />
            </div>
            <div className="form-field">
              <label>Port:</label>
              <input
                type="text"
                placeholder="5432"
                value={port}
                onChange={(e) => setPort(e.target.value)}
              />
            </div>
            <div className="form-field">
              <label>Database:</label>
              <input
                type="text"
                placeholder="mydb"
                value={database}
                onChange={(e) => setDatabase(e.target.value)}
              />
            </div>
            <div className="form-field">
              <label>Username:</label>
              <input
                type="text"
                placeholder="postgres"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />
            </div>
            <div className="form-field">
              <label>Password:</label>
              <input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            <button className="btn btn-primary" onClick={connect}>
              Connect
            </button>
          </div>
        </>
      ) : (
        <>
          <div className="db-section">
            <div className="connection-status">
              <span className="status-indicator connected">●</span>
              <span>Connected to {database}</span>
            </div>
            <button className="btn" onClick={disconnect}>
              Disconnect
            </button>
          </div>

          <div className="db-tabs">
            <button
              className={`db-tab ${activeTab === 'query' ? 'active' : ''}`}
              onClick={() => setActiveTab('query')}
            >
              SQL Editor
            </button>
            <button
              className={`db-tab ${activeTab === 'visual-builder' ? 'active' : ''}`}
              onClick={() => setActiveTab('visual-builder')}
            >
              Query Builder
            </button>
            <button
              className={`db-tab ${activeTab === 'data-browser' ? 'active' : ''}`}
              onClick={() => setActiveTab('data-browser')}
            >
              Data Browser
            </button>
            <button
              className={`db-tab ${activeTab === 'migrations' ? 'active' : ''}`}
              onClick={() => setActiveTab('migrations')}
            >
              Migrations
            </button>
          </div>

          <div className="db-tab-content">
            {activeTab === 'query' && (
              <div className="query-tab">
                <div className="db-section">
                  <textarea
                    placeholder="SELECT * FROM table"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    rows={8}
                  />
                  <button className="btn btn-primary" onClick={() => executeQuery()}>
                    Execute Query
                  </button>
                </div>

                {result && (
                  <div className="db-result">
                    <div className="result-header">Results</div>
                    <pre>{JSON.stringify(result, null, 2)}</pre>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'visual-builder' && (
              <QueryBuilder connectionId={connectionId} onExecute={executeQuery} />
            )}

            {activeTab === 'data-browser' && (
              <DataBrowser connectionId={connectionId} />
            )}

            {activeTab === 'migrations' && (
              <MigrationManager connectionId={connectionId} />
            )}
          </div>
        </>
      )}

      {message && (
        <div className={message.includes('failed') || message.includes('Failed') ? 'error' : 'success'}>
          {message}
        </div>
      )}
    </div>
  );
};

export default DatabasePanel;
