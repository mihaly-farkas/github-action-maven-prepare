import * as core from '@actions/core';
import {getExecOutput} from '@actions/exec';
import chalk from 'chalk';

export const getMavenMetadata = async () => {
  const mvnOptions = {silent: true};
  const [groupIdResult, artifactIdResult, versionResult] = await Promise.all([
    getExecOutput('./mvnw', ['help:evaluate', '-Dexpression=project.groupId', '-q', '-DforceStdout'], mvnOptions),
    getExecOutput('./mvnw', ['help:evaluate', '-Dexpression=project.artifactId', '-q', '-DforceStdout'], mvnOptions),
    getExecOutput('./mvnw', ['help:evaluate', '-Dexpression=project.version', '-q', '-DforceStdout'], mvnOptions),
  ]);
  const mavenArtifactGroupId = groupIdResult.stdout.trim();
  const mavenArtifactId = artifactIdResult.stdout.trim();
  const mavenArtifactVersion = versionResult.stdout.trim();
  core.setOutput('maven-artifact-group-id', mavenArtifactGroupId);
  core.setOutput('maven-artifact-id', mavenArtifactId);
  core.setOutput('maven-artifact-version', mavenArtifactVersion);
  core.info(chalk.cyanBright('Maven artifact Group ID:       ') + chalk.greenBright(mavenArtifactGroupId));
  core.info(chalk.cyanBright('Maven artifact Artifact ID:    ') + chalk.greenBright(mavenArtifactId));
  core.info(chalk.cyanBright('Maven artifact Version:        ') + chalk.greenBright(mavenArtifactVersion));
  return {mavenArtifactGroupId, mavenArtifactId, mavenArtifactVersion, mvnOptions};
};
