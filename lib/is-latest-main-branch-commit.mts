import * as core from '@actions/core';
import {getExecOutput} from '@actions/exec';
import chalk from 'chalk';

export interface IsLatestMainBranchCommit {
  gitCommitLongHash: string;
  mainBranch: string;
  isOnMainBranch: boolean;
  gitOptions: {
    silent: boolean;
  };
}

export const isLatestMainBranchCommit = async (params: IsLatestMainBranchCommit) => {
  const {gitCommitLongHash, mainBranch, isOnMainBranch, gitOptions} = params;

  const mainBranchReferenceCandidates = [`refs/remotes/origin/${mainBranch}`, `refs/heads/${mainBranch}`, mainBranch];
  let mainBranchHeadHash = '';
  for (const candidate of mainBranchReferenceCandidates) {
    const candidateHeadResult = await getExecOutput('git', ['rev-parse', candidate], {
      ...gitOptions,
      ignoreReturnCode: true,
    });
    if (candidateHeadResult.exitCode === 0) {
      mainBranchHeadHash = candidateHeadResult.stdout.trim();
      break;
    }
  }
  const gitIsLatestMainBranchCommit =
    isOnMainBranch && mainBranchHeadHash.length > 0 && gitCommitLongHash === mainBranchHeadHash;
  core.setOutput('git-is-latest-main-branch-commit', gitIsLatestMainBranchCommit.toString());
  core.info(
    chalk.cyanBright('Is latest main branch commit:  ') + chalk.greenBright(gitIsLatestMainBranchCommit.toString()),
  );
  return gitIsLatestMainBranchCommit;
};
