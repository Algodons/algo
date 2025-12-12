const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const { createContainer, stopContainer, getContainerStats } = require('../services/docker');
const { logger } = require('../utils/logger');

// Create and start container for project
router.post('/:projectId/start', authenticateToken, async (req, res) => {
  try {
    const { projectId } = req.params;
    const { language } = req.body;

    const container = await createContainer(projectId, language, req.user.id);

    res.json({
      message: 'Container started successfully',
      containerId: container.id,
    });
  } catch (error) {
    logger.error('Start container error:', error);
    res.status(500).json({ error: 'Failed to start container' });
  }
});

// Stop container
router.post('/:projectId/stop', authenticateToken, async (req, res) => {
  try {
    const { projectId } = req.params;

    await stopContainer(projectId);

    res.json({ message: 'Container stopped successfully' });
  } catch (error) {
    logger.error('Stop container error:', error);
    res.status(500).json({ error: 'Failed to stop container' });
  }
});

// Get container stats
router.get('/:projectId/stats', authenticateToken, async (req, res) => {
  try {
    const { projectId } = req.params;

    const stats = await getContainerStats(projectId);

    res.json({ stats });
  } catch (error) {
    logger.error('Get container stats error:', error);
    res.status(500).json({ error: 'Failed to get container stats' });
  }
});

module.exports = router;
