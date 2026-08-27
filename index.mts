import * as core from '@actions/core';
import {exec, getExecOutput} from '@actions/exec';
import * as github from '@actions/github';

const run = async () => {
  // Ensure the Maven Wrapper has executable permissions
  await exec('chmod', ['+x', './mvnw']);

  // Read the Maven project coordinates from the pom.xml file and expose them as action outputs
  const mvnOptions = {silent: true};
  const [groupIdResult, artifactIdResult, versionResult] = await Promise.all([
    getExecOutput('./mvnw', ['help:evaluate', '-Dexpression=project.groupId', '-q', '-DforceStdout'], mvnOptions),
    getExecOutput('./mvnw', ['help:evaluate', '-Dexpression=project.artifactId', '-q', '-DforceStdout'], mvnOptions),
    getExecOutput('./mvnw', ['help:evaluate', '-Dexpression=project.version', '-q', '-DforceStdout'], mvnOptions),
  ]);
  const groupId = groupIdResult.stdout.trim();
  const artifactId = artifactIdResult.stdout.trim();
  const version = versionResult.stdout.trim();
  core.setOutput('maven-group-id', groupId);
  core.setOutput('maven-artifact-id', artifactId);
  core.setOutput('maven-version', version);

  // Check if the Maven artifact id is the same as the GitHub repository name; if not, fail with error
  const githubRepositoryName = github.context.repo.repo.split('/').pop() || '';
  if (artifactId !== githubRepositoryName) {
    core.setFailed(
      `Maven artifact id "${artifactId}" does not match GitHub repository name "${githubRepositoryName}".`,
    );
    return;
  }
};

try {
  await run();
} catch (error) {
  core.setFailed(`Action failed with error: ${error}`);
}
