import { test, expect, vi, type Mock } from 'vitest';
import * as core from '@actions/core';
import { exec } from "@actions/exec";

vi.mock('@actions/core', () => ({
  setFailed: vi.fn(),
}));

vi.mock('@actions/exec', () => ({
  exec: vi.fn(),
}));

async function importAction(): Promise<void> {
  vi.resetModules();
  await import('./index.mts');
}

beforeEach(() => {
  vi.clearAllMocks();
});

test('Maven Prepare GitHub Action ensures the Maven Wrapper has executable permissions', async () => {
  // ACT
  await importAction();

  // ASSERT
  expect(exec).toHaveBeenCalledWith('chmod', ['+x', './mvnw']);
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

test('Maven Prepare GitHub Action fails (not implemented yet)', async () => {
  // ACT
  await importAction();

  // ASSERT
  expect(core.setFailed).toHaveBeenCalledTimes(1);
  expect(core.setFailed).toHaveBeenCalledWith(
    'Maven Prepare GitHub Action is not implemented yet!'
  );
});
