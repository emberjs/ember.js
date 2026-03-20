## v8.0.6 (2024-08-02)

- [#335] Fix followRedirects when source is async and destination is sync ([@davidtaylorhq](https://github.com/davidtaylorhq))


## v8.0.5 (2024-03-19)

- [#339] Fix a type error when exactOptionalPropertyTypes is enabled ([@boris-petrov](https://github.com/boris-petrov))


## v8.0.4 (2024-03-06)

- [#336] Calling recognize should not affect the transition.from query params for subsequent transitions ([@chbonser](https://github.com/chbonser))


## v8.0.3 (2022-08-27)

- [#334] Fix undefined routeInfo in routeInfo's `find` callback ([@sly7-7](https://github.com/sly7-7))


## v8.0.2 (2022-02-09)

- [#332] Correct more incorrect TypeScript types

## v8.0.1 (2022-02-03)

- [#331] Correct some incorrect TypeScript types

## v8.0.0 (2022-02-02)

#### :boom: Breaking Change

- [#329](https://github.com/tildeio/router.js/pull/329) Better Types ([@wagenet](https://github.com/wagenet))

#### Committers: 1

- Peter Wagenet ([@wagenet](https://github.com/wagenet))

## v7.3.0 (2021-03-07)

#### :rocket: Enhancement

- [#321](https://github.com/tildeio/router.js/pull/321) Add `isIntermediate` flag to Transition ([@sly7-7](https://github.com/sly7-7))

#### :house: Internal

- [#320](https://github.com/tildeio/router.js/pull/320) Remove testing for multiple platforms. ([@rwjblue](https://github.com/rwjblue))

#### Committers: 2

- Robert Jackson ([@rwjblue](https://github.com/rwjblue))
- Sylvain MINA ([@sly7-7](https://github.com/sly7-7))

## v7.2.0 (2021-03-07)

#### :bug: Bug Fix

- [#319](https://github.com/tildeio/router.js/pull/319) Ensure query params are preserved through an intermediate loading state transition ([@sly7-7](https://github.com/sly7-7))

#### :memo: Documentation

- [#316](https://github.com/tildeio/router.js/pull/316) Publish type declaration ([@xg-wang](https://github.com/xg-wang))

#### :house: Internal

- [#318](https://github.com/tildeio/router.js/pull/318) add livereload so tests reload when i make changes ([@stefanpenner](https://github.com/stefanpenner))
- [#309](https://github.com/tildeio/router.js/pull/309) Refactor TransitionAbort to builder interface ([@rwjblue](https://github.com/rwjblue))
- [#306](https://github.com/tildeio/router.js/pull/306) Simplify TransitionState resolution system. ([@rwjblue](https://github.com/rwjblue))
- [#314](https://github.com/tildeio/router.js/pull/314) [Closes [#313](https://github.com/tildeio/router.js/issues/313)] Fix Typo shouldSupercede -> shouldSupersede ([@stefanpenner](https://github.com/stefanpenner))
- [#315](https://github.com/tildeio/router.js/pull/315) Fix other typo’s ([@stefanpenner](https://github.com/stefanpenner))
- [#312](https://github.com/tildeio/router.js/pull/312) Upgrade `devDependencies` ([@stefanpenner](https://github.com/stefanpenner))
- [#311](https://github.com/tildeio/router.js/pull/311) Upgrade CI ([@stefanpenner](https://github.com/stefanpenner))

#### Committers: 4

- Robert Jackson ([@rwjblue](https://github.com/rwjblue))
- Stefan Penner ([@stefanpenner](https://github.com/stefanpenner))
- Sylvain MINA ([@sly7-7](https://github.com/sly7-7))
- Thomas Wang ([@xg-wang](https://github.com/xg-wang))

## v7.1.1 (2020-11-06)

#### :bug: Bug Fix

- [#308](https://github.com/tildeio/router.js/pull/308) Provide transition to `setupContext` for internal transition ([@rreckonerr](https://github.com/rreckonerr))

#### Committers: 1

- Volodymyr Radchenko ([@rreckonerr](https://github.com/rreckonerr))

## v7.1.0 (2020-09-09)

#### :rocket: Enhancement

- [#305](https://github.com/tildeio/router.js/pull/305) Add better Transition debugging information. ([@rwjblue](https://github.com/rwjblue))

#### Committers: 1

- Robert Jackson ([@rwjblue](https://github.com/rwjblue))

## v7.0.0 (2020-07-21)

#### :boom: Breaking Change

- [#297](https://github.com/tildeio/router.js/pull/297) Update TypeScript to 3.9 ([@xg-wang](https://github.com/xg-wang))
- [#294](https://github.com/tildeio/router.js/pull/294) Drop Node < 10. ([@rwjblue](https://github.com/rwjblue))
- [#289](https://github.com/tildeio/router.js/pull/289) Upgrade TypeScript to 3.5 ([@xg-wang](https://github.com/xg-wang))

#### :house: Internal

- [#301](https://github.com/tildeio/router.js/pull/301) Add automated release setup. ([@rwjblue](https://github.com/rwjblue))
- [#300](https://github.com/tildeio/router.js/pull/300) Update Babel to latest. ([@rwjblue](https://github.com/rwjblue))
- [#299](https://github.com/tildeio/router.js/pull/299) Update remaining dependencies/devDependencies to latest. ([@rwjblue](https://github.com/rwjblue))
- [#298](https://github.com/tildeio/router.js/pull/298) Update prettier to 2.0.5. ([@rwjblue](https://github.com/rwjblue))
- [#296](https://github.com/tildeio/router.js/pull/296) Migrate from TSLint to ESLint ([@rwjblue](https://github.com/rwjblue))
- [#295](https://github.com/tildeio/router.js/pull/295) Add GitHub Actions CI setup ([@rwjblue](https://github.com/rwjblue))

#### Committers: 2

- Robert Jackson ([@rwjblue](https://github.com/rwjblue))
- Thomas Wang ([@xg-wang](https://github.com/xg-wang))
