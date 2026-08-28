# github-action-maven-prepare

GitHub Action for preparing a Maven build. Use this action in a workflow step before building or packaging your Maven
project. It extracts and derives various metadata that can be useful for versioning, tagging, and publishing artifacts.

## 🛠️ Usage

```yaml
- uses: mihaly-farkas/github-action-maven-prepare@v0.1.0
  with:
    # The main branch name to check against for determining if the current commit is on the main branch. 
    # Default is "main".
    main-branch: "main"
```

### Runner support

This action currently supports **Linux** and **macOS** GitHub-hosted runners only (for example,`ubuntu-latest` and `macos-latest`).

Windows runners are currently not supported.

## 🎯 Scenarios

###

```yaml
- id: prepare-maven
  uses: mihaly-farkas/github-action-maven-prepare@v0.1.0

# Build and package the Maven project

- id: upload-artifact-main-jar
  uses: actions/upload-artifact@043fb46d1a93c77aae656e7c1c64a875d1fc6a0a # v7.0.1
  with:
    name: ${{ steps.prepare-maven.outputs.maven-artifact-id }}-${{ steps.prepare-maven.outputs.maven-artifact-version }}.jar
    path: target/
    retention-days: 7
```

### Use Docker tags derived from Maven version and Git commit state

```yaml
- id: prepare-maven
  uses: mihaly-farkas/github-action-maven-prepare@v0.1.0

- id: docker-metadata
  uses: docker/metadata-action@dc802804100637a589fabce1cb79ff13a1411302 # v6.2.0
  with:
    images: ghcr.io/${{ github.repository }}
    tags: |
      type=sha,format=short
      type=sha,format=long
      ${{ steps.prepare-maven.outputs.docker-metadata-action-tags }}
```

## 📤 Outputs

The action exposes the following outputs:

- `git-commit-short-hash`: Short hash of the current Git commit.

- `git-commit-long-hash`: Full hash of the current Git commit.

- `git-commit-timestamp`: Unix timestamp of the current Git commit.

- `git-is-main-branch`: `true` when current commit is on the configured main branch.

- `git-is-latest-main-branch-commit`: `true` when current commit matches main branch HEAD.

- `maven-artifact-group-id`: Maven project `groupId` read from `pom.xml`.

- `maven-artifact-id`: Maven project `artifactId` read from `pom.xml`.

- `maven-artifact-version`: Maven project `version` read from `pom.xml`.

- `maven-artifact-major-version`: Major version component parsed from Maven version.

- `maven-artifact-minor-version`: Minor version component parsed from Maven version.

- `maven-artifact-patch-version`: Patch version component parsed from Maven version.

- `maven-is-snapshot`: `true` when Maven version ends with `-SNAPSHOT`, otherwise false.

- `maven-artifact-publish`: `true` for _SNAPSHOT_ versions and for _stable_ release versions whose artifact has not yet been published; otherwise `false`. The action assumes that it has access to and permission to query the distribution Maven repository for already-published artifacts.

- `docker-tags`: Space-delimited Docker tags generated from the Maven artifact version and Git state. The action generates tags according to the following rules:

  - For a Maven _release version_ when the current commit is the latest commit on the main branch:

    - `latest`: Moving tag, always points to the latest release version built from the main branch.
    
    - `<major-version>`: Moving tag, always points to the latest version with the same major version. E.g.:
      - `1` points to the latest `1.x.x` release version.
      - `2` points to the latest `2.x.x` release version.
    
    - `<major-version>.<minor-version>`: Moving tag, always points to the latest version with the same major and minor version. E.g.:
      - `1.2` points to the latest `1.2.x` release version.
      - `2.3` points to the latest `2.3.x` release version.

  - Every _release version_ gets the following fixed tag for the specific Git commit:

    - `<major-version>.<minor-version>.<patch-version>`: Fixed tag for the release version. E.g.:
      - `1.2.3` points to the specific `1.2.3` release version.
      - `2.3.4` points to the specific `2.3.4` release version.
 
  - For a Maven _SNAPSHOT version_ when the current commit is the latest commit on the main branch:

    - `unstable`: Moving tag, always points to the latest _SNAPSHOT_ version on the main branch.

    - `<major-version>.<minor-version>.<patch-version>-beta`: Moving tag, always points to the latest _SNAPSHOT_ version with the same major, minor, and patch version. E.g.:
      - `1.2.3-beta` points to the latest `1.2.3-SNAPSHOT` version.
      - `2.3.4-beta` points to the latest `2.3.4-SNAPSHOT` version.

  - Every _SNAPSHOT version_ gets the following fixed tag for the specific Git commit:

    - `<major-version>.<minor-version>.<patch-version>-beta.<commit-timestamp>`: Fixed tag for the specific _SNAPSHOT_ version. The commit timestamp is used as the numeric [SemVer](https://semver.org/#spec-item-11) pre-release identifier so that _SNAPSHOT_ versions can be naturally ordered by commit time.  E.g.:
      - `1.2.3-beta.1787864679` points to the specific `1.2.3-SNAPSHOT` version with commit timestamp `1787864679`.
      - `2.3.4-beta.1787864679` points to the specific `2.3.4-SNAPSHOT` version with commit timestamp `1787864679`.
      
      > _NOTE:_ The repository branching and pull request policy ensures that commit timestamps remain strictly monotonically increasing and that the same version cannot be used across branches. A Git hash would provide a stable identity, but would not preserve any chronological ordering.

  - Every version also gets the following fixed tags for the specific Git commit:

    - `sha-<short-git-hash>`: Fixed tag for the specific Git commit. E.g.:
      - `sha-1a2b3c4` points to the specific commit with short hash `1a2b3c4`.

    - `sha-<long-git-hash>`: Fixed tag for the specific Git commit. E.g.:
      - `sha-1a2b3c4d5e6f7890123456789abcdef0123456789` points to the specific commit with long hash `1a2b3c4d5e6f7890123456789abcdef0123456789`.

- `docker-metadata-action-tags`: Newline-delimited `type=raw,value=...` tags for `docker/metadata-action`.

## ⚠️ Disclaimer & Liability

This is a hobby project. I make no guarantee that it is production-ready. The project may contain experimental or
incomplete features.

Use it at your own risk, and carefully review and adapt the configuration before using it in your own environment.

## ⚖️ License

This project is licensed under
the [MIT License](https://github.com/mihaly-farkas/github-action-maven-prepare?tab=MIT-1-ov-file).
