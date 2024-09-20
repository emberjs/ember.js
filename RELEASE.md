# Ember.js Releases

See [Ember.js Releases](https://emberjs.com/releases/) for an overview of how Ember.js releases work.

Ember.js consists of many packages. A release of `Ember.js` is considered complete upon the release blog post on [the Ember blog](https://blog.emberjs.com/tag/release).

This document is intended for maintainers of Ember.js. It describes the process for creating releases.

## ember-source

`ember-source` follows the Ember.js [release train/cycle](https://blog.emberjs.com/new-ember-release-process/). There is a stable release roughly every 6 weeks (every 4 versions excluding `x.0`) and a major release after every `x.12` release. New deprecations targeting the next major are not permitted to land after the `x.10` release. All public API changes should have an RFC and all features should behind feature flags. Features should not be enabled by default until the RFC has had a successful the [Ready for Release](https://github.com/emberjs/rfcs#ready-for-release) Stage.

Features, bugfixes, deprecations and other PRs are merged primarily to the `main` branch.
These changes should be tagged according to what they are and whether they should be cherry-picked back to a beta, stable, or LTS release, see [Commit Tagging](https://github.com/emberjs/ember.js/blob/main/CONTRIBUTING.md#commit-tagging) in the CONTRIBUTING.md. These tags can also be in PR titles (as they are easier to edit after-the-fact than commit messages).

Changes to `main` are released on every commit to `s3` as `canary`. 
Weekly, changes on `main` are released as `alpha` on `npm`. 

At least weekly, a contributor looks for changes from `main` that are tagged (and appropriate to be backported) to `beta` and creates a new `beta` release if there are changes. 

In a beta cycle, there can be as few as 1 beta release or theoretically as many as needed, depending on the changes that land.

After six weeks, the beta is "promoted" to release by a contributor creating a new stable release. When the stable release is published, the prior release may be promoted to LTS, if is a successful candidate.

Generally changes should land on main. If a change needs to be backported to LTS, for example, it should be backported to beta to "settle" for a bit before being backported to release an the LTS.
Rarely, a change is needed on an older version but not needed on main or newer versions. In those cases, the PR should target the branch.

### Creating a point release

1. Look for any PRs targeting release that have not been merged. Consider if they are ready to be merged, and if so, ensure the changes are also on `main` and `beta` if they are needed in those versions. Generally changes should be cherry-picked back to `release` so that they are not accidentally orphaned on older versions and so that they can be tested on `beta` and `main` before a point release.
1. In `ember.js` repo, on main branch, `git pull`
1. `git checkout release`
1. `git pull`
1. Look for any unreleased changes on `release` -- take note so you know what to expect in the CHANGELOG generation.
1. Cherry-pick (using `git cherry-pick -x`) anything tagged `release` that was merged to main since the last release. To do this, look at merged PRs to find commits. The commit history isn't a good way to find these because it sorts by date, and some commits can be on old PRs that were finally merged. You may have to fix any conflicts. If this is beyond you, you can ask the original contributor to make a pull request to `release`.
1. `git push` to let CI run. You must push changes before running the CHANGELOG generation as it uses the GitHub API to find PRs.
1. Generate Changelog:
    ```bash
    HEAD=release PRIOR_VERSION=v5.10.1-ember-source ./bin/changelog.js | uniq | pbcopy
    ```
   
1. Put the results in `CHANGELOG.md` under a heading for the new point release. Clean up the changelog, see [Producing the CHANGELOG](#producing-the-changelog) for the details.
1. Commit with message:
    ```
    Add v5.10.2 to CHANGELOG for `ember-source`
    ```
   
1. Update `package.json` version to:
    ```
    5.10.2
    ```
   
1. Commit with message:
    ```
    Release v5.10.2-ember-source
    ```
   
1. Tag commit:
    ```bash
    git tag v5.10.2-ember-source
    ```
   
1. Push tag:
    ```bash
    git push origin v5.10.2-ember-source
    ```
   
1. Push changes `git push`
1. Cherry-pick changelog commit to `main` branch and to the `beta` branch.
1. Draft release on Github, see [Creating a Release on Github](#creating-a-release-on-github).
1. Wait for CI on the tag and check published to npm with `npm info ember-source`.

#### LTS Point release

Follow the above steps but begin with the `lts-5-8` branch (or whatever the LTS branch you are targeting is). 
This branch may need to be created if it does not exist from the tag. 
After release, if it is the latest LTS, tag as LTS with `npm dist-tag add ember-source@5.8.1 lts`.

### Creating a (n-th) beta release

1. In `ember.js` repo, on main branch, `git pull`
1. `git checkout beta`
1. `git pull`
1. Look for any unreleased changes on `beta` -- take note so you know what to expect in the CHANGELOG generation.
1. Cherry-pick (using `git cherry-pick -x`) anything tagged `beta` that was merged to main since the last beta. To do this, look at merged PRs to find commits. The commit history isn't a good way to find these because it sorts by date, and some commits can be on old PRs that were finally merged. You may have to fix any conflicts. If this is beyond you, you can ask the original contributor to make a pull request to `beta`.
1. `git push` to let CI run. You must push changes before running the CHANGELOG generation as it uses the GitHub API to find PRs.
1. Generate Changelog
    ```bash
    HEAD=beta PRIOR_VERSION=v5.12.0-beta.1-ember-source ./bin/changelog.js | uniq | pbcopy
    ```
1. Put the results in `CHANGELOG.md` under a heading for the new beta release. Clean up the changelog, see [Producing the CHANGELOG](#producing-the-changelog) for the details.
1. Commit with message:
    ```
    Add v5.12.0-beta.2 to CHANGELOG for `ember-source`
    ```
1. Update `package.json` version to:
    ```
    5.12.0-beta.2
    ```
1. Commit with message:
    ```
    Release v5.12.0-beta.2-ember-source
    ```
1. Tag commit:
    ```bash
    git tag v5.12.0-beta.2-ember-source
    ```
1. Push tag:
    ```bash
    git push origin v5.12.0-beta.2-ember-source
    ```
1. Push changes to branch `git push`
1. Cherry-pick changelog commit to main branch.
1. Draft release on Github, see [Creating a Release on Github](#creating-a-release-on-github).
1. Wait for CI on the tag and check published to npm with `npm info ember-source`.


### Creating a stable release

1. Look for any unreleased changes on `release`. If there are, consider whether there should first be a point release to the old stable version before creating a new stable release. 
1. In `ember.js` repo, on main branch, `git pull`.
1. `git checkout beta`. (Note the branch! This is the release train).
1. `git pull`.
1. Cherry-pick (using `git cherry-pick -x`) anything tagged `release` that was merged to main since the last beta release. To do this, look at merged PRs to find commits. The commit history isn't a good way to find these because it sorts by date, and some commits can be on old PRs that were finally merged. You may have to fix any conflicts. If this is beyond you, you can ask the original contributor to make a pull request to `release`.
1. `git push` to let CI run. You must push changes before running the CHANGELOG generation as it uses the GitHub API to find PRs.
1. Generate Changelog. The `PRIOR_VERSION` should be the last beta release of the series.
    ```bash
    HEAD=beta PRIOR_VERSION=v5.12.0-beta.6-ember-source ./bin/changelog.js | uniq | pbcopy
    ```
1. Put the results in `CHANGELOG.md` under a heading for the new stable release. Combine the previous `beta` headings into one entry. Clean up the changelog, see [Producing the CHANGELOG](#producing-the-changelog) for the details.
1. Commit with message
    ```
    Add v5.12.0 to CHANGELOG for `ember-source`
    ```
1. Update `package.json` version to:
    ```
    5.12.0
    ```
1. Commit with message:
    ```
    Release v5.12.0-ember-source
    ```
1. Tag commit:
    ```bash
    git tag v5.12.0-ember-source
    ```
1. Push tag:
    ```bash
    git push origin v5.12.0-ember-source
    ```
1. Make the `beta` branch into the `release` branch:
    ```bash
    git co -B release
    ```
1. Push the new `release` branch:
    ```bash
    git push -f origin release
    ```
1. Cherry-pick changelog commit to main branch.
1. Draft release on Github, see [Creating a Release on Github](#creating-a-release-on-github).
1. Wait for CI on the tag and check published to npm with `npm info ember-source`.
1. Consider whether to tag the previous version as LTS with `npm dist-tag add ember-source@5.8.0 lts`. A version is tagged LTS when the next stable version is released. LTS versions are roughly every 4 versions, excluding the `x.0` minor version.
1. Mark the release as complete in the Ember discord.
1. Create the new beta.

### Creating a new beta (after a stable release)

1. In `ember.js` repo, on main branch, `git pull`.
1. Make a new beta branch:
    ```bash
    git co -B beta
    ```
1. Toggle off any features that have not been explicitly toggled on in `packages/@ember/canary-features/index.ts`.
1. Find the `sha` of the last commit common to `main` and the old `beta` branch. This is typically the cherry-pick of the CHANGELOG entry.
1. Generate Changelog. The `PRIOR_VERSION` is that `sha`:
    ```bash
    HEAD=main PRIOR_VERSION=3daedddaafd638a4a6b12e0265df30255d1512e5 ./bin/changelog.js | uniq | pbcopy
    ```
1. Put the results in `CHANGELOG.md` under a heading for the new beta release. Clean up the changelog, see [Producing the CHANGELOG](#producing-the-changelog) for the details.
1. Commit with message:
    ```
    Add v5.12.0-beta.1 to CHANGELOG for `ember-source`
    ```
1. Update `package.json` version to:
    ```
    5.12.0-beta.1
    ``` 
1. Commit with message:
    ```
    Release v5.12.0-beta.1-ember-source
    ```
1. Tag commit:
    ```bash
    git tag v5.12.0-beta.1-ember-source
    ```
1. Push tag:
    ```bash
    git push origin v5.12.0-beta.1-ember-source
    ```
1. Push changes to branch:
    ```bash
    git push -f origin beta
    ```
1. Cherry-pick changelog commit to main branch.
1. Update the main branch version to the next version in package.json: `6.0.0-alpha.1` with message `Post-relase version bump`. Remember that versions go to the next major after the `x.12` release per the [Major Version Process RFC](https://rfcs.emberjs.com/id/0830-evolving-embers-major-version-process/).
1. Draft release on Github, see [Creating a Release on Github](#creating-a-release-on-github).

### Producing the CHANGELOG
[Producing the CHANGELOG]: #producing-the-changelog

The CHANGELOG should make sense from the perspective of a user. Remove anything that is not user-facing.
The CHANGELOG entry is typically the PR title, but it can often be rewritten to be more user-friendly.
Also remove the `beta` and `release` tags from the PR titles. 

Title the CHANGELOG entry with the version and the date of the release in this format: `## v5.11.0 (August 15, 2023)`.

1. Remove any `[DOC]` changes (usually)
1. Remove any entries for PRs that were in prior (by semver) releases
1. Remove any `[INTERNAL]` changes (not user-facing). Some changes may warrant staying in the CHANGELOG, but most do not.
1. `[CLEANUP]` entries may or may not be user-facing. This tag is typically used for removals of deprecated features.
1. Collapse multiple PRs that were for the same issue into a single entry: `- [#12345](https://example.org/emberjs/ember.js/pull/12345) / [#67890](https://example.org/emberjs/ember.js/pull/67890) [BUGFIX] Fix an exception thrown only on Tuesdays.`
1. Handle any `[FEATURE]` entries:
    1. If the feature is still behind a non-enabled feature flag, remove the entry.
    1. If the feature is now enabled by default, add an entry:
        1. Find the PRs that contributed to the feature.
        1. Link to the RFC that introduced the feature on the RFC website in the entry: `- [#20464](https://github.com/emberjs/ember.js/pull/20464) [FEATURE] Create public import for uniqueId helper per [RFC #659](https://rfcs.emberjs.com/id/0659-unique-id-helper).`
1. Change `[BUGFIX beta]` `[BUGFIX release]` `[BUGFIX stable]` to `[BUGFIX]`
1. Change `[DEPRECATION beta]` `[DEPRECATION release]` `[DEPRECATION stable]` to `[DEPRECATION]`
1. Handle any other PR or commit tags similarly.

### Creating a Release on Github
[Creating a Release on Github]: #creating-a-release-on-github

1. Go to the [Ember.js releases page](https://github.com/emberjs/ember.js/releases)
2. Click the "Draft a new release" button
3. Choose the tag of the release you just created
4. Title the release with the name of the tag `v5.11.0-ember-source` (or whatever the version is).
5. Add a header to the description of `### CHANGLEOG`.
6. Copy the CHANGELOG entry for the version below this header.
7. Check 'Pre-release' if this is not a stable release.
8. Choose `Set as the latest release` only if this is the latest stable release. Do not check this for the release of a point release on an older version.
