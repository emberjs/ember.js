# Ember.js

Ember.js (formerly SproutCore 2.0) is a JavaScript framework that does all of the heavy lifting that you'd normally have to do by hand. There are tasks that are common to every web app; Ember.js does those things for you, so you can focus on building killer features and UI.

These are the three features that make Ember.js a joy to use:

1. Bindings
2. Computed properties
3. Auto-updating templates

Ember.js has strong roots in SproutCore; you can read more about its evolution in [the Ember.js launch announcement](http://yehudakatz.com/2011/12/08/announcing-amber-js/).

## Bindings

Use bindings to keep properties between two different objects in sync. You just declare a binding once, and Ember.js will make sure changes get propagated in either direction.

Here's how you create a binding between two objects:

```javascript
MyApp.president = Ember.Object.create({
  name: "Barack Obama"
});

MyApp.country = Ember.Object.create({
  // Ending a property with 'Binding' tells Ember.js to
  // create a binding to the presidentName property.
  presidentNameBinding: 'MyApp.president.name'
});

MyApp.country.get('presidentName');
// "Barack Obama"
```
Bindings allow you to architect your application using the MVC (Model-View-Controller) pattern, then rest easy knowing that data will always flow correctly from layer to layer.

## Computed Properties

Computed properties allow you to treat a function like a property:

``` javascript
MyApp.president = Ember.Object.create({
  firstName: "Barack",
  lastName: "Obama",

  fullName: function() {
    return this.get('firstName') + ' ' + this.get('lastName');

    // Call this flag to mark the function as a property
  }.property()
});

MyApp.president.get('fullName');
// "Barack Obama"
```

Treating a function like a property is useful because they can work with bindings, just like any other property.

Many computed properties have dependencies on other properties. For example, in the above example, the `fullName` property depends on `firstName` and `lastName` to determine its value. You can tell Ember.js about these dependencies like this:

``` javascript
MyApp.president = Ember.Object.create({
  firstName: "Barack",
  lastName: "Obama",

  fullName: function() {
    return this.get('firstName') + ' ' + this.get('lastName');

    // Tell Ember.js that this computed property depends on firstName
    // and lastName
  }.property('firstName', 'lastName')
});
```

Make sure you list these dependencies so Ember.js knows when to update bindings that connect to a computed property.

## Auto-updating Templates

Ember.js uses Handlebars, a semantic templating library. To take data from your JavaScript application and put it into the DOM, create a `<script>` tag and put it into your HTML, wherever you'd like the value to appear:

``` html
<script type="text/x-handlebars">
  The President of the United States is {{MyApp.president.fullName}}.
</script>
```

Here's the best part: templates are bindings-aware. That means that if you ever change the value of the property that you told us to display, we'll update it for you automatically. And because you've specified dependencies, changes to *those* properties are reflected as well.

Hopefully you can see how all three of these powerful tools work together: start with some primitive properties, then start building up more sophisticated properties and their dependencies using computed properties. Once you've described the data, you only have to say how it gets displayed once, and Ember.js takes care of the rest. It doesn't matter how the underlying data changes, whether from an XHR request or the user performing an action; your user interface always stays up-to-date. This eliminates entire categories of edge cases that developers struggle with every day.

# Getting Started

For new users, we recommend downloading the [Ember.js Starter Kit](https://github.com/emberjs/starter-kit/downloads), which includes everything you need to get started.

We also recommend that you check out the [annotated Todos example](http://annotated-todos.strobeapp.com/), which shows you the best practices for architecting an MVC-based web application. You can also [browse or fork the code on Github](https://github.com/emberjs/todos).

[Guides are available](http://guides.sproutcore20.com/) for Ember.js. If you find an error, please [fork the guides on GitHub](https://github.com/sproutcore/sproutguides/tree/v2.0) and submit a pull request. (Note that Ember.js guides are on the `v2.0` branch.)

# Building Ember.js

NOTE: Due to the rename, these instructions may be in flux

1. Run `rake` to build Ember.js. Two builds will be placed in the `dist/` directory.
  * `ember.js` and `ember.min.js` - unminified and minified
    builds of Ember.js

If you are building under Linux, you will need a JavaScript runtime for
minification. You can either install nodejs or `gem install
therubyracer`.

# How to Run Unit Tests

1. Install Ruby 1.9.2+. There are many resources on the web can help; one of the best is [rvm](http://rvm.beginrescueend.com/).

2. Install Bundler: `gem install bundler`

3. Run `bundle` inside the project root to install the gem dependencies.

4. To start the development server, run `bundle exec rackup`.

5. Then visit: `http://localhost:9292/tests/index.html?package=PACKAGE_NAME`.  Replace `PACKAGE_NAME` with the name of the package you want to run.  For example:

  * [Ember.js Runtime](http://localhost:9292/tests/index.html?package=ember-runtime)
  * [Ember.js Views](http://localhost:9292/tests/index.html?package=ember-views)
  * [Ember.js Handlebars](http://localhost:9292/tests/index.html?package=ember-handlebars)

To run multiple packages, you can separate them with commas. You can run all the tests using the `all` package:

[http://localhost:9292/tests/index.html?package=all](http://localhost:9292/tests/index.html?package=all)