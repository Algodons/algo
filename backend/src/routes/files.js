const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const { readFile, writeFile, listFiles, deleteFile } = require('../services/storage');
const { logger } = require('../utils/logger');

// List files
router.get('/:projectId', authenticateToken, async (req, res) => {
  try {
    const { projectId } = req.params;
    const { path } = req.query;

    const files = await listFiles(projectId, path || '/');

    res.json({ files });
  } catch (error) {
    logger.error('List files error:', error);
    res.status(500).json({ error: 'Failed to list files' });
  }
});

// Read file
router.get('/:projectId/file', authenticateToken, async (req, res) => {
  try {
    const { projectId } = req.params;
    const { path } = req.query;

    if (!path) {
      return res.status(400).json({ error: 'File path is required' });
    }

    const content = await readFile(projectId, path);

    res.json({ content });
  } catch (error) {
    logger.error('Read file error:', error);
    res.status(500).json({ error: 'Failed to read file' });
  }
});

// Write file
router.post('/:projectId/file', authenticateToken, async (req, res) => {
  try {
    const { projectId } = req.params;
    const { path, content } = req.body;

    if (!path || content === undefined) {
      return res.status(400).json({ error: 'File path and content are required' });
    }

    await writeFile(projectId, path, content);

    res.json({ message: 'File saved successfully' });
  } catch (error) {
    logger.error('Write file error:', error);
    res.status(500).json({ error: 'Failed to save file' });
  }
});

// Delete file
router.delete('/:projectId/file', authenticateToken, async (req, res) => {
  try {
    const { projectId } = req.params;
    const { path } = req.query;

    if (!path) {
      return res.status(400).json({ error: 'File path is required' });
    }

    await deleteFile(projectId, path);

    res.json({ message: 'File deleted successfully' });
  } catch (error) {
    logger.error('Delete file error:', error);
    res.status(500).json({ error: 'Failed to delete file' });
  }
});

module.exports = router;
