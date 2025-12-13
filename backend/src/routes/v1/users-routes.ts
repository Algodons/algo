import { Router, Request, Response } from 'express';
import { Pool } from 'pg';
import { body, param, query, validationResult } from 'express-validator';
import { authenticate } from '../../middleware/auth';

export function createUsersRoutes(pool: Pool): Router {
  const router = Router();

  // POST /api/v1/users - Create new user
  router.post(
    '/',
    [
      body('email').isEmail().normalizeEmail(),
      body('username').isLength({ min: 3, max: 50 }).trim(),
      body('password').isLength({ min: 8 }),
      body('name').optional().trim(),
    ],
    async (req: Request, res: Response) => {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, errors: errors.array() });
      }

      const { email, username, password, name } = req.body;

      try {
        // Check if user already exists
        const existingUser = await pool.query(
          'SELECT id FROM users WHERE email = $1 OR username = $2',
          [email, username]
        );

        if (existingUser.rows.length > 0) {
          return res.status(409).json({
            success: false,
            error: 'User with this email or username already exists',
          });
        }

        // Hash password with bcrypt
        const bcrypt = require('bcrypt');
        const hashedPassword = await bcrypt.hash(password, 10);

        // Create user
        const result = await pool.query(
          `INSERT INTO users (email, username, password_hash, name, created_at)
           VALUES ($1, $2, $3, $4, NOW())
           RETURNING id, email, username, name, created_at`,
          [email, username, hashedPassword, name || null]
        );

        res.status(201).json({
          success: true,
          data: result.rows[0],
          message: 'User created successfully',
        });
      } catch (error: any) {
        console.error('Error creating user:', error);
        res.status(500).json({
          success: false,
          error: 'Failed to create user',
          details: error.message,
        });
      }
    }
  );

  // GET /api/v1/users/:id - Get user details
  router.get(
    '/:id',
    authenticate(pool),
    [param('id').isInt()],
    async (req: Request, res: Response) => {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, errors: errors.array() });
      }

      const { id } = req.params;

      try {
        const result = await pool.query(
          `SELECT id, email, username, name, created_at, updated_at, last_login
           FROM users WHERE id = $1`,
          [id]
        );

        if (result.rows.length === 0) {
          return res.status(404).json({
            success: false,
            error: 'User not found',
          });
        }

        res.json({
          success: true,
          data: result.rows[0],
        });
      } catch (error: any) {
        console.error('Error fetching user:', error);
        res.status(500).json({
          success: false,
          error: 'Failed to fetch user',
          details: error.message,
        });
      }
    }
  );

  // PUT /api/v1/users/:id - Update user
  router.put(
    '/:id',
    authenticate(pool),
    [
      param('id').isInt(),
      body('email').optional().isEmail().normalizeEmail(),
      body('username').optional().isLength({ min: 3, max: 50 }).trim(),
      body('name').optional().trim(),
    ],
    async (req: Request, res: Response) => {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, errors: errors.array() });
      }

      const { id } = req.params;
      const { email, username, name } = req.body;

      try {
        // Build dynamic update query
        const updates: string[] = [];
        const values: any[] = [];
        let paramIndex = 1;

        if (email !== undefined) {
          updates.push(`email = $${paramIndex++}`);
          values.push(email);
        }
        if (username !== undefined) {
          updates.push(`username = $${paramIndex++}`);
          values.push(username);
        }
        if (name !== undefined) {
          updates.push(`name = $${paramIndex++}`);
          values.push(name);
        }

        if (updates.length === 0) {
          return res.status(400).json({
            success: false,
            error: 'No fields to update',
          });
        }

        updates.push(`updated_at = NOW()`);
        values.push(id);

        const result = await pool.query(
          `UPDATE users SET ${updates.join(', ')}
           WHERE id = $${paramIndex}
           RETURNING id, email, username, name, updated_at`,
          values
        );

        if (result.rows.length === 0) {
          return res.status(404).json({
            success: false,
            error: 'User not found',
          });
        }

        res.json({
          success: true,
          data: result.rows[0],
          message: 'User updated successfully',
        });
      } catch (error: any) {
        console.error('Error updating user:', error);
        res.status(500).json({
          success: false,
          error: 'Failed to update user',
          details: error.message,
        });
      }
    }
  );

  // DELETE /api/v1/users/:id - Delete user
  router.delete(
    '/:id',
    authenticate(pool),
    [param('id').isInt()],
    async (req: Request, res: Response) => {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, errors: errors.array() });
      }

      const { id } = req.params;

      try {
        const result = await pool.query(
          'DELETE FROM users WHERE id = $1 RETURNING id',
          [id]
        );

        if (result.rows.length === 0) {
          return res.status(404).json({
            success: false,
            error: 'User not found',
          });
        }

        res.json({
          success: true,
          message: 'User deleted successfully',
        });
      } catch (error: any) {
        console.error('Error deleting user:', error);
        res.status(500).json({
          success: false,
          error: 'Failed to delete user',
          details: error.message,
        });
      }
    }
  );

  // GET /api/v1/users - List users (with pagination)
  router.get(
    '/',
    authenticate(pool),
    [
      query('page').optional().isInt({ min: 1 }),
      query('limit').optional().isInt({ min: 1, max: 100 }),
      query('search').optional().trim(),
    ],
    async (req: Request, res: Response) => {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, errors: errors.array() });
      }

      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const search = req.query.search as string;
      const offset = (page - 1) * limit;

      try {
        let query = `
          SELECT id, email, username, name, created_at, last_login
          FROM users
        `;
        let countQuery = 'SELECT COUNT(*) FROM users';
        const values: any[] = [];

        if (search) {
          query += ' WHERE username ILIKE $1 OR email ILIKE $1 OR name ILIKE $1';
          countQuery += ' WHERE username ILIKE $1 OR email ILIKE $1 OR name ILIKE $1';
          values.push(`%${search}%`);
        }

        query += ` ORDER BY created_at DESC LIMIT $${values.length + 1} OFFSET $${values.length + 2}`;
        values.push(limit, offset);

        const [result, countResult] = await Promise.all([
          pool.query(query, values),
          pool.query(countQuery, search ? [`%${search}%`] : []),
        ]);

        const total = parseInt(countResult.rows[0].count);
        const totalPages = Math.ceil(total / limit);

        res.json({
          success: true,
          data: result.rows,
          pagination: {
            page,
            limit,
            total,
            totalPages,
          },
        });
      } catch (error: any) {
        console.error('Error listing users:', error);
        res.status(500).json({
          success: false,
          error: 'Failed to list users',
          details: error.message,
        });
      }
    }
  );

  return router;
}
