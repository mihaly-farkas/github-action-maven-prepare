import { test, expect, vi, type Mock } from 'vitest';
import * as core from '@actions/core';

vi.mock('@actions/core', () => ({
  setFailed: vi.fn(),
}));

async function importAction(): Promise<void> {
  vi.resetModules();
  await import('./index.mts');
}

beforeEach(() => {
  vi.clearAllMocks();
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
