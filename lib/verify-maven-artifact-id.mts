import * as github from '@actions/github';

export const verifyMavenArtifactId = (mavenArtifactId: string) => {
  const githubRepositoryName = github.context.repo.repo.split('/').pop() || '';
  if (mavenArtifactId !== githubRepositoryName) {
    throw new Error(
      `Maven artifact id "${mavenArtifactId}" does not match GitHub repository name "${githubRepositoryName}".`,
    );
  }
};
