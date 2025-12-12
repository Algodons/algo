const express = require('express');
const router = express.Router();
const { pgPool } = require('../database/init');
const { authenticateToken } = require('../middleware/auth');
const { validate, projectValidation } = require('../middleware/validation');
const { logger } = require('../utils/logger');
const { createProjectBucket } = require('../services/storage');

// Get all projects for user
router.get('/', authenticateToken, async (req, res) => {
  try {
    const result = await pgPool.query(
      'SELECT id, name, description, language, created_at, updated_at FROM projects WHERE user_id = $1 ORDER BY updated_at DESC',
      [req.user.id]
    );

    res.json({ projects: result.rows });
  } catch (error) {
    logger.error('Get projects error:', error);
    res.status(500).json({ error: 'Failed to fetch projects' });
  }
});

// Get single project
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const result = await pgPool.query(
      'SELECT * FROM projects WHERE id = $1 AND user_id = $2',
      [req.params.id, req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Project not found' });
    }

    res.json({ project: result.rows[0] });
  } catch (error) {
    logger.error('Get project error:', error);
    res.status(500).json({ error: 'Failed to fetch project' });
  }
});

// Create project
router.post('/', authenticateToken, validate(projectValidation), async (req, res) => {
  try {
    const { name, description, language } = req.body;
    const s3Path = `projects/${req.user.id}/${Date.now()}-${name}`;

    // Create S3 bucket/path
    await createProjectBucket(s3Path);

    const result = await pgPool.query(
      'INSERT INTO projects (user_id, name, description, language, s3_path) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [req.user.id, name, description, language || 'javascript', s3Path]
    );

    logger.info(`Project created: ${name} by user ${req.user.email}`);

    res.status(201).json({
      message: 'Project created successfully',
      project: result.rows[0],
    });
  } catch (error) {
    logger.error('Create project error:', error);
    res.status(500).json({ error: 'Failed to create project' });
  }
});

// Update project
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const { name, description, language } = req.body;

    const result = await pgPool.query(
      'UPDATE projects SET name = COALESCE($1, name), description = COALESCE($2, description), language = COALESCE($3, language), updated_at = CURRENT_TIMESTAMP WHERE id = $4 AND user_id = $5 RETURNING *',
      [name, description, language, req.params.id, req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Project not found' });
    }

    res.json({
      message: 'Project updated successfully',
      project: result.rows[0],
    });
  } catch (error) {
    logger.error('Update project error:', error);
    res.status(500).json({ error: 'Failed to update project' });
  }
});

// Delete project
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const result = await pgPool.query(
      'DELETE FROM projects WHERE id = $1 AND user_id = $2 RETURNING *',
      [req.params.id, req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Project not found' });
    }

    logger.info(`Project deleted: ${result.rows[0].name} by user ${req.user.email}`);

    res.json({ message: 'Project deleted successfully' });
  } catch (error) {
    logger.error('Delete project error:', error);
    res.status(500).json({ error: 'Failed to delete project' });
  }
});

module.exports = router;
