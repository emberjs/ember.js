# Ember.js [![Build Status](https://secure.travis-ci.org/emberjs/ember.js.svg?branch=master)](http://travis-ci.org/emberjs/ember.js) [![Code Climate](https://codeclimate.com/github/emberjs/ember.js.svg)](https://codeclimate.com/github/emberjs/ember.js) [![Slack](https://ember-community-slackin.herokuapp.com/badge.svg)](https://ember-community-slackin.herokuapp.com)
[![Sauce Test Status](https://saucelabs.com/browser-matrix/ember-ci.svg)](https://saucelabs.com/u/ember-ci)


Ember.js is a JavaScript framework that does all of the heavy lifting
that you'd normally have to do by hand. There are tasks that are common
to every web app; Ember.js does those things for you, so you can focus
on building killer features and UI.

- [Website](http://emberjs.com)
- [Guides](http://guides.emberjs.com)
- [API](http://emberjs.com/api)
- [Community](http://emberjs.com/community)
- [Blog](http://emberjs.com/blog)
- [Builds](http://emberjs.com/builds)


The Ember.js framework enables developers to build scalable, single-page web applications gracefully and efficiently. It does so by providing a set of useful and easily incorporated functionality, the kind commonly found on dynamic, feature-rich web pages. Useful features and benefits of Ember include:

* **Built-in best practices:** all code conforms to industry-standard best practices

* **Rich feature set:**  Ember-specific features such as the Router and the Ember CLI enhance productivity and functionality   

* **Extensive addon collection:** Ember has a large selection of available addons and plugins (over 1,500 at the time of this writing)

* **[Ember CLI](https://github.com/ember-cli/ember-cli)**

Ember is perfect for larger-scale, functionality-intensive web applications of any size or type. The standardization makes it easy for developers to become acquainted with the architecture and setup of both large and small code bases. Additionally, by keeping your tech stack consistent and coherent, Ember can help make your organization more agile and adaptable, making Ember ideal for any kind of project.

# Building Ember.js

1. Ensure that [Node.js](http://nodejs.org/) is installed.
2. Run `npm install` to ensure the required dependencies are installed.
3. Run `npm run build` to build Ember.js. The builds will be placed in the `dist/` directory.

## npm install troubleshooting

If you encounter a problem with downloading dependencies like:

```
npm ERR! registry error parsing json
```

consider upgrading `npm` with:

```
npm install -g npm@latest
```

You can find more information in [Upgrading on *nix (OSX, Linux, etc.)](https://github.com/npm/npm/wiki/Troubleshooting#upgrading-on-nix-osx-linux-etc) npm wiki page.

# Contribution

See [CONTRIBUTING.md](https://github.com/emberjs/ember.js/blob/master/CONTRIBUTING.md)

# How to Run Unit Tests

Pull requests should pass the Ember.js unit tests. Do the following to run these tests.

1. Follow the setup steps listed above under [Building Ember.js](#building-emberjs).

2. To start the development server, run `npm start`.

3. To run all tests, visit <http://localhost:4200/>.

4. To test a specific package, visit `http://localhost:4200/tests/index.html?package=PACKAGE_NAME`. Replace
`PACKAGE_NAME` with the name of the package you want to test. For
example:

  * [Ember.js Runtime](http://localhost:4200/tests/index.html?package=ember-runtime)
  * [Ember.js Views](http://localhost:4200/tests/index.html?package=ember-views)
  * [Ember.js Handlebars](http://localhost:4200/tests/index.html?package=ember-handlebars)

To test multiple packages, you can separate them with commas.

You can also pass `jquery=VERSION` in the test URL to test different
versions of jQuery.

## From the CLI

1. Install phantomjs from http://phantomjs.org.

2. Run `npm test` to run a basic test suite or run `TEST_SUITE=all npm test` to
   run a more comprehensive suite.

## From ember-cli

1. `ember test --server`
2. connect the browsers you want
3. if phantom didn't connect automatically, you can run `./bin/connect-phantom-to <optional-port>`

To run a specific browser, you can use the `--launch` flag

* `ember test --server --launch SL_Firefox_Current`
* `ember test --launch SL_Firefox_Current`
