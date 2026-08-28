import * as core from '@actions/core';

export interface AddMarkdownSummaryParams {
  gitCommitShortHash: string;
  gitCommitLongHash: string;
  gitCommitTimestamp: string;
  isOnMainBranch: boolean;
  gitIsLatestMainBranchCommit: boolean;
  mavenArtifactGroupId: string;
  mavenArtifactId: string;
  mavenArtifactVersion: string;
  mavenArtifactMajorVersion: string;
  mavenArtifactMinorVersion: string;
  mavenArtifactPatchVersion: string;
  mavenIsSnapshot: boolean;
  mavenArtifactPublish: boolean;
  dockerTagsOutput: string;
  dockerMetadataActionTags: string;
}

export const escapeSummaryValue = (value: string): string =>
  value.replaceAll('|', String.raw`\|`).replaceAll('\n', '<br>');

export const addMarkdownSummary = async (params: AddMarkdownSummaryParams) => {
  const {
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
  } = params;

  const summaryRows: Array<[string, string]> = [
    ['git-commit-short-hash', gitCommitShortHash],
    ['git-commit-long-hash', gitCommitLongHash],
    ['git-commit-timestamp', gitCommitTimestamp],
    ['git-is-main-branch', isOnMainBranch.toString()],
    ['git-is-latest-main-branch-commit', gitIsLatestMainBranchCommit.toString()],
    ['maven-artifact-group-id', mavenArtifactGroupId],
    ['maven-artifact-id', mavenArtifactId],
    ['maven-artifact-version', mavenArtifactVersion],
    ['maven-artifact-major-version', mavenArtifactMajorVersion],
    ['maven-artifact-minor-version', mavenArtifactMinorVersion],
    ['maven-artifact-patch-version', mavenArtifactPatchVersion],
    ['maven-is-snapshot', mavenIsSnapshot.toString()],
    ['maven-artifact-publish', mavenArtifactPublish.toString()],
    ['docker-tags', dockerTagsOutput],
    ['docker-metadata-action-tags', dockerMetadataActionTags],
  ];
  const summaryBody = summaryRows
    .map(([name, value]) => `| \`${name}\` | \`${escapeSummaryValue(value)}\` |`)
    .join('\n');
  await core.summary
    .addHeading('Prepare Build Environment summary', 2)
    .addRaw('| Output | Value |\n')
    .addRaw('|---|---|\n')
    .addRaw(summaryBody)
    .addEOL()
    .write();
};
