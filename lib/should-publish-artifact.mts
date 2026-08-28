import * as core from '@actions/core';
import {getExecOutput} from '@actions/exec';
import chalk from 'chalk';

export interface ShouldPublishArtifactParams {
  mavenArtifactGroupId: string;
  mavenArtifactId: string;
  mavenArtifactVersion: string;
  mavenIsSnapshot: boolean;
  mvnOptions: {
    silent: boolean;
  };
}

const isMissingArtifactError = (mavenOutput: string): boolean => {
  const normalizedOutput = mavenOutput.toLowerCase();
  return (
    normalizedOutput.includes('could not find artifact') ||
    normalizedOutput.includes('was not found in') ||
    normalizedOutput.includes('missing:')
  );
};

export const shouldPublishArtifact = async (params: ShouldPublishArtifactParams) => {
  const {mavenArtifactGroupId, mavenArtifactId, mavenArtifactVersion, mavenIsSnapshot, mvnOptions} = params;

  let mavenArtifactPublish = true;
  if (!mavenIsSnapshot) {
    const dependencyArtifactCoordinate = `${mavenArtifactGroupId}:${mavenArtifactId}:${mavenArtifactVersion}`;
    const dependencyGetResult = await getExecOutput(
      './mvnw',
      ['dependency:get', `-Dartifact=${dependencyArtifactCoordinate}`, '--quiet'],
      {
        ...mvnOptions,
        ignoreReturnCode: true,
      },
    );
    if (dependencyGetResult.exitCode === 0) {
      mavenArtifactPublish = false;
    } else {
      const dependencyGetCombinedOutput = `${dependencyGetResult.stdout}\n${dependencyGetResult.stderr}`;
      if (!isMissingArtifactError(dependencyGetCombinedOutput)) {
        throw new Error(
          [
            `Failed to determine if release artifact is already published: ${dependencyArtifactCoordinate}`,
            `dependency:get exit code: ${dependencyGetResult.exitCode}`,
            `dependency:get output: ${dependencyGetCombinedOutput.trim() || '<empty>'}`,
          ].join('\n'),
        );
      }
    }
  }
  core.setOutput('maven-artifact-publish', mavenArtifactPublish.toString());
  core.info(chalk.cyanBright('Maven artifact should publish: ') + chalk.greenBright(mavenArtifactPublish));
  return mavenArtifactPublish;
};
