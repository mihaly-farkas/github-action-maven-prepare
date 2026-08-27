import * as core from '@actions/core';
import { exec } from '@actions/exec';

try {
  // Ensure the Maven Wrapper has executable permissions
  await exec('chmod', ['+x', './mvnw']);

  core.setFailed('Maven Prepare GitHub Action is not implemented!');
} catch (error) {
  core.setFailed(`Action failed with error: ${error}`);
}
