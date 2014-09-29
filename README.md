# Ember.js [![Build Status](https://secure.travis-ci.org/emberjs/ember.js.svg?branch=master)](http://travis-ci.org/emberjs/ember.js) [![Code Climate](https://codeclimate.com/github/emberjs/ember.js.svg)](https://codeclimate.com/github/emberjs/ember.js)

Ember.js is a JavaScript framework that does all of the heavy lifting
that you'd normally have to do by hand. There are tasks that are common
to every web app; Ember.js does those things for you, so you can focus
on building killer features and UI.

- [Website](http://emberjs.com)
- [Guides](http://emberjs.com/guides)
- [API](http://emberjs.com/api)
- [Community](http://emberjs.com/community)
- [Blog](http://emberjs.com/blog)
- [Builds](http://emberjs.com/builds)

# Building Ember.js

1. Ensure that [Node.js](http://nodejs.org/) is installed.
2. Run `npm install` to ensure the required dependencies are installed.
3. Run `npm run build` to build Ember.js. The builds will be placed in the `dist/` directory.

# Contribution

See [CONTRIBUTING.md](https://github.com/emberjs/ember.js/blob/master/CONTRIBUTING.md)

# How to Run Unit Tests

1. Follow the setup steps listed above under [Building Ember.js](#building-emberjs).

2. To start the development server, run `npm start`.

3. Then visit <http://localhost:4200/tests/index.html>. This will run all tests.

4. To test a specific package visit `http://localhost:4200/tests/index.html?package=PACKAGE_NAME` Replace
`PACKAGE_NAME` with the name of the package you want to test. For
example:

  * [Ember.js Runtime](http://localhost:4200/tests/index.html?package=ember-runtime)
  * [Ember.js Views](http://localhost:4200/tests/index.html?package=ember-views)
  * [Ember.js Handlebars](http://localhost:4200/tests/index.html?package=ember-handlebars)

To test multiple packages, you can separate them with commas. 

You can also pass `jquery=VERSION` in the test URL to test different
versions of jQuery.

## From the CLI

1. Install phantomjs from http://phantomjs.org

2. Run `npm test` to run a basic test suite or run `TEST_SUITE=all npm test` to
   run a more comprehensive suite.

# Building API Docs

The Ember.js API Docs provide a detailed collection of methods, classes,
and viewable source code.

NOTE: Requires node.js to generate.

See <http://emberjs.com/> for annotated introductory documentation.

## Setup Additional Repos

To preview or build the API documentation, you will need to setup
the `website` and `data` repos in addition to this repo.

* Clone `https://github.com/emberjs/website.git` at the same level as the
  main Ember repo.

* Clone `https://github.com/emberjs/data.git` at the same level as the main
  Ember repo. Make sure to follow the setup steps in the Ember Data repo,
  which includes installing npm modules.

## Preview API documentation

* From the website repo, run `bundle exec rake preview`

* The docs will be available at <http://localhost:4567/api>

## Build API documentation

* From the website repo, run `bundle exec rake build`

* The website, along with documentation will be built into the `build`
  directory
