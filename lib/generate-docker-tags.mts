import * as core from '@actions/core';
import chalk from 'chalk';

export interface GenerateDockerTagParams {
  gitCommitShortHash: string;
  gitCommitLongHash: string;
  gitCommitTimestamp: string;
  isOnMainBranch: boolean;
  gitIsLatestMainBranchCommit: boolean;
  mavenArtifactMajorVersion: string;
  mavenArtifactMinorVersion: string;
  mavenArtifactPatchVersion: string;
  mavenIsSnapshot: boolean;
}

export const generateDockerTags = (params: GenerateDockerTagParams) => {
  const {
    gitCommitShortHash,
    gitCommitLongHash,
    gitCommitTimestamp,
    isOnMainBranch,
    gitIsLatestMainBranchCommit,
    mavenArtifactMajorVersion,
    mavenArtifactMinorVersion,
    mavenArtifactPatchVersion,
    mavenIsSnapshot,
  } = params;

  const dockerTags: string[] = [];
  const canTagAsMain = isOnMainBranch && gitIsLatestMainBranchCommit;
  const releaseTag = `${mavenArtifactMajorVersion}.${mavenArtifactMinorVersion}.${mavenArtifactPatchVersion}`;
  const snapshotBetaTag = `${releaseTag}-beta`;
  if (mavenIsSnapshot && canTagAsMain) {
    dockerTags.push('unstable', snapshotBetaTag);
  }
  if (mavenIsSnapshot) {
    dockerTags.push(`${snapshotBetaTag}.${gitCommitTimestamp}`);
  }
  if (!mavenIsSnapshot && canTagAsMain) {
    dockerTags.push('latest', mavenArtifactMajorVersion, `${mavenArtifactMajorVersion}.${mavenArtifactMinorVersion}`);
  }
  if (!mavenIsSnapshot) {
    dockerTags.push(releaseTag);
  }
  dockerTags.push(`sha-${gitCommitShortHash}`, `sha-${gitCommitLongHash}`);
  const dockerTagsOutput = dockerTags.join(' ');
  core.setOutput('docker-tags', dockerTagsOutput);
  core.info(chalk.cyanBright('Docker tags:                   ') + chalk.greenBright(dockerTagsOutput));
  return {dockerTags, dockerTagsOutput};
};
