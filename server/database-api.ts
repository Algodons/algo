import { Express, Request, Response } from 'express';
import { Client as PgClient } from 'pg';
import * as mysql from 'mysql2/promise';
import { MongoClient } from 'mongodb';

// Database connection pools
const connections = new Map<string, any>();

export function setupDatabaseRoutes(app: Express) {
  // PostgreSQL connections
  app.post('/api/db/postgres/connect', async (req: Request, res: Response) => {
    try {
      const { connectionId, host, port, database, user, password } = req.body;
      
      const client = new PgClient({
        host,
        port: port || 5432,
        database,
        user,
        password
      });
      
      await client.connect();
      connections.set(connectionId, { type: 'postgres', client });
      
      res.json({ success: true, message: 'Connected to PostgreSQL' });
    } catch (error) {
      res.status(500).json({ error: 'PostgreSQL connection failed', details: (error as Error).message });
    }
  });

  app.post('/api/db/postgres/query', async (req: Request, res: Response) => {
    try {
      const { connectionId, query } = req.body;
      const conn = connections.get(connectionId);
      
      if (!conn || conn.type !== 'postgres') {
        return res.status(400).json({ error: 'Invalid connection' });
      }
      
      const result = await conn.client.query(query);
      
      res.json({ success: true, rows: result.rows, rowCount: result.rowCount });
    } catch (error) {
      res.status(500).json({ error: 'Query failed', details: (error as Error).message });
    }
  });

  app.get('/api/db/postgres/tables', async (req: Request, res: Response) => {
    try {
      const { connectionId } = req.query;
      const conn = connections.get(connectionId as string);
      
      if (!conn || conn.type !== 'postgres') {
        return res.status(400).json({ error: 'Invalid connection' });
      }
      
      const result = await conn.client.query(`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public'
        ORDER BY table_name
      `);
      
      res.json({ success: true, tables: result.rows });
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch tables', details: (error as Error).message });
    }
  });

  // MySQL connections
  app.post('/api/db/mysql/connect', async (req: Request, res: Response) => {
    try {
      const { connectionId, host, port, database, user, password } = req.body;
      
      const connection = await mysql.createConnection({
        host,
        port: port || 3306,
        database,
        user,
        password
      });
      
      connections.set(connectionId, { type: 'mysql', client: connection });
      
      res.json({ success: true, message: 'Connected to MySQL' });
    } catch (error) {
      res.status(500).json({ error: 'MySQL connection failed', details: (error as Error).message });
    }
  });

  app.post('/api/db/mysql/query', async (req: Request, res: Response) => {
    try {
      const { connectionId, query } = req.body;
      const conn = connections.get(connectionId);
      
      if (!conn || conn.type !== 'mysql') {
        return res.status(400).json({ error: 'Invalid connection' });
      }
      
      const [rows] = await conn.client.execute(query);
      
      res.json({ success: true, rows });
    } catch (error) {
      res.status(500).json({ error: 'Query failed', details: (error as Error).message });
    }
  });

  app.get('/api/db/mysql/tables', async (req: Request, res: Response) => {
    try {
      const { connectionId } = req.query;
      const conn = connections.get(connectionId as string);
      
      if (!conn || conn.type !== 'mysql') {
        return res.status(400).json({ error: 'Invalid connection' });
      }
      
      const [rows] = await conn.client.execute('SHOW TABLES');
      
      res.json({ success: true, tables: rows });
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch tables', details: (error as Error).message });
    }
  });

  // MongoDB connections
  app.post('/api/db/mongodb/connect', async (req: Request, res: Response) => {
    try {
      const { connectionId, uri, database } = req.body;
      
      const client = new MongoClient(uri);
      await client.connect();
      
      const db = client.db(database);
      connections.set(connectionId, { type: 'mongodb', client, db });
      
      res.json({ success: true, message: 'Connected to MongoDB' });
    } catch (error) {
      res.status(500).json({ error: 'MongoDB connection failed', details: (error as Error).message });
    }
  });

  app.post('/api/db/mongodb/query', async (req: Request, res: Response) => {
    try {
      const { connectionId, collection, query, operation = 'find' } = req.body;
      const conn = connections.get(connectionId);
      
      if (!conn || conn.type !== 'mongodb') {
        return res.status(400).json({ error: 'Invalid connection' });
      }
      
      const coll = conn.db.collection(collection);
      let result;
      
      if (operation === 'find') {
        result = await coll.find(query).toArray();
      } else if (operation === 'insertOne') {
        result = await coll.insertOne(query);
      } else if (operation === 'updateOne') {
        result = await coll.updateOne(query.filter, query.update);
      } else if (operation === 'deleteOne') {
        result = await coll.deleteOne(query);
      }
      
      res.json({ success: true, result });
    } catch (error) {
      res.status(500).json({ error: 'Query failed', details: (error as Error).message });
    }
  });

  app.get('/api/db/mongodb/collections', async (req: Request, res: Response) => {
    try {
      const { connectionId } = req.query;
      const conn = connections.get(connectionId as string);
      
      if (!conn || conn.type !== 'mongodb') {
        return res.status(400).json({ error: 'Invalid connection' });
      }
      
      const collections = await conn.db.listCollections().toArray();
      
      res.json({ success: true, collections: collections.map(c => c.name) });
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch collections', details: (error as Error).message });
    }
  });

  // Disconnect
  app.post('/api/db/disconnect', async (req: Request, res: Response) => {
    try {
      const { connectionId } = req.body;
      const conn = connections.get(connectionId);
      
      if (!conn) {
        return res.status(400).json({ error: 'Connection not found' });
      }
      
      if (conn.type === 'postgres' || conn.type === 'mysql') {
        await conn.client.end();
      } else if (conn.type === 'mongodb') {
        await conn.client.close();
      }
      
      connections.delete(connectionId);
      
      res.json({ success: true, message: 'Disconnected' });
    } catch (error) {
      res.status(500).json({ error: 'Failed to disconnect', details: (error as Error).message });
    }
  });
}
