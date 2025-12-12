const simpleGit = require('simple-git');
const path = require('path');
const { logger } = require('../utils/logger');

const GIT_BASE_PATH = process.env.GIT_BASE_PATH || '/tmp/git-repos';

const getGitPath = (projectId) => {
  return path.join(GIT_BASE_PATH, projectId.toString());
};

const cloneRepository = async (projectId, repoUrl, credentials = {}) => {
  try {
    const gitPath = getGitPath(projectId);
    const git = simpleGit();

    await git.clone(repoUrl, gitPath);

    logger.info(`Repository cloned: ${repoUrl} to ${gitPath}`);
  } catch (error) {
    logger.error('Clone repository error:', error);
    throw error;
  }
};

const commitChanges = async (projectId, message) => {
  try {
    const gitPath = getGitPath(projectId);
    const git = simpleGit(gitPath);

    await git.add('.');
    await git.commit(message);

    logger.info(`Changes committed for project ${projectId}`);
  } catch (error) {
    logger.error('Commit error:', error);
    throw error;
  }
};

const pushChanges = async (projectId, branch = 'main') => {
  try {
    const gitPath = getGitPath(projectId);
    const git = simpleGit(gitPath);

    await git.push('origin', branch);

    logger.info(`Changes pushed for project ${projectId} to ${branch}`);
  } catch (error) {
    logger.error('Push error:', error);
    throw error;
  }
};

const pullChanges = async (projectId, branch = 'main') => {
  try {
    const gitPath = getGitPath(projectId);
    const git = simpleGit(gitPath);

    await git.pull('origin', branch);

    logger.info(`Changes pulled for project ${projectId} from ${branch}`);
  } catch (error) {
    logger.error('Pull error:', error);
    throw error;
  }
};

const getBranches = async (projectId) => {
  try {
    const gitPath = getGitPath(projectId);
    const git = simpleGit(gitPath);

    const branches = await git.branchLocal();

    return branches.all;
  } catch (error) {
    logger.error('Get branches error:', error);
    throw error;
  }
};

const createBranch = async (projectId, branchName) => {
  try {
    const gitPath = getGitPath(projectId);
    const git = simpleGit(gitPath);

    await git.checkoutLocalBranch(branchName);

    logger.info(`Branch created for project ${projectId}: ${branchName}`);
  } catch (error) {
    logger.error('Create branch error:', error);
    throw error;
  }
};

const switchBranch = async (projectId, branchName) => {
  try {
    const gitPath = getGitPath(projectId);
    const git = simpleGit(gitPath);

    await git.checkout(branchName);

    logger.info(`Switched to branch ${branchName} for project ${projectId}`);
  } catch (error) {
    logger.error('Switch branch error:', error);
    throw error;
  }
};

const getStatus = async (projectId) => {
  try {
    const gitPath = getGitPath(projectId);
    const git = simpleGit(gitPath);

    const status = await git.status();

    return status;
  } catch (error) {
    logger.error('Get status error:', error);
    throw error;
  }
};

module.exports = {
  cloneRepository,
  commitChanges,
  pushChanges,
  pullChanges,
  getBranches,
  createBranch,
  switchBranch,
  getStatus,
};
