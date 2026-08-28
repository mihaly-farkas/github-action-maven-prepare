# github-action-maven-prepare

GitHub Action for preparing a Maven build.

## 🚀 Quick Start

```yaml
- name: "Prepare Maven"
  id: prepare-maven
  uses: mihaly-farkas/github-action-maven-prepare@main

- name: "Use action outputs"
  run: |
    echo "gitCommitShortHash=${{ steps.prepare-maven.outputs.git-commit-short-hash }}"
    echo "gitCommitLongHash=${{ steps.prepare-maven.outputs.git-commit-long-hash }}"
    echo "gitCommitTimestamp=${{ steps.prepare-maven.outputs.git-commit-timestamp }}"
    echo "mavenArtifactGroupId=${{ steps.prepare-maven.outputs.maven-artifact-group-id }}"
    echo "mavenArtifactId=${{ steps.prepare-maven.outputs.maven-artifact-id }}"
    echo "mavenArtifactVersion=${{ steps.prepare-maven.outputs.maven-artifact-version }}"
    echo "dockerTags=${{ steps.prepare-maven.outputs.docker-tags }}"
    echo "dockerMetadataActionTags=${{ steps.prepare-maven.outputs.docker-metadata-action-tags }}"

- name: "Generate Docker metadata"
  id: docker-metadata
  uses: docker/metadata-action@v5
  with:
    images: ghcr.io/${{ github.repository }}
    tags: |
      ${{ steps.prepare-maven.outputs.docker-metadata-action-tags }}
```

## 📤 Outputs

The action exposes the following outputs:

| Output                             | Description                                                               |
|------------------------------------|---------------------------------------------------------------------------|
| `git-commit-short-hash`            | Short hash of the current Git commit.                                     |
| `git-commit-long-hash`             | Full hash of the current Git commit.                                      |
| `git-commit-timestamp`             | Unix timestamp of the current Git commit.                                 |
| `git-is-main-branch`               | `true` when current commit is on the configured main branch.              |
| `git-is-latest-main-branch-commit` | `true` when current commit matches main branch HEAD.                      |
| `maven-artifact-group-id`          | Maven project `groupId` read from `pom.xml`.                              |
| `maven-artifact-id`                | Maven project `artifactId` read from `pom.xml`.                           |
| `maven-artifact-version`           | Maven project `version` read from `pom.xml`.                              |
| `maven-artifact-major-version`     | Major version component parsed from Maven version.                        |
| `maven-artifact-minor-version`     | Minor version component parsed from Maven version.                        |
| `maven-artifact-patch-version`     | Patch version component parsed from Maven version.                        |
| `maven-is-snapshot`                | `true` when Maven version ends with `-SNAPSHOT`, otherwise false.         |
| `maven-artifact-publish`           | `true` when the artifact should be published, otherwise false.            |
| `docker-tags`                      | Space-delimited Docker tags generated from version and Git state.         |
| `docker-metadata-action-tags`      | Newline-delimited `type=raw,value=...` tags for `docker/metadata-action`. |

## 📋 Step Summary

The action also writes a Markdown table to the GitHub Actions step summary (`GITHUB_STEP_SUMMARY`) containing all
computed output values for quick inspection in workflow runs.

## ⚠️ Disclaimer & Liability

This is a hobby project. I make no guarantee that it is production-ready. The project may contain experimental or
incomplete features.

Use it at your own risk, and carefully review and adapt the configuration before using it in your own environment.

## ⚖️ License

This project is licensed under
the [MIT License](https://github.com/mihaly-farkas/github-action-maven-prepare?tab=MIT-1-ov-file).
