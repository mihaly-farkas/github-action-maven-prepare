import * as core from '@actions/core';
import chalk from 'chalk';
import {generateDockerTags} from './lib/generate-docker-tags.mts';
import {addMarkdownSummary} from './lib/add-markdown-summary.mts';
import {shouldPublishArtifact} from './lib/should-publish-artifact.mts';
import {setMvnwExecutable} from './lib/set-mvnw-executable.mts';
import {transformToDockerMetadataActionTags} from './lib/transform-to-docker-metadata-action-tags.mts';
import {getGitMetadata} from './lib/get-git-metadata.mts';
import {evalMainBranch} from './lib/eval-main-branch.mts';
import {isLatestMainBranchCommit} from './lib/is-latest-main-branch-commit.mts';
import {getMavenMetadata} from './lib/get-maven-metadata.mts';
import {parseMavenVersion} from './lib/parse-maven-version.mts';
import {verifyMavenArtifactId} from './lib/verify-maven-artifact-id.mts';

// Force colored output even when stdout is not detected as a TTY.
chalk.level = 1;

const run = async () => {
  await setMvnwExecutable();
  const {gitOptions, gitCommitShortHash, gitCommitLongHash, gitCommitTimestamp} = await getGitMetadata();
  const {mainBranch, isOnMainBranch} = await evalMainBranch(gitOptions);
  const gitIsLatestMainBranchCommit = await isLatestMainBranchCommit({
    gitCommitLongHash,
    mainBranch,
    isOnMainBranch,
    gitOptions,
  });
  const {mavenArtifactGroupId, mavenArtifactId, mavenArtifactVersion, mvnOptions} = await getMavenMetadata();
  const {mavenArtifactMajorVersion, mavenArtifactMinorVersion, mavenArtifactPatchVersion, mavenIsSnapshot} =
    parseMavenVersion(mavenArtifactVersion);
  verifyMavenArtifactId(mavenArtifactId);
  const mavenArtifactPublish = await shouldPublishArtifact({
    mavenIsSnapshot,
    mavenArtifactGroupId,
    mavenArtifactId,
    mavenArtifactVersion,
    mvnOptions,
  });
  const {dockerTags, dockerTagsOutput} = generateDockerTags({
    gitCommitShortHash,
    gitCommitLongHash,
    gitCommitTimestamp,
    isOnMainBranch,
    gitIsLatestMainBranchCommit,
    mavenArtifactMajorVersion,
    mavenArtifactMinorVersion,
    mavenArtifactPatchVersion,
    mavenIsSnapshot,
  });
  const dockerMetadataActionTags = transformToDockerMetadataActionTags(dockerTags);
  await addMarkdownSummary({
    gitCommitShortHash,
    gitCommitLongHash,
    gitCommitTimestamp,
    isOnMainBranch,
    gitIsLatestMainBranchCommit,
    mavenArtifactGroupId,
    mavenArtifactId,
    mavenArtifactVersion,
    mavenArtifactMajorVersion,
    mavenArtifactMinorVersion,
    mavenArtifactPatchVersion,
    mavenIsSnapshot,
    mavenArtifactPublish,
    dockerTagsOutput,
    dockerMetadataActionTags,
  });
};

try {
  await run();
} catch (error: unknown) {
  const errorMessage = error instanceof Error ? error.toString() : String(error);
  core.setFailed(`Action failed with ${errorMessage}`);
}
