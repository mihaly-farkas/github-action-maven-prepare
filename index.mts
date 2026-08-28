import * as core from '@actions/core';
import {exec, getExecOutput} from '@actions/exec';
import * as github from '@actions/github';
import chalk from 'chalk';

// Force colored output even when stdout is not detected as a TTY.
chalk.level = 1;

const escapeSummaryValue = (value: string): string => value.replaceAll('|', String.raw`\|`).replaceAll('\n', '<br>');

const run = async () => {
  // Ensure the Maven Wrapper has executable permissions
  await exec('chmod', ['+x', './mvnw']);

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
  core.info(chalk.cyanBright('Git commit short hash:         ') + chalk.greenBright(gitCommitShortHash));
  core.info(chalk.cyanBright('Git commit long hash:          ') + chalk.greenBright(gitCommitLongHash));
  core.info(chalk.cyanBright('Git commit timestamp:          ') + chalk.greenBright(gitCommitTimestamp));

  // Determine if the current Git commit is on the main branch  (even if it is a detached HEAD)
  const mainBranch = core.getInput('main-branch');
  const gitBranchesResult = await getExecOutput('git', ['branch', '--all', '--contains', 'HEAD'], {
    ...gitOptions,
    ignoreReturnCode: true,
  });
  const gitBranches = gitBranchesResult.stdout
    .split('\n')
    .map(line => line.replace(/^\*\s*/, '').trim())
    .filter(line => line.length > 0 && !line.startsWith('(HEAD detached'));
  core.debug(`Input 'main-branch': ${mainBranch}`);
  core.debug(`Branches containing HEAD (raw): ${JSON.stringify(gitBranchesResult.stdout)}`);
  core.debug(`Branches containing HEAD (parsed): ${JSON.stringify(gitBranches)}`);
  const isOnMainBranch = gitBranches.some(branch => {
    if (branch === mainBranch) {
      return true;
    }
    if (!branch.startsWith('remotes/')) {
      return false;
    }
    const remoteBranch = branch.slice('remotes/'.length);
    const remoteSeparatorIndex = remoteBranch.indexOf('/');
    if (remoteSeparatorIndex < 0) {
      return false;
    }
    return remoteBranch.slice(remoteSeparatorIndex + 1) === mainBranch;
  });
  core.debug(`Main branch input: ${mainBranch}; isOnMainBranch: ${isOnMainBranch.toString()}`);
  core.setOutput('git-is-main-branch', isOnMainBranch.toString());
  core.info(chalk.cyanBright('Is on main branch:             ') + chalk.greenBright(isOnMainBranch.toString()));

  // Determine if HEAD points to the latest commit on the main branch.
  const mainBranchReferenceCandidates = [`refs/remotes/origin/${mainBranch}`, `refs/heads/${mainBranch}`, mainBranch];
  let mainBranchHeadHash = '';
  for (const candidate of mainBranchReferenceCandidates) {
    const candidateHeadResult = await getExecOutput('git', ['rev-parse', candidate], {
      ...gitOptions,
      ignoreReturnCode: true,
    });
    if (candidateHeadResult.exitCode === 0) {
      mainBranchHeadHash = candidateHeadResult.stdout.trim();
      break;
    }
  }
  const gitIsLatestMainBranchCommit =
    isOnMainBranch && mainBranchHeadHash.length > 0 && gitCommitLongHash === mainBranchHeadHash;
  core.setOutput('git-is-latest-main-branch-commit', gitIsLatestMainBranchCommit.toString());
  core.info(
    chalk.cyanBright('Is latest main branch commit:  ') + chalk.greenBright(gitIsLatestMainBranchCommit.toString()),
  );

  // Read the Maven project coordinates from the pom.xml file and expose them as action outputs
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

  // Split Maven version into components and expose them as action outputs
  const numericVersion = mavenArtifactVersion.split('-')[0] || mavenArtifactVersion;
  const versionComponents = numericVersion.split('.');
  const mavenArtifactMajorVersion = versionComponents[0] || '';
  const mavenArtifactMinorVersion = versionComponents[1] || '';
  const mavenArtifactPatchVersion = versionComponents[2] || '';
  const mavenIsSnapshot = mavenArtifactVersion.endsWith('-SNAPSHOT').toString();
  core.setOutput('maven-artifact-major-version', mavenArtifactMajorVersion);
  core.setOutput('maven-artifact-minor-version', mavenArtifactMinorVersion);
  core.setOutput('maven-artifact-patch-version', mavenArtifactPatchVersion);
  core.setOutput('maven-is-snapshot', mavenIsSnapshot);
  core.info(chalk.cyanBright('Maven artifact Major Version:  ') + chalk.greenBright(mavenArtifactMajorVersion));
  core.info(chalk.cyanBright('Maven artifact Minor Version:  ') + chalk.greenBright(mavenArtifactMinorVersion));
  core.info(chalk.cyanBright('Maven artifact Patch Version:  ') + chalk.greenBright(mavenArtifactPatchVersion));
  core.info(chalk.cyanBright('Maven is SNAPSHOT:             ') + chalk.greenBright(mavenIsSnapshot));

  // Check if the Maven artifact id is the same as the GitHub repository name; if not, fail with error
  const githubRepositoryName = github.context.repo.repo.split('/').pop() || '';
  if (mavenArtifactId !== githubRepositoryName) {
    core.setFailed(
      `Maven artifact id "${mavenArtifactId}" does not match GitHub repository name "${githubRepositoryName}".`,
    );
    return;
  }

  // Determine if the Maven artifact should be published
  let mavenArtifactPublish = 'true';
  if (mavenIsSnapshot === 'false') {
    const dependencyGetResult = await getExecOutput(
      './mvnw',
      ['dependency:get', `-Dartifact=${mavenArtifactGroupId}:${mavenArtifactId}:${mavenArtifactVersion}`, '--quiet'],
      {
        ...mvnOptions,
        ignoreReturnCode: true,
      },
    );
    mavenArtifactPublish = (dependencyGetResult.exitCode !== 0).toString();
  }
  core.setOutput('maven-artifact-publish', mavenArtifactPublish);
  core.info(chalk.cyanBright('Maven artifact should publish: ') + chalk.greenBright(mavenArtifactPublish));

  // Determine Docker tags.
  const dockerTags: string[] = [];
  const canTagAsMain = isOnMainBranch && gitIsLatestMainBranchCommit;
  if (mavenIsSnapshot === 'true' && canTagAsMain) {
    dockerTags.push(
      'unstable',
      'beta',
      `${mavenArtifactMajorVersion}-beta`,
      `${mavenArtifactMajorVersion}.${mavenArtifactMinorVersion}-beta`,
      `${mavenArtifactMajorVersion}.${mavenArtifactMinorVersion}.${mavenArtifactPatchVersion}-beta`,
      `${mavenArtifactMajorVersion}.${mavenArtifactMinorVersion}.${mavenArtifactPatchVersion}` +
        `-beta.${gitCommitTimestamp}`,
    );
  }
  if (mavenIsSnapshot === 'false' && canTagAsMain) {
    dockerTags.push(
      'latest',
      mavenArtifactMajorVersion,
      `${mavenArtifactMajorVersion}.${mavenArtifactMinorVersion}`,
      `${mavenArtifactMajorVersion}.${mavenArtifactMinorVersion}.${mavenArtifactPatchVersion}`,
      `${mavenArtifactMajorVersion}.${mavenArtifactMinorVersion}.${mavenArtifactPatchVersion}+${gitCommitTimestamp}`,
    );
  }
  const dockerTagsOutput = dockerTags.join(' ');
  core.setOutput('docker-tags', dockerTagsOutput);
  core.info(chalk.cyanBright('Docker tags:                   ') + chalk.greenBright(dockerTagsOutput));

  // Transform Docker tags to docker-metadata-action format
  const dockerMetadataActionTags = dockerTags.map(tag => `type=raw,value=${tag}`).join('\n');
  core.setOutput('docker-metadata-action-tags', dockerMetadataActionTags);
  core.info(
    chalk.cyanBright('Docker metadata-action tags:   ') +
      chalk.greenBright(dockerMetadataActionTags.replaceAll('\n', ' ')),
  );

  // Add a Markdown summary to the GitHub Actions step summary.
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
    ['maven-is-snapshot', mavenIsSnapshot],
    ['maven-artifact-publish', mavenArtifactPublish],
    ['docker-tags', dockerTagsOutput],
    ['docker-metadata-action-tags', dockerMetadataActionTags],
  ];
  const summaryBody = summaryRows
    .map(([name, value]) => `| \`${name}\` | \`${escapeSummaryValue(value)}\` |`)
    .join('\n');
  await core.summary
    .addHeading('Prepare Build Environment summary', 2)
    .addRaw('\n')
    .addRaw('| Output | Value |\n')
    .addRaw('|---|---|\n')
    .addRaw(summaryBody)
    .addEOL()
    .write();
};

try {
  await run();
} catch (error: unknown) {
  const errorMessage = error instanceof Error ? error.toString() : String(error);
  core.setFailed(`Action failed with error: ${errorMessage}`);
}
