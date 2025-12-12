const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const { cloneRepository, commitChanges, pushChanges, getBranches, createBranch } = require('../services/git');
const { logger } = require('../utils/logger');

// Clone repository
router.post('/clone', authenticateToken, async (req, res) => {
  try {
    const { projectId, repoUrl } = req.body;

    await cloneRepository(projectId, repoUrl);

    res.json({ message: 'Repository cloned successfully' });
  } catch (error) {
    logger.error('Clone repository error:', error);
    res.status(500).json({ error: 'Failed to clone repository' });
  }
});

// Commit changes
router.post('/commit', authenticateToken, async (req, res) => {
  try {
    const { projectId, message } = req.body;

    await commitChanges(projectId, message);

    res.json({ message: 'Changes committed successfully' });
  } catch (error) {
    logger.error('Commit error:', error);
    res.status(500).json({ error: 'Failed to commit changes' });
  }
});

// Push changes
router.post('/push', authenticateToken, async (req, res) => {
  try {
    const { projectId, branch } = req.body;

    await pushChanges(projectId, branch || 'main');

    res.json({ message: 'Changes pushed successfully' });
  } catch (error) {
    logger.error('Push error:', error);
    res.status(500).json({ error: 'Failed to push changes' });
  }
});

// Get branches
router.get('/:projectId/branches', authenticateToken, async (req, res) => {
  try {
    const { projectId } = req.params;

    const branches = await getBranches(projectId);

    res.json({ branches });
  } catch (error) {
    logger.error('Get branches error:', error);
    res.status(500).json({ error: 'Failed to get branches' });
  }
});

// Create branch
router.post('/branch', authenticateToken, async (req, res) => {
  try {
    const { projectId, branchName } = req.body;

    await createBranch(projectId, branchName);

    res.json({ message: 'Branch created successfully' });
  } catch (error) {
    logger.error('Create branch error:', error);
    res.status(500).json({ error: 'Failed to create branch' });
  }
});

module.exports = router;
