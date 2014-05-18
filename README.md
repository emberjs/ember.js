# Ember.js [![Build Status](https://secure.travis-ci.org/emberjs/ember.js.png?branch=master)](http://travis-ci.org/emberjs/ember.js) [![Code Climate](https://codeclimate.com/github/emberjs/ember.js.png)](https://codeclimate.com/github/emberjs/ember.js)

Ember.js is a JavaScript framework that does all of the heavy lifting
that you'd normally have to do by hand. There are tasks that are common
to every web app; Ember.js does those things for you, so you can focus
on building killer features and UI.

These are the three features that make Ember.js a joy to use:

1. Bindings
2. Computed properties
3. Auto-updating templates

## Bindings

Use bindings to keep properties between two different objects in sync.
You just declare a binding once, and Ember.js will make sure changes get
propagated in either direction.

Here's how you create a binding between two objects:

```javascript
MyApp.president = Ember.Object.create({
  name: 'Barack Obama'
});

MyApp.country = Ember.Object.create({
  // Ending a property with 'Binding' tells Ember.js to
  // create a binding to the presidentName property.
  presidentNameBinding: 'MyApp.president.name'
});

// Later, after Ember has resolved bindings...
MyApp.country.get('presidentName');
// 'Barack Obama'
```
Bindings allow you to architect your application using the MVC
(Model-View-Controller) pattern, then rest easy knowing that data will
always flow correctly from layer to layer.

## Computed Properties

Computed properties allow you to treat a function like a property:

``` javascript
MyApp.President = Ember.Object.extend({
  firstName: 'Barack',
  lastName: 'Obama',

  fullName: function() {
    return this.get('firstName') + ' ' + this.get('lastName');

    // Call this flag to mark the function as a property
  }.property()
});

MyApp.president = MyApp.President.create();
MyApp.president.get('fullName');
// 'Barack Obama'
```

Treating a function like a property is useful because they can work with
bindings, just like any other property.

Many computed properties have dependencies on other properties. For
example, in the above example, the `fullName` property depends on
`firstName` and `lastName` to determine its value. You can tell Ember.js
about these dependencies like this:

``` javascript
MyApp.President = Ember.Object.extend({
  firstName: 'Barack',
  lastName: 'Obama',

  fullName: function() {
    return this.get('firstName') + ' ' + this.get('lastName');

    // Tell Ember.js that this computed property depends on firstName
    // and lastName
  }.property('firstName', 'lastName')
});
```

Make sure you list these dependencies so Ember.js knows when to update
bindings that connect to a computed property.

## Auto-updating Templates

Ember.js uses Handlebars, a semantic templating library. To take data
from your JavaScript application and put it into the DOM, create a
`<script>` tag and put it into your HTML, wherever you'd like the value
to appear:

``` html
<script type="text/x-handlebars">
  The President of the United States is {{MyApp.president.fullName}}.
</script>
```

Here's the best part: templates are bindings-aware. That means that if
you ever change the value of the property that you told us to display,
we'll update it for you automatically. And because you've specified
dependencies, changes to *those* properties are reflected as well.

Hopefully you can see how all three of these powerful tools work
together: start with some primitive properties, then start building up
more sophisticated properties and their dependencies using computed
properties. Once you've described the data, you only have to say
how it gets displayed once, and Ember.js takes care of the rest. It
doesn't matter how the underlying data changes, whether from an XHR
request or the user performing an action; your user interface always
stays up-to-date. This eliminates entire categories of edge cases that
developers struggle with every day.

# Getting Started

For new users, we recommend downloading the [Ember.js Starter
Kit](https://github.com/emberjs/starter-kit/tags), which includes
everything you need to get started.

# Building Ember.js

1. Ensure that [Node.js](http://nodejs.org/) is installed.
2. Run `npm install` to ensure the required development dependencies are installed.
3  Run `bower install` to install libraries dependencies.
4. Run `bin/build.js` to build Ember.js. The builds will be placed in the `dist/` directory.

# Contribution

[See `CONTRIBUTING.md`](https://github.com/emberjs/ember.js/blob/master/CONTRIBUTING.md)

# How to Run Unit Tests


1. Follow the setup steps listed above under [Building Ember.js](#building-emberjs).

2. To start the development server, run `npm start`.

3. Then visit: `http://localhost:4200/tests/index.html?package=PACKAGE_NAME`. Replace
`PACKAGE_NAME` with the name of the package you want to run. For
example:

  * [Ember.js Runtime](http://localhost:4200/tests/index.html?package=ember-runtime)
  * [Ember.js Views](http://localhost:4200/tests/index.html?package=ember-views)
  * [Ember.js Handlebars](http://localhost:4200/tests/index.html?package=ember-handlebars)

To run multiple packages, you can separate them with commas. You can run
all the tests by not specifying a `package` param:

<http://localhost:4200/tests/index.html>

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
