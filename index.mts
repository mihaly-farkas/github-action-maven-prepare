import * as core from '@actions/core';

try {
  core.setFailed('Maven Prepare GitHub Action is not implemented!');
} catch (error) {
  core.setFailed(`Action failed with error: ${error}`);
}
