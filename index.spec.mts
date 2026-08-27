import { test, expect, vi, type Mock } from 'vitest';
import * as core from '@actions/core';
import { exec, getExecOutput } from '@actions/exec';

vi.mock('@actions/core', () => ({
  setFailed: vi.fn(),
  setOutput: vi.fn(),
}));

vi.mock('@actions/exec', () => ({
  exec: vi.fn(),
  getExecOutput: vi.fn(),
}));

async function importAction(): Promise<void> {
  vi.resetModules();
  await import('./index.mts');
}

beforeEach(() => {
  vi.clearAllMocks();
  (getExecOutput as unknown as Mock).mockResolvedValue({ stdout: '', stderr: '', exitCode: 0 });
});

test('Maven Prepare GitHub Action ensures the Maven Wrapper has executable permissions', async () => {
  // ACT
  await importAction();

  // ASSERT
  expect(exec).toHaveBeenCalledWith('chmod', ['+x', './mvnw']);
});

test('Maven Prepare GitHub Action reads the Maven project coordinates from the pom.xml file and exposes them as action outputs', async () => {
  // ARRANGE
  const mockGroupId = 'com.example';
  const mockArtifactId = 'my-app';
  const mockVersion = '1.2.3-SNAPSHOT';

  (getExecOutput as unknown as Mock).mockImplementation((cmd: string, args: string[]) => {
    if (cmd === './mvnw' && JSON.stringify(args) === JSON.stringify(['help:evaluate', '-Dexpression=project.groupId', '-q', '-DforceStdout'])) {
      return Promise.resolve({ stdout: mockGroupId, stderr: '', exitCode: 0 });
    }
    if (cmd === './mvnw' && JSON.stringify(args) === JSON.stringify(['help:evaluate', '-Dexpression=project.artifactId', '-q', '-DforceStdout'])) {
      return Promise.resolve({ stdout: mockArtifactId, stderr: '', exitCode: 0 });
    }
    if (cmd === './mvnw' && JSON.stringify(args) === JSON.stringify(['help:evaluate', '-Dexpression=project.version', '-q', '-DforceStdout'])) {
      return Promise.resolve({ stdout: mockVersion, stderr: '', exitCode: 0 });
    }
    return Promise.resolve({ stdout: '', stderr: '', exitCode: 0 });
  });

  // ACT
  await importAction();

  // ASSERT
  expect(core.setOutput).toHaveBeenCalledWith('maven-group-id', mockGroupId);
  expect(core.setOutput).toHaveBeenCalledWith('maven-artifact-id', mockArtifactId);
  expect(core.setOutput).toHaveBeenCalledWith('maven-version', mockVersion);
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
  expect(core.setFailed).toHaveBeenCalledWith(
    `Action failed with error: Error: ${errorMessage}`
  );
});
