import {test, expect, vi, type Mock} from 'vitest';
import * as core from '@actions/core';
import {exec, getExecOutput} from '@actions/exec';
import * as github from '@actions/github';
import chalk from 'chalk';

vi.mock('@actions/core', () => ({
  setFailed: vi.fn(),
  setOutput: vi.fn(),
  info: vi.fn(),
  debug: vi.fn(),
  getInput: vi.fn(),
}));

vi.mock('@actions/exec', () => ({
  exec: vi.fn(),
  getExecOutput: vi.fn(),
}));

vi.mock('@actions/github', () => ({
  context: {
    repo: {
      repo: 'owner/my-app',
    },
  },
}));

async function importAction(): Promise<void> {
  vi.resetModules();
  await import('./index.mts');
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(core.getInput).mockReturnValue('main');
  (getExecOutput as unknown as Mock).mockResolvedValue({stdout: '', stderr: '', exitCode: 0});
});

test('Maven Prepare GitHub Action ensures the Maven Wrapper has executable permissions', async () => {
  // ACT
  await importAction();

  // ASSERT
  expect(exec).toHaveBeenCalledWith('chmod', ['+x', './mvnw']);
});

test('Maven Prepare GitHub Action reads the Maven project coordinates from the pom.xml file and exposes them as action outputs', async () => {
  // ARRANGE
  const mavenGroupId = 'com.example';
  const mavenArtifactId = 'my-app';
  const mavenVersion = '1.2.3-SNAPSHOT';

  (getExecOutput as unknown as Mock).mockImplementation((cmd: string, args: string[]) => {
    if (
      cmd === './mvnw' &&
      JSON.stringify(args) === JSON.stringify(['help:evaluate', '-Dexpression=project.groupId', '-q', '-DforceStdout'])
    ) {
      return Promise.resolve({stdout: mavenGroupId, stderr: '', exitCode: 0});
    }
    if (
      cmd === './mvnw' &&
      JSON.stringify(args) ===
        JSON.stringify(['help:evaluate', '-Dexpression=project.artifactId', '-q', '-DforceStdout'])
    ) {
      return Promise.resolve({stdout: mavenArtifactId, stderr: '', exitCode: 0});
    }
    if (
      cmd === './mvnw' &&
      JSON.stringify(args) === JSON.stringify(['help:evaluate', '-Dexpression=project.version', '-q', '-DforceStdout'])
    ) {
      return Promise.resolve({stdout: mavenVersion, stderr: '', exitCode: 0});
    }
    return Promise.resolve({stdout: '', stderr: '', exitCode: 0});
  });

  // ACT
  await importAction();

  // ASSERT
  expect(core.setOutput).toHaveBeenCalledWith('maven-artifact-group-id', mavenGroupId);
  expect(core.setOutput).toHaveBeenCalledWith('maven-artifact-artifact-id', mavenArtifactId);
  expect(core.setOutput).toHaveBeenCalledWith('maven-artifact-version', mavenVersion);
  expect(core.setOutput).toHaveBeenCalledWith('maven-artifact-major-version', '1');
  expect(core.setOutput).toHaveBeenCalledWith('maven-artifact-minor-version', '2');
  expect(core.setOutput).toHaveBeenCalledWith('maven-artifact-patch-version', '3');
  expect(core.setOutput).toHaveBeenCalledWith('maven-is-snapshot', 'true');
  expect(core.info).toHaveBeenCalledWith(
    chalk.cyanBright('Maven artifact Group ID:       ') + chalk.greenBright(mavenGroupId),
  );
  expect(core.info).toHaveBeenCalledWith(
    chalk.cyanBright('Maven artifact Artifact ID:    ') + chalk.greenBright(mavenArtifactId),
  );
  expect(core.info).toHaveBeenCalledWith(
    chalk.cyanBright('Maven artifact Version:        ') + chalk.greenBright(mavenVersion),
  );
  expect(core.info).toHaveBeenCalledWith(chalk.cyanBright('Maven artifact Major Version:  ') + chalk.greenBright('1'));
  expect(core.info).toHaveBeenCalledWith(chalk.cyanBright('Maven artifact Minor Version:  ') + chalk.greenBright('2'));
  expect(core.info).toHaveBeenCalledWith(chalk.cyanBright('Maven artifact Patch Version:  ') + chalk.greenBright('3'));
  expect(core.info).toHaveBeenCalledWith(
    chalk.cyanBright('Maven is SNAPSHOT:             ') + chalk.greenBright('true'),
  );
});

test('Maven Prepare GitHub Action fails when exec throws an error', async () => {
  // ARRANGE
  const errorMessage = 'Simulated exec error';

  (exec as unknown as Mock).mockImplementationOnce(() => {
    throw new Error(errorMessage);
  });

  // ACT
  await importAction();

  // ASSERT
  expect(core.setFailed).toHaveBeenCalledTimes(1);
  expect(core.setFailed).toHaveBeenCalledWith(`Action failed with error: Error: ${errorMessage}`);
});

test('Maven Prepare GitHub Action does not fail when the Maven artifact id matches the GitHub repository name', async () => {
  // ARRANGE
  const repositoryName = 'github-action-maven-prepare';

  vi.mocked(github.context).repo.repo = repositoryName;

  (getExecOutput as unknown as Mock).mockImplementation((cmd: string, args: string[]) => {
    if (
      cmd === './mvnw' &&
      JSON.stringify(args) ===
        JSON.stringify(['help:evaluate', '-Dexpression=project.artifactId', '-q', '-DforceStdout'])
    ) {
      return Promise.resolve({stdout: repositoryName, stderr: '', exitCode: 0});
    }
    return Promise.resolve({stdout: '', stderr: '', exitCode: 0});
  });

  // ACT
  await importAction();

  // ASSERT
  expect(core.setFailed).not.toHaveBeenCalledWith(expect.stringContaining('does not match GitHub repository name'));
});

test('Maven Prepare GitHub Action fails when the Maven artifact id does not match the GitHub repository name', async () => {
  // ARRANGE
  const repoName = github.context.repo.repo.split('/').pop() || '';
  const artifactId = 'different-artifact-id';

  (getExecOutput as unknown as Mock).mockImplementation((cmd: string, args: string[]) => {
    if (
      cmd === './mvnw' &&
      JSON.stringify(args) ===
        JSON.stringify(['help:evaluate', '-Dexpression=project.artifactId', '-q', '-DforceStdout'])
    ) {
      return Promise.resolve({stdout: artifactId, stderr: '', exitCode: 0});
    }
    return Promise.resolve({stdout: '', stderr: '', exitCode: 0});
  });

  // ACT
  await importAction();

  // ASSERT
  expect(core.setFailed).toHaveBeenCalledWith(
    `Maven artifact id "${artifactId}" does not match GitHub repository name "${repoName}".`,
  );
});

test('Maven Prepare GitHub Action reads git metadata and exposes them as action outputs', async () => {
  // ARRANGE
  const repositoryName = github.context.repo.repo.split('/').pop() || '';
  const gitCommitShortHash = 'abc1234';
  const gitCommitLongHash = 'abc1234567890abcdef0123456789abfdef01234';
  const gitCommitTimestamp = '1787864679';

  (getExecOutput as unknown as Mock).mockImplementation((cmd: string, args: string[]) => {
    if (
      cmd === './mvnw' &&
      JSON.stringify(args) ===
        JSON.stringify(['help:evaluate', '-Dexpression=project.artifactId', '-q', '-DforceStdout'])
    ) {
      return Promise.resolve({stdout: repositoryName, stderr: '', exitCode: 0});
    }
    if (cmd === 'git' && JSON.stringify(args) === JSON.stringify(['rev-parse', '--short', 'HEAD'])) {
      return Promise.resolve({stdout: gitCommitShortHash, stderr: '', exitCode: 0});
    }
    if (cmd === 'git' && JSON.stringify(args) === JSON.stringify(['rev-parse', 'HEAD'])) {
      return Promise.resolve({stdout: gitCommitLongHash, stderr: '', exitCode: 0});
    }
    if (cmd === 'git' && JSON.stringify(args) === JSON.stringify(['show', '-s', '--format=%ct', 'HEAD'])) {
      return Promise.resolve({stdout: gitCommitTimestamp, stderr: '', exitCode: 0});
    }
    return Promise.resolve({stdout: '', stderr: '', exitCode: 0});
  });

  // ACT
  await importAction();

  // ASSERT
  expect(core.setOutput).toHaveBeenCalledWith('git-commit-short-hash', gitCommitShortHash);
  expect(core.setOutput).toHaveBeenCalledWith('git-commit-long-hash', gitCommitLongHash);
  expect(core.setOutput).toHaveBeenCalledWith('git-commit-timestamp', gitCommitTimestamp);
  expect(core.info).toHaveBeenCalledWith(
    chalk.cyanBright('Git commit short hash:         ') + chalk.greenBright(gitCommitShortHash),
  );
  expect(core.info).toHaveBeenCalledWith(
    chalk.cyanBright('Git commit long hash:          ') + chalk.greenBright(gitCommitLongHash),
  );
  expect(core.info).toHaveBeenCalledWith(
    chalk.cyanBright('Git commit timestamp:          ') + chalk.greenBright(gitCommitTimestamp),
  );
});

test('Maven Prepare GitHub Action sets git-is-main-branch output to true when current branch matches main-branch input', async () => {
  // ARRANGE
  const repositoryName = github.context.repo.repo.split('/').pop() || '';
  const mainBranch = 'main';

  vi.mocked(core.getInput).mockReturnValue(mainBranch);

  (getExecOutput as unknown as Mock).mockImplementation((cmd: string, args: string[]) => {
    if (
      cmd === './mvnw' &&
      JSON.stringify(args) ===
        JSON.stringify(['help:evaluate', '-Dexpression=project.artifactId', '-q', '-DforceStdout'])
    ) {
      return Promise.resolve({stdout: repositoryName, stderr: '', exitCode: 0});
    }
    if (cmd === 'git' && JSON.stringify(args) === JSON.stringify(['branch', '--all', '--contains', 'HEAD'])) {
      return Promise.resolve({stdout: `* ${mainBranch}\n`, stderr: '', exitCode: 0});
    }
    return Promise.resolve({stdout: '', stderr: '', exitCode: 0});
  });

  // ACT
  await importAction();

  // ASSERT
  expect(core.setOutput).toHaveBeenCalledWith('git-is-main-branch', 'true');
  expect(core.info).toHaveBeenCalledWith(
    chalk.cyanBright('Is on main branch:             ') + chalk.greenBright('true'),
  );
});

test('Maven Prepare GitHub Action sets git-is-main-branch output to false when current branch differs from main-branch input', async () => {
  // ARRANGE
  const repositoryName = github.context.repo.repo.split('/').pop() || '';

  vi.mocked(core.getInput).mockReturnValue('main');

  (getExecOutput as unknown as Mock).mockImplementation((cmd: string, args: string[]) => {
    if (
      cmd === './mvnw' &&
      JSON.stringify(args) ===
        JSON.stringify(['help:evaluate', '-Dexpression=project.artifactId', '-q', '-DforceStdout'])
    ) {
      return Promise.resolve({stdout: repositoryName, stderr: '', exitCode: 0});
    }
    if (cmd === 'git' && JSON.stringify(args) === JSON.stringify(['branch', '--all', '--contains', 'HEAD'])) {
      return Promise.resolve({stdout: '* feature/my-branch\n', stderr: '', exitCode: 0});
    }
    return Promise.resolve({stdout: '', stderr: '', exitCode: 0});
  });

  // ACT
  await importAction();

  // ASSERT
  expect(core.setOutput).toHaveBeenCalledWith('git-is-main-branch', 'false');
  expect(core.info).toHaveBeenCalledWith(
    chalk.cyanBright('Is on main branch:             ') + chalk.greenBright('false'),
  );
});

test('Maven Prepare GitHub Action sets git-is-main-branch output to true in detached HEAD when commit is contained in origin/main', async () => {
  // ARRANGE
  const repositoryName = github.context.repo.repo.split('/').pop() || '';

  vi.mocked(core.getInput).mockReturnValue('main');

  (getExecOutput as unknown as Mock).mockImplementation((cmd: string, args: string[]) => {
    if (
      cmd === './mvnw' &&
      JSON.stringify(args) ===
        JSON.stringify(['help:evaluate', '-Dexpression=project.artifactId', '-q', '-DforceStdout'])
    ) {
      return Promise.resolve({stdout: repositoryName, stderr: '', exitCode: 0});
    }
    if (cmd === 'git' && JSON.stringify(args) === JSON.stringify(['branch', '--all', '--contains', 'HEAD'])) {
      return Promise.resolve({
        stdout: '* (HEAD detached at abc1234)\n  remotes/origin/main\n',
        stderr: '',
        exitCode: 0,
      });
    }
    return Promise.resolve({stdout: '', stderr: '', exitCode: 0});
  });

  // ACT
  await importAction();

  // ASSERT
  expect(core.setOutput).toHaveBeenCalledWith('git-is-main-branch', 'true');
  expect(core.info).toHaveBeenCalledWith(
    chalk.cyanBright('Is on main branch:             ') + chalk.greenBright('true'),
  );
});

test('Maven Prepare GitHub Action sets git-is-main-branch output to false in detached HEAD when commit is not contained in main branch', async () => {
  // ARRANGE
  const repositoryName = github.context.repo.repo.split('/').pop() || '';

  vi.mocked(core.getInput).mockReturnValue('main');

  (getExecOutput as unknown as Mock).mockImplementation((cmd: string, args: string[]) => {
    if (
      cmd === './mvnw' &&
      JSON.stringify(args) ===
        JSON.stringify(['help:evaluate', '-Dexpression=project.artifactId', '-q', '-DforceStdout'])
    ) {
      return Promise.resolve({stdout: repositoryName, stderr: '', exitCode: 0});
    }
    if (cmd === 'git' && JSON.stringify(args) === JSON.stringify(['branch', '--all', '--contains', 'HEAD'])) {
      return Promise.resolve({
        stdout: '* (HEAD detached at abc1234)\n  remotes/origin/feature/my-branch\n',
        stderr: '',
        exitCode: 0,
      });
    }
    return Promise.resolve({stdout: '', stderr: '', exitCode: 0});
  });

  // ACT
  await importAction();

  // ASSERT
  expect(core.setOutput).toHaveBeenCalledWith('git-is-main-branch', 'false');
  expect(core.info).toHaveBeenCalledWith(
    chalk.cyanBright('Is on main branch:             ') + chalk.greenBright('false'),
  );
});

test('Maven Prepare GitHub Action sets maven-artifact-publish to false when a release artifact is already published', async () => {
  // ARRANGE
  const repositoryName = github.context.repo.repo.split('/').pop() || '';
  const mavenGroupId = 'com.example';
  const mavenVersion = '1.2.3';

  (getExecOutput as unknown as Mock).mockImplementation((cmd: string, args: string[]) => {
    if (
      cmd === './mvnw' &&
      JSON.stringify(args) === JSON.stringify(['help:evaluate', '-Dexpression=project.groupId', '-q', '-DforceStdout'])
    ) {
      return Promise.resolve({stdout: mavenGroupId, stderr: '', exitCode: 0});
    }
    if (
      cmd === './mvnw' &&
      JSON.stringify(args) ===
        JSON.stringify(['help:evaluate', '-Dexpression=project.artifactId', '-q', '-DforceStdout'])
    ) {
      return Promise.resolve({stdout: repositoryName, stderr: '', exitCode: 0});
    }
    if (
      cmd === './mvnw' &&
      JSON.stringify(args) === JSON.stringify(['help:evaluate', '-Dexpression=project.version', '-q', '-DforceStdout'])
    ) {
      return Promise.resolve({stdout: mavenVersion, stderr: '', exitCode: 0});
    }
    if (
      cmd === './mvnw' &&
      JSON.stringify(args) ===
        JSON.stringify(['dependency:get', `-Dartifact=${mavenGroupId}:${repositoryName}:${mavenVersion}`, '--quiet'])
    ) {
      return Promise.resolve({stdout: '', stderr: '', exitCode: 0});
    }
    return Promise.resolve({stdout: '', stderr: '', exitCode: 0});
  });

  // ACT
  await importAction();

  // ASSERT
  expect(core.setOutput).toHaveBeenCalledWith('maven-artifact-publish', 'false');
  expect(core.info).toHaveBeenCalledWith(
    chalk.cyanBright('Maven artifact should publish: ') + chalk.greenBright('false'),
  );
});

test('Maven Prepare GitHub Action sets maven-artifact-publish to true when a release artifact is not published yet', async () => {
  // ARRANGE
  const repositoryName = github.context.repo.repo.split('/').pop() || '';
  const mavenGroupId = 'com.example';
  const mavenVersion = '1.2.3';

  (getExecOutput as unknown as Mock).mockImplementation((cmd: string, args: string[]) => {
    if (
      cmd === './mvnw' &&
      JSON.stringify(args) === JSON.stringify(['help:evaluate', '-Dexpression=project.groupId', '-q', '-DforceStdout'])
    ) {
      return Promise.resolve({stdout: mavenGroupId, stderr: '', exitCode: 0});
    }
    if (
      cmd === './mvnw' &&
      JSON.stringify(args) ===
        JSON.stringify(['help:evaluate', '-Dexpression=project.artifactId', '-q', '-DforceStdout'])
    ) {
      return Promise.resolve({stdout: repositoryName, stderr: '', exitCode: 0});
    }
    if (
      cmd === './mvnw' &&
      JSON.stringify(args) === JSON.stringify(['help:evaluate', '-Dexpression=project.version', '-q', '-DforceStdout'])
    ) {
      return Promise.resolve({stdout: mavenVersion, stderr: '', exitCode: 0});
    }
    if (
      cmd === './mvnw' &&
      JSON.stringify(args) ===
        JSON.stringify(['dependency:get', `-Dartifact=${mavenGroupId}:${repositoryName}:${mavenVersion}`, '--quiet'])
    ) {
      return Promise.resolve({stdout: '', stderr: '', exitCode: 1});
    }
    return Promise.resolve({stdout: '', stderr: '', exitCode: 0});
  });

  // ACT
  await importAction();

  // ASSERT
  expect(core.setOutput).toHaveBeenCalledWith('maven-artifact-publish', 'true');
  expect(core.info).toHaveBeenCalledWith(
    chalk.cyanBright('Maven artifact should publish: ') + chalk.greenBright('true'),
  );
});
