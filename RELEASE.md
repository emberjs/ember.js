# How to do Ember.js releases

## Concepts

* 6-week release cycle
  * weekly beta
* Channels
  * Release (stable)
  * Beta
  * Canary
* SemVer
  * Patch
  * Minor (point)
  * Major

---

# Ember Notes on Point Releases (Not Release Notes)

1. Check out `beta` branch and `git pull`
1. Make sure any master commits that are conceptually `[{BUGFIX,DOC} {beta,release}]` are cherry-picked.
1. `git push origin beta`, and `let travisBranch = kick off a travis build`
1. `PRIOR_VERSION=v2.5.0-beta.1 ./bin/changelog | uniq | pbcopy`
1. Open `CHANGELOG.md`, paste in the results of the previous script, and clean it up for human-readability.
    1. e.g. [BUGFIX beta] -> [BUGFIX], [DEPRECATE beta] -> [DEPRECATE], ...
    1. Revert [BUGFIX ...] -> [BUGFIX] Revert ...
    1. rm [DOC] (usually)
    1. rm other trivial things
1. Backport CHANGELOG to master
1. `await travisBranch`
    1. if travis succeeds, process
    1. if travis fails and it's a fix that doesn't need to be on master (e.g. linting or merge conflicts accidentally checked in), fix and retry.
    1. otherwise, start over
1. Update `package.json` and `VERSION` file to use new version number
1. git add/commit -m "Release v2.5.0-beta.2."
1. `git tag v2.5.0-beta.2`
1. `git push origin v2.5.0-beta.2`, and `let travisTag = kick off a travis build` (to produce the assets)
1. `git push origin beta`
1. `git checkout beta`
1. `rm -rf dist && mkdir dist && cp ../components-ember/* dist/`
1. Go to [https://github.com/emberjs/ember.js/releases](https://github.com/emberjs/ember.js/releases)
1. Click on the most recent tag (2.5.0-beta.2), and then click "Edit"
1. Start with `### Changelog` and copy/paste the changelog into the box
1. Make the title `Ember 2.5.0-beta.2` and check "This is a prerelease" for betas
1. Update [builds page](https://github.com/ember-learn/builds/tree/master/app/fixtures/ember)
1. Deploy

---

# Ember Notes on Release (Not Release Notes)

Starting point: [https://gist.github.com/rwjblue/fb945e55c70d698d4074](https://gist.github.com/rwjblue/fb945e55c70d698d4074)

# LTS Releases

1. In Ember bower repo, `git co -b lts-2-4` , `git push origin`
1. In `bin/publish_to_s3.js` and `bin/bower_ember_build`, add relevant "lts-2-4" lines (see https://github.com/emberjs/ember.js/commit/618de4fa036ab33dc760343decd355ede7b822bb)
1. Follow usual stable point-release steps (release the LTS as `2.4.${++latest}`)

# Stable Release

## Review Commits

1. Ensure that all commits that are tagged for release are in the release.
1. Review commits by hand since last beta was cut.
1. <reminder for rwjblue to fill this in with his git cp script>
1. You may run into trouble since commits are at canary, but `release` is from a branch 6 weeks ago
1. @rwjblue: I have a changelog generator script that correctly links commits to PRs
    1. It looks at all commits on beta branch, finds the original commit where that come from, and finds the originating PR
1. If I happen to run that tool again, it tells me that I have already run it so I don't accidentally run it twice
1. @rwjblue: I manually scan commits looking for "bugfix beta" and cherry-pick them into the beta branch (which is imminently becoming the `release` branch)
    1. Automating "look for bugfix beta commits since last beta release" seems like an easy win (@tomdale)

## Build Changelog

1. Push `beta` branch to get Travis to run
1. Run `PRIOR_VERSION=<tag> ./bin/changelog | uniq | pbcopy`
1. Clean up commits in CHANGELOG
    1. e.g. [BUGFIX beta] -> [BUGFIX], [DEPRECATE beta] -> [DEPRECATE], ...
    1. Remove `[DOC]` changes (who cares)
    1. Improve formatting (you're now in a Markdown document, so wrap code in ``s.
1. Collapse all "beta" sections into final release
    1. E.g., commits from "beta.1", "beta.2", "beta.3" should just go under "2.4.0" or whatever
1. Commit CHANGELOG

## Bump Version

1. Edit `package.json` to correct version (2.4.0)
1. Edit `VERSION` file to correct value
    1. Seems easy to automate fixing this. Replace reading `VERSION` with reading `package.json` so you only have to change it in one place
1. Commit `package.json`/`version` tags
1. Add commit message: "Release v2.4.0"
1. `git tag v2.4.0`

## Release

1. `git push origin v2.4.0` to push JUST the tag. This lets us run the tag first on Travis CI, which does the correct deploy to S3, Bower, etc.
1. THEN wait for Travis CI build to finish
1. Go to github and disable branch protection for the **release** branch
1. Backup the current release branch: `git push origin release:release-version`
1. To make this the current `release` branch: `git push -f origin beta:release`
    1. This promotes the `beta` branch on your machine (that has all of the release commits) the new `release` branch on `origin`
1. If you are paranoid like rojax, "freeze" this version of Ember in amber: `mv ember-beta ember-release-v2.4`
1. Go to github and enable branch protection for the **release** branch

## Add Release on GitHub

1. Go to GitHub and add a new release
1. Add title: `Ember 2.4`
1. Copy and paste CHANGELOG

```
# generate-api-docs.rb
require 'yaml'

data = YAML.load_file("../components-ember/ember-docs.json")
data["project"]["sha"] = ENV['VERSION']

File.open("data/api.yml", "w") do |f|
  YAML.dump(data, f)
end
```

# On to the Beta Release…

1. Check out `master` branch and pull to get latest `canary` on your local machine
1. `nombom` and run those tests!
1. Branch locally to `beta`
    1. `git checkout -b beta`
1. Manually disable features
    1. Change everything in `features.json` from `null` to `false` to ensure they are stripped
    1. Any feature that has been GOed gets changed to true
1. Run `ember s -prod`
1. Run tests at `http://localhost:4200/tests/index.html`
1. Run production tests `http://localhost:4200/tests/index.htmlskipPackage=container,ember-testing,ember-debug&dist=prod&prod=true`
1. In `.travis.yml`, remove `branches:` section e.g. [this commit](https://github.com/emberjs/ember.js/commit/e38ec5d910721a9e02a819b4105a4875723f4b1b).
1. Now we have to look at the commit just prior to branching 2.4.0.beta-1. Then find the commit after that to start the new branch at.

## Changelog

1. `PRIOR_VERSION=v2.4.0-beta.1^ HEAD=master ./bin/changelog | uniq | pbcopy`
1. Clean up changelog. Make sure the changelog from the stable release you just did is included.

### Tag & Release

1. Update `package.json` and `VERSION` file to use new version number
1. `git tag v2.5.0-beta.1`
1. `git push origin v2.5.0-beta.1`
1. `git push -f origin beta:beta`
