import * as core from '@actions/core';
import chalk from 'chalk';

export function parseMavenVersion(mavenArtifactVersion: string) {
  const numericVersion = mavenArtifactVersion.split('-')[0] || mavenArtifactVersion;
  const versionComponents = numericVersion.split('.');
  const mavenArtifactMajorVersion = versionComponents[0] || '';
  const mavenArtifactMinorVersion = versionComponents[1] || '';
  const mavenArtifactPatchVersion = versionComponents[2] || '';
  const mavenIsSnapshot = mavenArtifactVersion.endsWith('-SNAPSHOT');
  core.setOutput('maven-artifact-major-version', mavenArtifactMajorVersion);
  core.setOutput('maven-artifact-minor-version', mavenArtifactMinorVersion);
  core.setOutput('maven-artifact-patch-version', mavenArtifactPatchVersion);
  core.setOutput('maven-is-snapshot', mavenIsSnapshot.toString());
  core.info(chalk.cyanBright('Maven artifact Major Version:  ') + chalk.greenBright(mavenArtifactMajorVersion));
  core.info(chalk.cyanBright('Maven artifact Minor Version:  ') + chalk.greenBright(mavenArtifactMinorVersion));
  core.info(chalk.cyanBright('Maven artifact Patch Version:  ') + chalk.greenBright(mavenArtifactPatchVersion));
  core.info(chalk.cyanBright('Maven is SNAPSHOT:             ') + chalk.greenBright(mavenIsSnapshot));
  return {mavenArtifactMajorVersion, mavenArtifactMinorVersion, mavenArtifactPatchVersion, mavenIsSnapshot};
}
