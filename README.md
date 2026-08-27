# github-action-maven-prepare

GitHub Action for preparing a Maven build.

## 🚀 Quick Start

```yaml
- name: "Prepare Maven"
  id: prepare-maven
  uses: mihaly-farkas/github-action-maven-prepare@main

- name: "Use action outputs"
  run: |
    echo "groupId=${{ steps.prepare-maven.outputs.maven-artifact-group-id }}"
    echo "artifactId=${{ steps.prepare-maven.outputs.maven-artifact-artifact-id }}"
    echo "version=${{ steps.prepare-maven.outputs.maven-artifact-version }}"
    echo "shortHash=${{ steps.prepare-maven.outputs.git-commit-short-hash }}"
    echo "longHash=${{ steps.prepare-maven.outputs.git-commit-long-hash }}"
    echo "timestamp=${{ steps.prepare-maven.outputs.git-commit-timestamp }}"
```

## 📤 Outputs

The action exposes the following outputs:

| Output                       | Description                                     |
|------------------------------|-------------------------------------------------|
| `maven-artifact-group-id`    | Maven project `groupId` read from `pom.xml`.    |
| `maven-artifact-artifact-id` | Maven project `artifactId` read from `pom.xml`. |
| `maven-artifact-version`     | Maven project `version` read from `pom.xml`.    |
| `git-commit-short-hash`      | Short hash of the current Git commit.           |
| `git-commit-long-hash`       | Full hash of the current Git commit.            |
| `git-commit-timestamp`       | Unix timestamp of the current Git commit.       |

## ⚠️ Disclaimer & Liability

This is a hobby project. I make no guarantee that it is production-ready. The project may contain experimental or
incomplete features.

Use it at your own risk, and carefully review and adapt the configuration before using it in your own environment.

## ⚖️ License

This project is licensed under
the [MIT License](https://github.com/mihaly-farkas/github-action-maven-prepare?tab=MIT-1-ov-file).
