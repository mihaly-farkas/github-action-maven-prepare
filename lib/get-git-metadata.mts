import * as core from '@actions/core';
import {getExecOutput} from '@actions/exec';
import chalk from 'chalk';

export const getGitMetadata = async () => {
  const gitOptions = {silent: true};
  const [gitCommitShortHashResult, gitCommitLongHashResult, gitCommitTimestampResult] = await Promise.all([
    getExecOutput('git', ['rev-parse', '--short', 'HEAD'], gitOptions),
    getExecOutput('git', ['rev-parse', 'HEAD'], gitOptions),
    getExecOutput('git', ['show', '-s', '--format=%ct', 'HEAD'], gitOptions),
  ]);
  const gitCommitShortHash = gitCommitShortHashResult.stdout.trim();
  const gitCommitLongHash = gitCommitLongHashResult.stdout.trim();
  const gitCommitTimestamp = gitCommitTimestampResult.stdout.trim();
  core.setOutput('git-commit-short-hash', gitCommitShortHash);
  core.setOutput('git-commit-long-hash', gitCommitLongHash);
  core.setOutput('git-commit-timestamp', gitCommitTimestamp);
  core.info(chalk.cyanBright('Git commit short hash:         ') + chalk.greenBright(gitCommitShortHash));
  core.info(chalk.cyanBright('Git commit long hash:          ') + chalk.greenBright(gitCommitLongHash));
  core.info(chalk.cyanBright('Git commit timestamp:          ') + chalk.greenBright(gitCommitTimestamp));
  return {gitOptions, gitCommitShortHash, gitCommitLongHash, gitCommitTimestamp};
};
