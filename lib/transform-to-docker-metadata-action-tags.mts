import * as core from '@actions/core';
import chalk from 'chalk';

export const transformToDockerMetadataActionTags = (dockerTags: string[]) => {
  const dockerMetadataActionTags = dockerTags.map(tag => `type=raw,value=${tag}`).join('\n');
  core.setOutput('docker-metadata-action-tags', dockerMetadataActionTags);
  core.info(
    chalk.cyanBright('Docker metadata-action tags:   ') +
      chalk.greenBright(dockerMetadataActionTags.replaceAll('\n', ' ')),
  );
  return dockerMetadataActionTags;
};
