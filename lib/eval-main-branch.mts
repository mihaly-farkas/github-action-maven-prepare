import * as core from '@actions/core';
import {getExecOutput} from '@actions/exec';
import chalk from 'chalk';

export const evalMainBranch = async (gitOptions: {silent: boolean}) => {
  const mainBranch = core.getInput('main-branch');
  const gitBranchesResult = await getExecOutput('git', ['branch', '--all', '--contains', 'HEAD'], {
    ...gitOptions,
    ignoreReturnCode: true,
  });
  const gitBranches = gitBranchesResult.stdout
    .split('\n')
    .map(line => line.replace(/^\*\s*/, '').trim())
    .filter(line => line.length > 0 && !line.startsWith('(HEAD detached'));
  core.debug(`Input 'main-branch': ${mainBranch}`);
  core.debug(`Branches containing HEAD (raw): ${JSON.stringify(gitBranchesResult.stdout)}`);
  core.debug(`Branches containing HEAD (parsed): ${JSON.stringify(gitBranches)}`);
  const isOnMainBranch = gitBranches.some(branch => {
    if (branch === mainBranch) {
      return true;
    }
    if (!branch.startsWith('remotes/')) {
      return false;
    }
    const remoteBranch = branch.slice('remotes/'.length);
    const remoteSeparatorIndex = remoteBranch.indexOf('/');
    if (remoteSeparatorIndex < 0) {
      return false;
    }
    return remoteBranch.slice(remoteSeparatorIndex + 1) === mainBranch;
  });
  core.debug(`Main branch input: ${mainBranch}; isOnMainBranch: ${isOnMainBranch.toString()}`);
  core.setOutput('git-is-main-branch', isOnMainBranch.toString());
  core.info(chalk.cyanBright('Is on main branch:             ') + chalk.greenBright(isOnMainBranch.toString()));
  return {mainBranch, isOnMainBranch};
};
