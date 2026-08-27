import * as core from '@actions/core';
import { exec, getExecOutput } from '@actions/exec';

try {
  // Ensure the Maven Wrapper has executable permissions
  await exec('chmod', ['+x', './mvnw']);

  // Read the Maven project coordinates from the pom.xml file and expose them as action outputs
  const mvnOptions = { silent: true };
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

} catch (error) {
  core.setFailed(`Action failed with error: ${error}`);
}
