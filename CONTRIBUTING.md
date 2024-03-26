# Questions

This is the issue tracker for Ember.js. The Ember.js community uses this site
to collect and track bugs and discussions of new features. If you are having
difficulties using Ember.js or have a question about usage, please ask a
question on Stack Overflow: http://stackoverflow.com/questions/ask?tags=ember.js, or by joining [the community chat](https://discord.gg/emberjs).

# Issue Labeling

Ember uses [StandardIssueLabels](https://github.com/wagenet/StandardIssueLabels) for Github Issues.

# Issues

Think you've found a bug or have a new feature to suggest? Let us know!

## Reporting a Bug
1. Update to the most recent main release if possible. We may have already
fixed your bug.

2. Search for similar issues. It's possible somebody has encountered
this bug already.

3. Provide a demo that specifically shows the problem. This demo should be fully 
operational with the exception of the bug you want to demonstrate.
You may provide a repo or use a fork on [new.emberjs.com](http://new.emberjs.com).
The more pared down, the better. If it is not possible to produce a demo, please 
make sure you provide very specific steps to reproduce the error. If we cannot 
reproduce it, we will close the ticket.

4. Your issue will be verified. The provided example will be tested for
correctness. The Ember team will work with you until your issue can
be verified.

5. Keep up to date with feedback from the Ember team on your ticket. Your
ticket may be closed if it becomes stale.

6. If possible, submit a Pull Request with a failing test. Better yet, take
a stab at fixing the bug yourself if you can!

The more information you provide, the easier it is for us to validate that
there is a bug and the faster we'll be able to take action.

### Triaging policy

* You might be requested to provide a reproduction or extra information. In that
case, the issue will be labeled as _Needs Submitter Response_. If we did not
get any response after seven days, we will ping you to remind you about it. We
might close the issue if we do not hear from you after two weeks since the
original notice.

* If you submit a feature request as an issue, you will be invited to follow the
[instructions in this document](https://github.com/emberjs/ember.js/blob/main/CONTRIBUTING.md#requesting-a-feature)
and the issue will be closed
* Issues that become inactive will be labeled accordingly
  to inform the original poster and Ember contributors that the issue
  should be closed since the issue is no longer actionable. The issue
  can be reopened at a later time if needed, e.g. becomes actionable again.
* If possible, issues will be labeled to indicate the status or priority.
  For example, labels may have a prefix for `Status: X`, or `Priority: X`.
  Statuses may include: `In Progress`, `On Hold`. Priorities may include:
  `High` or `Low`.

## Requesting a Feature

1. Ember has an RFC process for feature requests. To begin the discussion
[follow the guidance on  the RFC repo](https://github.com/emberjs/rfcs/blob/master/README.md#creating-an-rfc).

2. Provide a clear and detailed explanation of the feature you want and why
it's important to add. Keep in mind that we want features that will be useful
to the majority of our users and not just a small subset. If you're just
targeting a minority of users, consider writing an add-on library for Ember.

3. If the feature is complex, consider writing an Ember RFC document. If we do
end up accepting the feature, the RFC provides the needed documentation for
contributors to develop the feature according the specification accepted by the core team.

4. After discussing the feature you may choose to attempt a Pull Request. If
you're at all able, start writing some code. We always have more work to do
than time to do it. If you can write some code then that will speed the process
along.

In short, if you have an idea that would be nice to have, create an issue on the
emberjs/rfcs repo. If you have a question about requesting a feature, start a
discussion at [discuss.emberjs.com](https://discuss.emberjs.com)

# Building Ember.js

Building Ember.js is a quick process:

```sh
# clone the latest ember.js directory from github
 - git clone https://github.com/emberjs/ember.js.git

# cd to the cloned ember.js directory
 - cd ember.js

# ensure Node.js and pnpm are installed

# build ember.js
 - pnpm install
 - pnpm build
```

## Using Custom Builds in an Ember CLI App
While testing custom behavior (maybe that you'd like to write an RFC for...), here's how you'd use a local custom build with an Ember app to test out the custom build:

```sh
# cd to the directory from Building Ember.js (above)
cd ember.js
pnpm start

# in a new terminal
cd ../your-app-directory/
pnpm link ../../path/to/ember-source
```

# How to Run Unit Tests

Pull requests should pass the Ember.js unit tests. Do the following to run these tests.

1. Follow the setup steps listed above under [Building Ember.js](#building-emberjs).

2. To start the development server, run `pnpm start`.

3. To run all tests, visit <http://localhost:4200/>.

4. To test a specific package, visit `http://localhost:4200/tests/index.html?package=PACKAGE_NAME`. Replace
`PACKAGE_NAME` with the name of the package you want to test. For
example:

  * [Ember.js Internals](http://localhost:4200/tests/index.html?package=@ember/-internals)

To test multiple packages, you can separate them with commas.

## From the CLI

Run `pnpm test` to run a basic test suite or run `TEST_SUITE=all pnpm test` to
run a more comprehensive suite.

## From ember-cli

1. `ember test --server`

2. Connect the browsers you want.

To run a specific browser, you can use the `--launch` flag

* `ember test --server --launch SL_Firefox_Current`
* `ember test --launch SL_Firefox_Current`
* `ember test --launch SL_Firefox_Current,Chrome`

To test multiple launchers, you can separate them with commas.

# Pull Requests

We love pull requests. Here's a quick guide:

1. Fork the repo.

2. Run the tests. We only take pull requests with passing tests, and it's great
to know that you have a clean slate: `pnpm install && pnpm test`.
(To see tests in the browser, run `pnpm start` and open `http://localhost:4200/tests/index.html`.)

3. Add a test for your change. Only refactoring and documentation changes
require no new tests. If you are adding functionality or fixing a bug, we need
a test! If your change is a new feature, please
[wrap it in a feature flag](https://guides.emberjs.com/release/contributing/adding-new-features/).

4. Make sure to check out the
   [JavaScript Style Guide](https://github.com/emberjs/ember.js/blob/main/STYLEGUIDE.md) and
   ensure that your code complies with the rules. If you missed a rule or two, don't worry, our
   tests will warn you.

5. Make the test pass.

6. Commit your changes. Please use an appropriate commit prefix.
If your pull request fixes an issue specify it in the commit message. Some examples:

  ```
  [DOC beta] Update CONTRIBUTING.md for commit prefixes
  [FEATURE query-params-new] Message
  [BUGFIX beta] Message
  [SECURITY CVE-111-1111] Message
  ```

  For more information about commit prefixes see [the appendix](#commit-tagging).


7. Push to your fork and submit a pull request. Please provide us with some
explanation of why you made the changes you made. For new features make sure to
explain a standard use case to us.

We try to be quick about responding to tickets but sometimes we get a bit
backlogged. If the response is slow, try to find someone on [the community chat](https://discord.gg/emberjs) to
give the ticket a review.

Some things that will increase the chance that your pull request is accepted:

* Use Ember idioms and helpers
* Include tests that fail without your code, and pass with it
* Update the documentation, the surrounding one, examples elsewhere, guides,
  whatever is affected by your contribution

Syntax:

* Style is enforced by prettier. Run `pnpm lint` to check your changes.
* Follow the conventions you see used in the source already.

Inline Documentation Guidelines:

All inline documentation is written using YUIDoc. Follow these rules when
updating or writing new documentation:

1. All code blocks must be fenced
2. All code blocks must have a language declared
3. All code blocks must be valid code for syntax highlighting
4. All examples in code blocks must be aligned
5. Use two spaces between the code and the example: `foo();  // result`
6. All references to code words must be enclosed in backticks
7. Prefer a single space between sentences
8. Reference Ember.js as Ember.
9. Wrap long markdown blocks > 80 characters
10. Don't include blank lines after `@param` definitions

Code words are:

* `thisPropertyName`
* `Global.Class.attribute`
* `thisFunction()`
* `Global.CONSTANT_NAME`
* `true`, `false`, `null`, `undefined` (when referring to programming values)
* references to other properties/methods

And in case we didn't emphasize it enough: we love tests!

NOTE: Partially copied from https://raw.github.com/thoughtbot/factory_girl_rails/master/CONTRIBUTING.md

# CI (Github Actions) Tests

We use [GitHub Actions](https://github.com/emberjs/ember.js/actions?query=workflow%3ABuild+event%3Apull_request) to test each PR before it is merged.

When you submit your PR (or later change that code), a CI build will automatically be kicked off.  A note will be added to the PR, and will indicate the current status of the build.

Within the [CI workflow](https://github.com/emberjs/ember.js/blob/main/.github/workflows/ci.yml), you can see that we (currently) run several different test suites.

* `Linting` runs `pnpm lint` to check for code style issues.
* `Type Checking` runs `pnpm type-check` to check for TypeScript type errors. This also runs against several version of TypeScript that are supported.
* `Basic Test` / `each-package` test suite is closest to what you normally run locally on your machine. This is also run with all deprecations enabled -- that is, a deprecation that has been added but is not yet up to it's enabled version will be forced "on" and the test suite is required to pass both ways.
* `Production` test suite runs tests against a production build. This also runs with the "Debug Render Tree" feature enabled.
* `BrowserStack` and `Browser Tests` test suites run tests against various supported browsers.
* `Blueprint Tests` runs tests for the Ember CLI blueprints provided by Ember in this package.
* `Smoke Test` builds and runs a simple app.
* `Extend Prototypes` runs the `extend-prototypes` test suite.
* `Node.js Tests` runs tests for the node-side code in this package.

Each commit to canary and beta publishes to the relevant channel on S3. These 
builds are used primarily by [ember-try](https://github.com/ember-cli/ember-try)
for addons to test against beta and canary of ember-source.

The CI workflow is also run nightly for beta and canary.

## Common CI Build Issues

### Production Build Failures

If your build is failing on the 'production' suite, you may be relying on a debug-only function that does not even exist in a production build (`Ember.warn`, `Ember.deprecate`, `Ember.assert`, etc.).  These will pass on the 'each-package' suite (and locally) because those functions are present in development builds.

There are helpers for many of these functions, which will resolve this for you: `expectDeprecation`, `expectAssertion`, etc.  Please use these helpers when dealing with these functions.

If your tests can't or aren't covered by a helper, one common solution is the use of `DEBUG` flag.  Wrapping the debug-only dependent test in a check of this flag will cause that test to not be run in the prod test suite:

```javascript
import { DEBUG } from '@glimmer/env';

if (DEBUG) {
  // Development-only test goes here
}
```
Note: before using this approach, please be certain your test is really depending on a debug-only function and not truly failing in production.

To recreate this build environment locally:
* Run `ember serve --environment=production` in a terminal (takes much much longer than a default `ember s`)
* Browse to `localhost:4200/tests/index.html?dist=prod&prod=true`

### Single Unexplained Test Suite Failure

Sometimes a single test suite will fail, without giving any indication of a real error.
* Try to recreate the test environment locally (see above for production builds)
* Restart all the test suites on CI by doing another push
* Ask a repo collab to restart that single test suite

# Adding a Deprecation

Deprecations of public API must be the result of an [RFC](https://github.com/emberjs/rfcs#creating-an-rfc).

Deprecations are defined in a central location, currently [packages/@ember/-internals/deprecation/index.ts](https://github.com/emberjs/ember.js/blob/main/packages/%40ember/-internals/deprecation/index.ts).

To add a deprecation, you must add a new entry to the `deprecations` object in the `index.ts` file. The entry should be an object with the following properties:

* `id` (required): A string that uniquely identifies the deprecation. This should be a short, descriptive name, typically dasherized.
* `for` (required): The string `ember-source` -- every deprecation from this package is for `ember-source`.
* `since` (required): An object with `available` and `enabled`. `available` is the 
first version of Ember that the deprecation is available in. `enabled` is the version 
of Ember that the deprecation was first enabled. This is used as a feature flag 
deprecations. For public APIs, the `enabled` value is added only once the deprecation RFC is [Ready for Release](https://github.com/emberjs/rfcs#ready-for-release).
* `until` (required): The version of Ember that the deprecation will be removed in.
* `url` (required): A URL to the deprecation guide for the deprecation. This URL 
can be constructed in advance of the deprecation being added to the 
[deprecation app](https://github.com/ember-learn/deprecation-app) by following 
this format: `https://deprecations.emberjs.com/deprecations/{{id}}`.

`deprecateUntil` (internal to Ember) should then be called using the entry from the `DEPRECATIONS` object.

```ts
import { DEPRECATIONS, deprecateUntil } from '@ember/-internals/deprecations';
//...

deprecateUntil(message, DEPRECATIONS.MY_DEPRECATION);

```

`expectDeprecation` should also use the DEPRECATIONS object, but it should be noted
that it uses `isEnabled` instead of `test` because the expectations of `expectDeprecation`
are the opposite of `test`.

```ts
  expectDeprecation(
    () => {
        assert.equal(foo, bar(), 'foo is equal to bar'); // something that triggers the deprecation
    },
    /matchesMessage/,
    DEPRECATIONS.MY_DEPRECATION.isEnabled
);
```

We sometimes deprecate "Intimate" API -- private APIs that we suspect or have
concerns about being used by addons or apps. These deprecations are not required
to be RFC'd. However, we require they be available for at least one LTS release
before the APIs are removed. For example, a deprecation added in 5.5 would need 
to have an `until` no earlier than 5.9.

# Appendix

## Commit Tagging

All commits should be tagged. Tags are denoted by square brackets (`[]`) and come at the start of the commit message.

### Bug Fixes

In general bug fixes are pulled into the beta branch. As such, the prefix is: `[BUGFIX beta]`. If a bug fix is a serious regression that requires a new patch release, `[BUGFIX release]` can be used instead.

For bugs related to canary features, follow the prefixing rules for features.

The vast majority of bug fixes apply to the current stable or beta releases, so submit your PR against `emberjs:main` with one of the above mentioned BUGFIX tags.  (In the unusual case of a bug fix specifically for a past release, tag for that release `[BUGFIX release-1-13]` and submit the PR against the stable branch for that release: `emberjs:stable-1-13`.)

### Cleanup

Cleanup commits are for removing deprecated functionality and should be tagged
as `[CLEANUP beta]`.

### Features

All additions and fixes for features in canary should be tagged as `[FEATURE name]` where name is the same as the flag for that feature. The commit message or PR description should link to the RFC that proposed the feature.

### Documentation

Documentation commits are tagged as `[DOC channel]` where channel is `canary`,
`beta`, or `release`. If no release is provided `canary` is assumed. The channel should be the most stable release that this documentation change applies to.

### Security

Security commits will be tagged as `[SECURITY cve]`. Please do not submit security related PRs without coordinating with the security team. See the [Security Policy](https://emberjs.com/security/) for more information.

### Other

In general almost all commits should fall into one of these categories. In the cases where they don't please submit your PR untagged. An Ember contributor will let you know if tagging is required.
