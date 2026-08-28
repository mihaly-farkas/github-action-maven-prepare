import {expect, type Mock, test, vi} from 'vitest';
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
  summary: {
    addHeading: vi.fn().mockReturnThis(),
    addRaw: vi.fn().mockReturnThis(),
    addEOL: vi.fn().mockReturnThis(),
    write: vi.fn().mockResolvedValue(undefined),
  },
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

const importAction = async (): Promise<void> => {
  vi.resetModules();
  await import('./index.mts');
};

type ExecOutput = {stdout: string; stderr: string; exitCode: number};

const execOutputOk = (stdout = ''): ExecOutput => ({stdout, stderr: '', exitCode: 0});

const execOutputFailure = (exitCode = 1): ExecOutput => ({stdout: '', stderr: '', exitCode});

const responseKey = (cmd: string, args: string[]): string => `${cmd}::${JSON.stringify(args)}`;

const mockExecOutputResponses = (responses: Record<string, ExecOutput>): void => {
  (getExecOutput as unknown as Mock).mockImplementation((cmd: string, args: string[]) => {
    const key = responseKey(cmd, args);
    return Promise.resolve(responses[key] ?? execOutputOk());
  });
};

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
  expect(core.setOutput).toHaveBeenCalledWith('maven-artifact-id', mavenArtifactId);
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

test.each([
  {
    scenario: 'commit is contained in origin/main',
    gitBranchOutput: '* (HEAD detached at abc1234)\n  remotes/origin/main\n',
    expectedIsMainBranch: 'true',
  },
  {
    scenario: 'remote branch has no slash after remote name',
    gitBranchOutput: '  remotes/origin\n',
    expectedIsMainBranch: 'false',
  },
  {
    scenario: 'commit is not contained in main branch',
    gitBranchOutput: '* (HEAD detached at abc1234)\n  remotes/origin/feature/my-branch\n',
    expectedIsMainBranch: 'false',
  },
])(
  'Maven Prepare GitHub Action sets git-is-main-branch output in detached HEAD when $scenario',
  async ({gitBranchOutput, expectedIsMainBranch}) => {
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
        return Promise.resolve({stdout: gitBranchOutput, stderr: '', exitCode: 0});
      }
      return Promise.resolve({stdout: '', stderr: '', exitCode: 0});
    });

    // ACT
    await importAction();

    // ASSERT
    expect(core.setOutput).toHaveBeenCalledWith('git-is-main-branch', expectedIsMainBranch);
    expect(core.info).toHaveBeenCalledWith(
      chalk.cyanBright('Is on main branch:             ') + chalk.greenBright(expectedIsMainBranch),
    );
  },
);

test('Maven Prepare GitHub Action sets maven-artifact-publish to false when a release artifact is already published', async () => {
  // ARRANGE
  const repositoryName = github.context.repo.repo.split('/').pop() || '';
  const mavenGroupId = 'com.example';
  const mavenVersion = '1.2.3';
  mockExecOutputResponses({
    [responseKey('./mvnw', ['help:evaluate', '-Dexpression=project.groupId', '-q', '-DforceStdout'])]:
      execOutputOk(mavenGroupId),
    [responseKey('./mvnw', ['help:evaluate', '-Dexpression=project.artifactId', '-q', '-DforceStdout'])]:
      execOutputOk(repositoryName),
    [responseKey('./mvnw', ['help:evaluate', '-Dexpression=project.version', '-q', '-DforceStdout'])]:
      execOutputOk(mavenVersion),
    [responseKey('./mvnw', [
      'dependency:get',
      `-Dartifact=${mavenGroupId}:${repositoryName}:${mavenVersion}`,
      '--quiet',
    ])]: execOutputOk(),
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
  mockExecOutputResponses({
    [responseKey('./mvnw', ['help:evaluate', '-Dexpression=project.groupId', '-q', '-DforceStdout'])]:
      execOutputOk(mavenGroupId),
    [responseKey('./mvnw', ['help:evaluate', '-Dexpression=project.artifactId', '-q', '-DforceStdout'])]:
      execOutputOk(repositoryName),
    [responseKey('./mvnw', ['help:evaluate', '-Dexpression=project.version', '-q', '-DforceStdout'])]:
      execOutputOk(mavenVersion),
    [responseKey('./mvnw', [
      'dependency:get',
      `-Dartifact=${mavenGroupId}:${repositoryName}:${mavenVersion}`,
      '--quiet',
    ])]: execOutputFailure(),
  });

  // ACT
  await importAction();

  // ASSERT
  expect(core.setOutput).toHaveBeenCalledWith('maven-artifact-publish', 'true');
  expect(core.info).toHaveBeenCalledWith(
    chalk.cyanBright('Maven artifact should publish: ') + chalk.greenBright('true'),
  );
});

test('Maven Prepare GitHub Action sets git-is-latest-main-branch-commit to true when HEAD equals main branch tip', async () => {
  // ARRANGE
  const repositoryName = github.context.repo.repo.split('/').pop() || '';
  const gitCommitLongHash = 'abc1234567890abcdef0123456789abfdef01234';
  mockExecOutputResponses({
    [responseKey('./mvnw', ['help:evaluate', '-Dexpression=project.artifactId', '-q', '-DforceStdout'])]:
      execOutputOk(repositoryName),
    [responseKey('git', ['branch', '--all', '--contains', 'HEAD'])]: execOutputOk('* main\n'),
    [responseKey('git', ['rev-parse', 'HEAD'])]: execOutputOk(gitCommitLongHash),
    [responseKey('git', ['rev-parse', 'refs/remotes/origin/main'])]: execOutputOk(gitCommitLongHash),
  });

  // ACT
  await importAction();

  // ASSERT
  expect(core.setOutput).toHaveBeenCalledWith('git-is-latest-main-branch-commit', 'true');
  expect(core.info).toHaveBeenCalledWith(
    chalk.cyanBright('Is latest main branch commit:  ') + chalk.greenBright('true'),
  );
});

test('Maven Prepare GitHub Action sets docker-tags for snapshot main-branch head', async () => {
  // ARRANGE
  const repositoryName = github.context.repo.repo.split('/').pop() || '';
  const mavenVersion = '1.2.3-SNAPSHOT';
  const gitCommitLongHash = 'abc1234567890abcdef0123456789abfdef01234';
  const gitCommitTimestamp = '1787864679';
  mockExecOutputResponses({
    [responseKey('./mvnw', ['help:evaluate', '-Dexpression=project.groupId', '-q', '-DforceStdout'])]:
      execOutputOk('com.example'),
    [responseKey('./mvnw', ['help:evaluate', '-Dexpression=project.artifactId', '-q', '-DforceStdout'])]:
      execOutputOk(repositoryName),
    [responseKey('./mvnw', ['help:evaluate', '-Dexpression=project.version', '-q', '-DforceStdout'])]:
      execOutputOk(mavenVersion),
    [responseKey('git', ['show', '-s', '--format=%ct', 'HEAD'])]: execOutputOk(gitCommitTimestamp),
    [responseKey('git', ['branch', '--all', '--contains', 'HEAD'])]: execOutputOk('* main\n'),
    [responseKey('git', ['rev-parse', 'HEAD'])]: execOutputOk(gitCommitLongHash),
    [responseKey('git', ['rev-parse', 'refs/remotes/origin/main'])]: execOutputOk(gitCommitLongHash),
  });

  // ACT
  await importAction();

  // ASSERT
  expect(core.setOutput).toHaveBeenCalledWith(
    'docker-tags',
    'unstable beta 1-beta 1.2-beta 1.2.3-beta 1.2.3-beta.1787864679',
  );
  expect(core.setOutput).toHaveBeenCalledWith(
    'docker-metadata-action-tags',
    'type=raw,value=unstable\n' +
      'type=raw,value=beta\n' +
      'type=raw,value=1-beta\n' +
      'type=raw,value=1.2-beta\n' +
      'type=raw,value=1.2.3-beta\n' +
      'type=raw,value=1.2.3-beta.1787864679',
  );
});

test('Maven Prepare GitHub Action sets docker-tags for release main-branch head', async () => {
  // ARRANGE
  const repositoryName = github.context.repo.repo.split('/').pop() || '';
  const mavenVersion = '1.2.3';
  const gitCommitLongHash = 'abc1234567890abcdef0123456789abfdef01234';
  const gitCommitTimestamp = '1787864679';
  mockExecOutputResponses({
    [responseKey('./mvnw', ['help:evaluate', '-Dexpression=project.groupId', '-q', '-DforceStdout'])]:
      execOutputOk('com.example'),
    [responseKey('./mvnw', ['help:evaluate', '-Dexpression=project.artifactId', '-q', '-DforceStdout'])]:
      execOutputOk(repositoryName),
    [responseKey('./mvnw', ['help:evaluate', '-Dexpression=project.version', '-q', '-DforceStdout'])]:
      execOutputOk(mavenVersion),
    [responseKey('./mvnw', ['dependency:get', `-Dartifact=com.example:${repositoryName}:${mavenVersion}`, '--quiet'])]:
      execOutputFailure(),
    [responseKey('git', ['show', '-s', '--format=%ct', 'HEAD'])]: execOutputOk(gitCommitTimestamp),
    [responseKey('git', ['branch', '--all', '--contains', 'HEAD'])]: execOutputOk('* main\n'),
    [responseKey('git', ['rev-parse', 'HEAD'])]: execOutputOk(gitCommitLongHash),
    [responseKey('git', ['rev-parse', 'refs/remotes/origin/main'])]: execOutputOk(gitCommitLongHash),
  });

  // ACT
  await importAction();

  // ASSERT
  expect(core.setOutput).toHaveBeenCalledWith('docker-tags', 'latest 1 1.2 1.2.3 1.2.3+1787864679');
  expect(core.setOutput).toHaveBeenCalledWith(
    'docker-metadata-action-tags',
    'type=raw,value=latest\n' +
      'type=raw,value=1\n' +
      'type=raw,value=1.2\n' +
      'type=raw,value=1.2.3\n' +
      'type=raw,value=1.2.3+1787864679',
  );
});

test('Maven Prepare GitHub Action sets git-is-latest-main-branch-commit to false when all rev-parse candidates fail', async () => {
  // ARRANGE — covers the false branch of `if (candidateHeadResult.exitCode === 0)` (line 71)
  const repositoryName = github.context.repo.repo.split('/').pop() || '';
  const gitCommitLongHash = 'abc1234567890abcdef0123456789abfdef01234';
  mockExecOutputResponses({
    [responseKey('./mvnw', ['help:evaluate', '-Dexpression=project.artifactId', '-q', '-DforceStdout'])]:
      execOutputOk(repositoryName),
    [responseKey('git', ['branch', '--all', '--contains', 'HEAD'])]: execOutputOk('* main\n'),
    [responseKey('git', ['rev-parse', 'HEAD'])]: execOutputOk(gitCommitLongHash),
    // All three rev-parse candidates for the main branch head fail (exit code 1)
    [responseKey('git', ['rev-parse', 'refs/remotes/origin/main'])]: execOutputFailure(),
    [responseKey('git', ['rev-parse', 'refs/heads/main'])]: execOutputFailure(),
    [responseKey('git', ['rev-parse', 'main'])]: execOutputFailure(),
  });

  // ACT
  await importAction();

  // ASSERT
  expect(core.setOutput).toHaveBeenCalledWith('git-is-latest-main-branch-commit', 'false');
});

test('Maven Prepare GitHub Action sets github repository name to empty string when repo has no slash', async () => {
  // ARRANGE — covers the `|| ''` fallback on line 117 when pop() returns an empty string
  vi.mocked(github.context).repo.repo = '';

  (getExecOutput as unknown as Mock).mockImplementation((cmd: string, args: string[]) => {
    if (
      cmd === './mvnw' &&
      JSON.stringify(args) ===
        JSON.stringify(['help:evaluate', '-Dexpression=project.artifactId', '-q', '-DforceStdout'])
    ) {
      // artifactId 'my-app' won't match empty githubRepositoryName -> setFailed
      return Promise.resolve({stdout: 'my-app', stderr: '', exitCode: 0});
    }
    return Promise.resolve({stdout: '', stderr: '', exitCode: 0});
  });

  // ACT
  await importAction();

  // ASSERT – the empty githubRepositoryName triggers the mismatch error path
  expect(core.setFailed).toHaveBeenCalledWith(expect.stringContaining('does not match GitHub repository name ""'));
});

test('Maven Prepare GitHub Action fails with a non-Error thrown value', async () => {
  // ARRANGE — covers the `String(error)` branch in line 210
  const errorValue = 'plain string error';

  (exec as unknown as Mock).mockImplementationOnce(() => {
    throw errorValue;
  });

  // ACT
  await importAction();

  // ASSERT
  expect(core.setFailed).toHaveBeenCalledTimes(1);
  expect(core.setFailed).toHaveBeenCalledWith(`Action failed with error: ${errorValue}`);
});

test('Maven Prepare GitHub Action writes all outputs to the GitHub step summary', async () => {
  // ARRANGE
  const repositoryName = github.context.repo.repo.split('/').pop() || '';
  const mavenVersion = '1.2.3-SNAPSHOT';
  const gitCommitLongHash = 'abc1234567890abcdef0123456789abfdef01234';
  const gitCommitTimestamp = '1787864679';
  mockExecOutputResponses({
    [responseKey('./mvnw', ['help:evaluate', '-Dexpression=project.groupId', '-q', '-DforceStdout'])]:
      execOutputOk('com.example'),
    [responseKey('./mvnw', ['help:evaluate', '-Dexpression=project.artifactId', '-q', '-DforceStdout'])]:
      execOutputOk(repositoryName),
    [responseKey('./mvnw', ['help:evaluate', '-Dexpression=project.version', '-q', '-DforceStdout'])]:
      execOutputOk(mavenVersion),
    [responseKey('git', ['show', '-s', '--format=%ct', 'HEAD'])]: execOutputOk(gitCommitTimestamp),
    [responseKey('git', ['branch', '--all', '--contains', 'HEAD'])]: execOutputOk('* main\n'),
    [responseKey('git', ['rev-parse', 'HEAD'])]: execOutputOk(gitCommitLongHash),
    [responseKey('git', ['rev-parse', '--short', 'HEAD'])]: execOutputOk('abc1234'),
    [responseKey('git', ['rev-parse', 'refs/remotes/origin/main'])]: execOutputOk(gitCommitLongHash),
  });

  // ACT
  await importAction();

  // ASSERT
  expect(core.summary.addHeading).toHaveBeenCalledWith('Prepare Build Environment summary', 2);
  expect(core.summary.addRaw).toHaveBeenCalledWith('| Output | Value |\n');
  expect(core.summary.addRaw).toHaveBeenCalledWith('|---|---|\n');
  expect(core.summary.addRaw).toHaveBeenCalledWith(
    expect.stringContaining('| `git-is-latest-main-branch-commit` | `true` |'),
  );
  expect(core.summary.addRaw).toHaveBeenCalledWith(expect.stringContaining('| `docker-tags` | `unstable beta'));
  expect(core.summary.write).toHaveBeenCalledTimes(1);
});
