# SproutCore

SproutCore is a JavaScript framework that does all of the heavy lifting that you'd normally have to do by hand. There are tasks that are common to every web app; SproutCore does those things for you, so you can focus on building killer features and UI.

These are the three features that make SproutCore a joy to use:

1. Bindings
2. Computed properties
3. Auto-updating templates

## Bindings

Use bindings to keep properties between two different objects in sync. You just declare a binding once, and SproutCore will make sure changes get propagated in either direction.

Here's how you create a binding between two objects:

    MyApp.president = SC.Object.create({
      name: "Barack Obama"
    });

    MyApp.country = SC.Object.create({
      // Ending a property with 'Binding' tells SproutCore to
      // create a binding to the presidentName property.
      presidentNameBinding: 'MyApp.president.name'
    });

    MyApp.country.get('presidentName');
    // "Barack Obama"

Bindings allow you to architect your application using the MVC (Model-View-Controller) pattern, then rest easy knowing that data will always flow correctly from layer to layer.

## Computed Properties

Computed properties allow you to treat a function like a property:

    MyApp.president = SC.Object.create({
      firstName: "Barack",
      lastName: "Obama",

      fullName: function() {
        return this.get('firstName') + ' ' + this.get('lastName');

        // Call this flag to mark the function as a property
      }.property()
    });

    MyApp.president.get('fullName');
    // "Barack Obama"

Treating a function like a property is useful because they can work with bindings, just like any other property.

Many computed properties have dependencies on other properties. For example, in the above example, the `fullName` property depends on `firstName` and `lastName` to determine its value. You can tell SproutCore about these dependencies like this:

    MyApp.president = SC.Object.create({
      firstName: "Barack",
      lastName: "Obama",

      fullName: function() {
        return this.get('firstName') + ' ' + this.get('lastName');

        // Tell SproutCore that this computed property depends on firstName
        // and lastName
      }.property('firstName', 'lastName')
    });

Make sure you list these dependencies so SproutCore knows when to update bindings that connect to a computed property.

## Auto-updating Templates

SproutCore uses Handlebars, a semantic templating library. To take data from your JavaScript application and put it into the DOM, create a `<script>` tag and put it into your HTML, wherever you'd like the value to appear:

    <script type="text/x-handlebars">
      The President of the United States is {{MyApp.president.fullName}}.
    </script>

Here's the best part: templates are bindings-aware. That means that if you ever change the value of the property that you told us to display, we'll update it for you automatically. And because you've specified dependencies, changes to *those* properties are reflected as well.

Hopefully you can see how all three of these powerful tools work together: start with some primitive properties, then start building up more sophisticated properties and their dependencies using computed properties. Once you've described the data, you only have to say how it gets displayed once, and SproutCore takes care of the rest. It doesn't matter how the underlying data changes, whether from an XHR request or the user performing an action; your user interface always stays up-to-date. This eliminates entire categories of edge cases that developers struggle with every day.

# Getting Started

For new users, we recommend downloading the [SproutCore Starter Kit](https://github.com/sproutcore/starter-kit/downloads), which includes everything you need to get started.

We also recommend that you check out the [annotated Todos example](http://annotated-todos.strobeapp.com/), which shows you the best practices for architecting an MVC-based web application.

The [SproutCore Guides are available](http://guides.sproutcore20.com/) for SproutCore 2.0. If you find an error, please [fork the guides on GitHub](https://github.com/sproutcore/sproutguides/tree/v2.0) and submit a pull request. (Note that 2.0 guides are on the `v2.0` branch.)

To learn more about what we're up to, follow [@sproutcore on Twitter](http://twitter.com/sproutcore), [subscribe to the blog](http://blog.sproutcore.com), or [read the original SproutCore 2.0 announcement](http://blog.sproutcore.com/announcing-sproutcore-2-0/).

# Building SproutCore 2.0

1. Run `rake` to build SproutCore. Two builds will be placed in the `dist/` directory.
  * `sproutcore.js` and `sproutcore.min.js` - unminified and minified
    builds of SproutCore 2.0

If you are building under Linux, you will need a JavaScript runtime for
minification. You can either install nodejs or `gem install
therubyracer`.

# How to Run Unit Tests

1. Install Ruby 1.9.2. There are many resources on the web can help; one of the best is [rvm](http://rvm.beginrescueend.com/).

3. Run `gem install bpm --pre` to install bpm, the browser package
   manager.

4. To start the development server, run `bpm preview`.

5. Then visit: `http://localhost:4020/assets/spade-qunit/index.html?package=PACKAGE_NAME`.  Replace `PACKAGE_NAME` with the name of the package you want to run.  For example:

  * [SproutCore Runtime](http://localhost:4020/assets/spade-qunit/index.html?package=sproutcore-runtime)
  * [SproutCore Views](http://localhost:4020/assets/spade-qunit/index.html?package=sproutcore-views)
  * [SproutCore Handlebars](http://localhost:4020/assets/spade-qunit/index.html?package=sproutcore-handlebars)

To run multiple packages, you can separate them with commas. For
example, to run all of the unit tests together:

[http://localhost:4020/assets/spade-qunit/index.html?package=sproutcore-metal,sproutcore-runtime,sproutcore-views,sproutcore-handlebars](http://localhost:4020/assets/spade-qunit/index.html?package=sproutcore-metal,sproutcore-runtime,sproutcore-views,sproutcore-handlebars)

# Adding New Packages

Be sure you include the new package as a dependency in the global `package.json`.
