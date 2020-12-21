# Release Process

Releases are mostly automated using
[release-it](https://github.com/release-it/release-it/) and
[lerna-changelog](https://github.com/lerna/lerna-changelog/).

## Preparation

Since the majority of the actual release process is automated, the primary
remaining task prior to releasing is confirming that all pull requests that
have been merged since the last release have been labeled with the appropriate
`lerna-changelog` labels and the titles have been updated to ensure they
represent something that would make sense to our users. Some great information
on why this is important can be found at
[keepachangelog.com](https://keepachangelog.com/en/1.0.0/), but the overall
guiding principle here is that changelogs are for humans, not machines.

When reviewing merged PR's the labels to be used are:

* breaking - Used when the PR is considered a breaking change.
* enhancement - Used when the PR adds a new feature or enhancement.
* bug - Used when the PR fixes a bug included in a previous release.
* documentation - Used when the PR adds or updates documentation.
* internal - Used for internal changes that still require a mention in the
  changelog/release notes.

## Release

Once the prep work is completed, the actual release is straight forward:

* First, ensure that you have installed your projects dependencies:

```sh
yarn install
```

* Second, ensure that you have obtained a
  [GitHub personal access token][generate-token] with the `repo` scope (no
  other permissions are needed). Make sure the token is available as the
  `GITHUB_AUTH` environment variable.

  For instance:

  ```bash
  export GITHUB_AUTH=abc123def456
  ```

[generate-token]: https://github.com/settings/tokens/new?scopes=repo&description=GITHUB_AUTH+env+variable

* And last (but not least 😁) do your release.

```sh
npx release-it
```

[release-it](https://github.com/release-it/release-it/) manages the actual
release process. It will prompt you to to choose the version number after which
you will have the chance to hand tweak the changelog to be used (for the
`CHANGELOG.md` and GitHub release), then `release-it` continues on to tagging,
pushing the tag and commits, etc.
