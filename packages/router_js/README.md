# router.js

[![CI](https://github.com/tildeio/router.js/workflows/CI/badge.svg)](https://github.com/tildeio/router.js/actions?query=workflow%3ACI)

`router.js` is a lightweight JavaScript library
that builds on
[`route-recognizer`](https://github.com/tildeio/route-recognizer)
and [`rsvp`](https://github.com/tildeio/rsvp.js)
to provide an API for handling routes.

In keeping with the Unix philosophy, it is a modular library
that does one thing and does it well.

`router.js` is the routing microlib used by
[Ember.js](https://github.com/emberjs/ember.js).

## NPM

To install using npm, run the following command: 

```
npm install --save router_js rsvp route-recognizer
```

## Usage

Create a new router:

```javascript
var router = new Router();
```

Add a simple new route description:

```javascript
router.map(function(match) {
  match("/posts/:id").to("showPost");
  match("/posts").to("postIndex");
  match("/posts/new").to("newPost");
});
```

Add your handlers. Note that you're responsible for implementing your
own handler lookup.

```javascript
var myHandlers = {}
myHandlers.showPost = {
  model: function(params) {
    return App.Post.find(params.id);
  },

  setup: function(post) {
    // render a template with the post
  }
};

myHandlers.postIndex = {
  model: function(params) {
    return App.Post.findAll();
  },

  setup: function(posts) {
    // render a template with the posts
  }
};

myHandlers.newPost = {
  setup: function(post) {
    // render a template with the post
  }
};

router.getRoute = function(name) {
  return myHandlers[name];
};
```

Use another modular library to listen for URL changes, and
tell the router to handle a URL:

```javascript
urlWatcher.onUpdate(function(url) {
  router.handleURL(url);
});
```

The router will parse the URL for parameters and then pass
the parameters into the handler's `model` method. It
will then pass the return value of `model` into the
`setup` method. These two steps are broken apart to support
async loading via **promises** (see below).

To transition into the state represented by a handler without
changing the URL, use `router.transitionTo`:

```javascript
router.transitionTo('showPost', post);
```

If you pass an extra parameter to `transitionTo`, as above,
the router will pass it to the handler's `serialize`
method to extract the parameters. Let's flesh out the
`showPost` handler:

```javascript
myHandlers.showPost = {
  // when coming in from a URL, convert parameters into
  // an object
  model: function(params) {
    return App.Post.find(params.id);
  },

  // when coming in from `transitionTo`, convert an
  // object into parameters
  serialize: function(post) {
    return { id: post.id };
  },

  setup: function(post) {
    // render a template with the post
  }
};
```

## Changing the URL

As a modular library, `router.js` does not express an
opinion about how to reflect the URL on the page. Many
other libraries do a good job of abstracting `hash` and
`pushState` and working around known bugs in browsers.

The `router.updateURL` hook will be called to give you
an opportunity to update the browser's physical URL
as you desire:

```javascript
router.updateURL = function(url) {
  window.location.hash = url;
};
```

Some example libraries include:

- [history.js](https://github.com/browserstate/history.js/)
- [location-bar](https://github.com/KidkArolis/location-bar)

## Always In Sync

No matter whether you go to a handler via a URL change
or via `transitionTo`, you will get the same behavior.

If you enter a state represented by a handler through a
URL:

* the handler will convert the URL's parameters into an
  object, and pass it in to setup
* the URL is already up to date

If you enter a state via `transitionTo`:

* the handler will convert the object into params, and
  update the URL.
* the object is already available to pass into `setup`

This means that you can be sure that your application's
top-level objects will always be in sync with the URL,
no matter whether you are extracting the object from the
URL or if you already have the object.

## Asynchronous Transitions

When extracting an object from the parameters, you may
need to make a request to the server before the object
is ready.

You can easily achieve this by returning a **promise**
from your `model` method. Because jQuery's Ajax
methods already return promises, this is easy!

```javascript
myHandlers.showPost = {
  model: function(params) {
    return $.getJSON("/posts/" + params.id).then(function(json) {
      return new App.Post(json.post);
    });
  },

  serialize: function(post) {
    return { id: post.get('id') };
  },

  setup: function(post) {
    // receives the App.Post instance
  }
};
```

Because transitions so often involve the resolution of
asynchronous data, all transitions in `router.js`,
are performed asynchronously, leveraging the
[RSVP promise library](https://github.com/tildeio/rsvp.js).
For instance, the value returned from a call
to `transitionTo` is a `Transition` object with a
`then` method, adhering to the Promise API. Any code
that you want to run after the transition has finished
must be placed in the success handler of `.then`, e.g.:

```javascript
router.transitionTo('showPost', post).then(function() {
  // Fire a 'displayWelcomeBanner' event on the
  // newly entered route.
  router.send('displayWelcomeBanner');
});
```

## Nesting

You can nest routes, and each level of nesting can have
its own handler.

If you move from one child of a parent route to another,
the parent will not be set up again unless it deserializes
to a different object.

Consider a master-detail view.

```javascript
router.map(function(match) {
  match("/posts").to("posts", function(match) {
    match("/").to("postIndex");
    match("/:id").to("showPost");
  });
});

myHandlers.posts = {
  model: function() {
    return $.getJSON("/posts").then(function(json) {
      return App.Post.loadPosts(json.posts);
    });
  },

  // no serialize needed because there are no
  // dynamic segments

  setup: function(posts) {
    var postsView = new App.PostsView(posts);
    $("#master").append(postsView.el);
  }
};

myHandlers.postIndex = {
  setup: function() {
    $("#detail").hide();
  }
};

myHandlers.showPost = {
  model: function(params) {
    return $.getJSON("/posts/" + params.id, function(json) {
      return new App.Post(json.post);
    });
  }
};
```

You can also use nesting to build nested UIs, setting up the
outer view when entering the handler for the outer route,
and setting up the inner view when entering the handler for
the inner route.

### Transition Callbacks

When the URL changes and a handler becomes active, `router.js`
invokes a number of callbacks:

#### Model Resolution / Entry Validation Callbacks

Before any routes are entered or exited, `router.js` first
attempts to resolve all of the model objects for destination
routes while also validating whether the destination routes
can be entered at this time. To do this, `router.js` makes
use of the `model`, `beforeModel`, and `afterModel` hooks.

The value returned from the `model` callback is the model
object that will eventually be supplied to `setup`
(described below) once all other routes have finished
validating/resolving their models. It is passed a hash
of URL parameters specific to its route that can be used
to resolve the model.

```javascript
myHandlers.showPost = {
  model: function(params, transition) {
    return App.Post.find(params.id);
  }
```

`model` will be called for every newly entered route,
except for when a model is explicitly provided as an
argument to `transitionTo`.

There are two other hooks you can use that will always
fire when attempting to enter a route:

* **beforeModel** is called before `model` is called,
  or before the passed-in model is attempted to be
  resolved. It receives a `transition` as its sole
  parameter (see below).
* **afterModel** is called after `model` is called,
  or after the passed-in model has resolved. It
  receives both the resolved model and `transition`
  as its two parameters.

If the values returned from `model`, `beforeModel`,
or `afterModel` are promises, the transition will
wait until the promise resolves (or rejects) before
proceeding with (or aborting) the transition.

#### `serialize`

`serialize` should be implemented on as many handlers
as necessary to consume the passed in contexts, if the
transition occurred through `transitionTo`. A context
is consumed if the handler's route fragment has a
dynamic segment and the handler has a model method.

#### Entry, update, exit hooks.

The following hooks are called after all
model resolution / route validation hooks
have resolved:

* **enter** only when the handler becomes active, not when
  it remains active after a change
* **setup** when the handler becomes active, or when the
  handler's context changes

For handlers that are no longer active after a change,
`router.js` invokes the **exit** callback.

The order of callbacks are:

* **exit** in reverse order
* **enter** starting from the first new handler
* **setup** starting from the first handler whose context
  has changed

For example, consider the following tree of handlers. Each handler is
followed by the URL segment it handles.

```
|~index ("/")
| |~posts ("/posts")
| | |-showPost ("/:id")
| | |-newPost ("/new")
| | |-editPost ("/edit")
| |~about ("/about/:id")
```

Consider the following transitions:

1. A URL transition to `/posts/1`.
   1. Triggers the `beforeModel`, `model`, `afterModel`
      callbacks on the `index`, `posts`, and `showPost`
      handlers
   2. Triggers the `enter` callback on the same
   3. Triggers the `setup` callback on the same
2. A direct transition to `newPost`
   1. Triggers the `beforeModel`, `model`, `afterModel`
      callbacks on the `newPost`.
   2. Triggers the `exit` callback on `showPost`
   3. Triggers the `enter` callback on `newPost`
   4. Triggers the `setup` callback on `newPost`
3. A direct transition to `about` with a specified
   context object
   1. Triggers `beforeModel`, resolves the specified
      context object if it's a promise, and triggers
      `afterModel`.
   1. Triggers the `exit` callback on `newPost`
      and `posts`
   2. Triggers the `serialize` callback on `about`
   3. Triggers the `enter` callback on `about`
   4. Triggers the `setup` callback on `about`

### Nesting Without Handlers

You can also nest without extra handlers, for clarity.

For example, instead of writing:

```javascript
router.map(function(match) {
  match("/posts").to("postIndex");
  match("/posts/new").to("newPost");
  match("/posts/:id/edit").to("editPost");
  match("/posts/:id").to("showPost");
});
```

You could write:

```javascript
router.map(function(match) {
  match("/posts", function(match) {
    match("/").to("postIndex");
    match("/new").to("newPost");

    match("/:id", function(match) {
      match("/").to("showPost");
      match("/edit").to("editPost");
    });
  });
});
```

Typically, this sort of nesting is more verbose but
makes it easier to change patterns higher up. In this
case, changing `/posts` to `/pages` would be easier
in the second example than the first.

Both recognize the same sets of URLs but only the nested
ones invoke the hooks in the ancestor routes too.

## Events

When handlers are active, you can trigger events on
the router. The router will search for a registered
event backwards from the last active handler.

You specify events using an `events` hash in the
handler definition:

```javascript
handlers.postIndex = {
  events: {
    expand: function(handler) {
      // the event gets a reference to the handler
      // it is triggered on as the first argument
    }
  }
}
```

For example:

```javascript
router.map(function(match) {
  match("/posts").to("posts", function(match) {
    match("/").to("postIndex");
    match("/:id").to("showPost");
    match("/edit").to("editPost");
  });
});

myHandlers.posts = {
  events: {
    collapseSidebar: function(handler) {
      // do something to collapse the sidebar
    }
  }
};

myHandlers.postIndex = {};
myHandlers.showPost = {};

myHandlers.editPost = {
  events: {
    collapseSidebar: function(handler) {
      // override the collapseSidebar handler from
      // the posts handler
    }
  }
};

// trigger the event
router.trigger('collapseSidebar');
```

When at the `postIndex` or `showPost` route, the `collapseSidebar`
event will be triggered on the `posts` handler.

When at the `editPost` route, the `collapseSidebar` event
will be triggered on the `editPost` handler.

When you trigger an event on the router, `router.js` will
walk backwards from the last active handler looking for
an events hash containing that event name. Once it finds
the event, it calls the function with the handler as the
first argument.

This allows you to define general event handlers higher
up in the router's nesting that you override at more
specific routes.

If you would like an event to continue bubbling after it
has been handled, you can trigger this behavior by returning
true from the event handler.

## Built-in events

There are a few built-in events pertaining to transitions that you
can use to customize transition behavior: `willTransition` and
`error`.

### `willTransition`

The `willTransition` event is fired at the beginning of any
attempted transition with a `Transition` object as the sole
argument. This event can be used for aborting, redirecting,
or decorating the transition from the currently active routes.

```js
var formRoute = {
  events: {
    willTransition: function(transition) {
      if (!formEmpty() && !confirm("Discard Changes?")) {
        transition.abort();
      }
    }
  }
};
```

You can also redirect elsewhere by calling
`this.transitionTo('elsewhere')` from within `willTransition`.
Note that `willTransition` will not be fired for the
redirecting `transitionTo`, since `willTransition` doesn't
fire when there is already a transition underway. If you want
subsequent `willTransition` events to fire for the redirecting
transition, you must first explicitly call
`transition.abort()`.

### `error`

When attempting to transition into a route, any of the hooks
may throw an error, or return a promise that rejects, at which
point an `error` event will be fired on the partially-entered
routes, allowing for per-route error handling logic, or shared
error handling logic defined on a parent route.

Here is an example of an error handler that will be invoked
for rejected promises / thrown errors from the various hooks
on the route, as well as any unhandled errors from child
routes:

```js
var adminRoute = {
  beforeModel: function() {
    throw "bad things!";
    // ...or, equivalently:
    return RSVP.reject("bad things!");
  },

  events: {
    error: function(error, transition) {
      // Assuming we got here due to the error in `beforeModel`,
      // we can expect that error === "bad things!",
      // but a promise model rejecting would also
      // call this hook, as would any errors encountered
      // in `afterModel`.

      // The `error` hook is also provided the failed
      // `transition`, which can be stored and later
      // `.retry()`d if desired.

      router.transitionTo('login');
    }
  }
};
```

## Generating URLs

Often, you'll want to be able to generate URLs from their components. To do so, use the `router.generate(*parts)` method.

```js
myRouter = new Router()
  myRouter.map(function(match){
    match("/posts/:id/:mode").to("showPost", function(match){
      match("/version/:versionId", "postVersion");
    });
  });
  
myHandlers.showPost = {
  serialize: function(obj) {
    return {
      id: obj.id,
      tag: obj.modeName
    };
  } //...
};

myHandlers.postVersion = {
  serialize: function(obj) {
    return {
      versionId: obj.id
    };
  }
  //...
};

//...
```

`*parts` can accept either a set of primitives, or a set of objects. If it is a set of strings, `router.generate` will attempt to build the route using each string in order. 

```js
myRouter.generate("showPost", 4, 'a'); // returns '/posts/4/a'
```

If it is a set of objects, it will attempt to build the route by serializing each object.

```js
myRouter.generate("showPost", {id: 4, modeName: 'a'}); // returns '/posts/4/a'
```

One can also use `generate` with nested routes. With strings, one simply provides all the URL fragments for each route in order:

```js
myRouter.generate("postVersion", 4, 'a', 'first'); // returns '/posts/4/a/version/first'
```

With objects, one provides one object for each route in the chain; each route will then deserialize the corresponding object.

```js
myRouter.generate("postVersion", {id: 4, modeName: 'a'}, {id: 'first'}); // returns '/posts/4/a/version/first'
```

One *can* mix and match between strings and objects; however, this is not recommended, as it can be extremely confusing and error prone:

```js
myRouter.generate("postVersion", 4, modeName: 'a', {id: 'first'}); // returns '/posts/4/a/version/first'
myRouter.generate("postVersion", {id: 4, modeName: 'a'}, 'first'); // returns '/posts/4/a/version/first'
```

## Route Recognizer

`router.js` uses `route-recognizer` under the hood, which
uses an [NFA](http://en.wikipedia.org/wiki/Nondeterministic_finite_automaton)
to match routes. This means that even somewhat elaborate
routes will work:

```javascript
router.map(function(match) {
  // this will match anything, followed by a slash,
  // followed by a dynamic segment (one or more non-
  // slash characters)
  match("/*page/:location").to("showPage");
});
```

If there are multiple matches, `route-recognizer` will
prefer routes that are more specific, so `/posts/edit` will be preferred
over, say, `/posts/:id`.

## Architecture / Contributing

An architectural overview of router.js and its related libraries can be
found in [ARCHITECTURE.md](ARCHITECTURE.md). Please read this document
if you are interested in better understanding / contributing to
router.js.

## Building router.js

1. Ensure that [Node.js](http://nodejs.org/) is installed.
2. Run `npm install` to ensure the required dependencies are installed.
3. Run `npm run build` to build router.js. The builds will be placed in the `dist/` directory.

## Running the unit tests

1. To start the development server, run `npm start`.
2. Visit `http://localhost:4200/tests/`

or from the command line:

1. run `npm test`
