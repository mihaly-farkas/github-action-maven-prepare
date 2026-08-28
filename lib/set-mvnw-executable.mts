import {exec} from '@actions/exec';

export const setMvnwExecutable = async () => {
  await exec('chmod', ['+x', './mvnw']);
};
