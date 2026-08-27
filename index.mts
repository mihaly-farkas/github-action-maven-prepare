import * as core from '@actions/core';
import {exec, getExecOutput} from '@actions/exec';
import * as github from '@actions/github';
import chalk from 'chalk';

// Force colored output even when stdout is not detected as a TTY.
chalk.level = 1;

const run = async () => {
  // Ensure the Maven Wrapper has executable permissions
  await exec('chmod', ['+x', './mvnw']);

  // Read the Maven project coordinates from the pom.xml file and expose them as action outputs
  const mvnOptions = {silent: true};
  const [groupIdResult, artifactIdResult, versionResult] = await Promise.all([
    getExecOutput('./mvnw', ['help:evaluate', '-Dexpression=project.groupId', '-q', '-DforceStdout'], mvnOptions),
    getExecOutput('./mvnw', ['help:evaluate', '-Dexpression=project.artifactId', '-q', '-DforceStdout'], mvnOptions),
    getExecOutput('./mvnw', ['help:evaluate', '-Dexpression=project.version', '-q', '-DforceStdout'], mvnOptions),
  ]);
  const groupId = groupIdResult.stdout.trim();
  const artifactId = artifactIdResult.stdout.trim();
  const version = versionResult.stdout.trim();
  core.setOutput('maven-artifact-group-id', groupId);
  core.setOutput('maven-artifact-artifact-id', artifactId);
  core.setOutput('maven-artifact-version', version);
  core.info(chalk.cyanBright('Maven artifact Group ID:      ') + chalk.greenBright(groupId));
  core.info(chalk.cyanBright('Maven artifact Artifact ID:   ') + chalk.greenBright(artifactId));
  core.info(chalk.cyanBright('Maven artifact Version:       ') + chalk.greenBright(version));

  // Check if the Maven artifact id is the same as the GitHub repository name; if not, fail with error
  const githubRepositoryName = github.context.repo.repo.split('/').pop() || '';
  if (artifactId !== githubRepositoryName) {
    core.setFailed(
      `Maven artifact id "${artifactId}" does not match GitHub repository name "${githubRepositoryName}".`,
    );
    return;
  }

  // Get git metadata and expose them as action outputs
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
  core.info(chalk.cyanBright('Git commit short hash:        ') + chalk.greenBright(gitCommitShortHash));
  core.info(chalk.cyanBright('Git commit long hash:         ') + chalk.greenBright(gitCommitLongHash));
  core.info(chalk.cyanBright('Git commit timestamp:         ') + chalk.greenBright(gitCommitTimestamp));
};

try {
  await run();
} catch (error) {
  core.setFailed(`Action failed with error: ${error}`);
}
