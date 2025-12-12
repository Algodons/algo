import React, { useState } from 'react';
import './DatabasePanel.css';

type DatabaseType = 'postgres' | 'mysql' | 'mongodb';

const DatabasePanel: React.FC = () => {
  const [dbType, setDbType] = useState<DatabaseType>('postgres');
  const [connectionId] = useState('db-' + crypto.randomUUID());
  const [connected, setConnected] = useState(false);
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
      const endpoint = `/api/db/${dbType}/connect`;
      const body = dbType === 'mongodb' 
        ? { connectionId, uri: `mongodb://${username}:${password}@${host}:${port}`, database }
        : { connectionId, host, port: parseInt(port), database, user: username, password };

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      
      const data = await response.json();
      if (data.success) {
        setConnected(true);
        setMessage('Connected successfully');
      } else {
        setMessage(data.error);
      }
    } catch (error) {
      setMessage('Connection failed');
    }
  };

  const executeQuery = async () => {
    if (!connected) {
      setMessage('Please connect first');
      return;
    }

    try {
      const endpoint = `/api/db/${dbType}/query`;
      const body = dbType === 'mongodb'
        ? { connectionId, collection: 'test', query: JSON.parse(query) }
        : { connectionId, query };

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      
      const data = await response.json();
      if (data.success) {
        setResult(data.rows || data.result);
        setMessage('Query executed successfully');
      } else {
        setMessage(data.error);
      }
    } catch (error) {
      setMessage('Query failed');
    }
  };

  const disconnect = async () => {
    try {
      await fetch('/api/db/disconnect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ connectionId })
      });
      setConnected(false);
      setMessage('Disconnected');
    } catch (error) {
      setMessage('Failed to disconnect');
    }
  };

  return (
    <div className="database-panel">
      <div className="panel-title">Database GUI</div>
      
      <div className="db-section">
        <select value={dbType} onChange={(e) => setDbType(e.target.value as DatabaseType)}>
          <option value="postgres">PostgreSQL</option>
          <option value="mysql">MySQL</option>
          <option value="mongodb">MongoDB</option>
        </select>
      </div>

      {!connected ? (
        <>
          <div className="db-section">
            <input
              type="text"
              placeholder="Host"
              value={host}
              onChange={(e) => setHost(e.target.value)}
            />
            <input
              type="text"
              placeholder="Port"
              value={port}
              onChange={(e) => setPort(e.target.value)}
            />
            <input
              type="text"
              placeholder="Database"
              value={database}
              onChange={(e) => setDatabase(e.target.value)}
            />
            <input
              type="text"
              placeholder="Username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <button className="btn" onClick={connect}>
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

          <div className="db-section">
            <textarea
              placeholder={dbType === 'mongodb' ? '{"field": "value"}' : 'SELECT * FROM table'}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              rows={4}
            />
            <button className="btn" onClick={executeQuery}>
              Execute
            </button>
          </div>

          {result && (
            <div className="db-result">
              <div className="result-header">Results</div>
              <pre>{JSON.stringify(result, null, 2)}</pre>
            </div>
          )}
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
