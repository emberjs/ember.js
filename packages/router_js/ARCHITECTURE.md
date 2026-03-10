# [router.js](https://github.com/tildeio/router.js) Architecture

This is a guide to `router.js`'s internals.

`router.js` is a stand-alone microlibrary for client-side routing in JavaScript
applications. It's notably used by the [Ember.js Router][Ember Router].


## Scope of `router.js` and its Dependencies

Ember.js's router consumes `router.js`, which in turn consumes
[route-recognizer](https://github.com/tildeio/route-recognizer).

The division of responsibilities of these three libs is as follows:

### `route-recognizer`

`route-recognizer` is an engine for both parsing/generating URLs into/from
parameters.

It can take a URL like `articles/123/comments` and parse out the parameter
`{ article_id: "123" }`.

It can take `{ article_id: "123" }` and a route descriptor like
`articles/:article_id/comments` and generate `articles/123/comments`.

### `router.js`

`router.js` adds the concept of transitions to `route-recognizer`'s
URL parsing engine.

Transitions can be URL-initiated (via browser navigation) or can be
directly initiated via route name
(e.g. `transitionTo('articles', articleObject)`).

`router.js` resolves all of the model objects that needed to be loaded
in order to enter a route.

e.g. to navigate to `articles/123/comments/2`, a promise for both the
`article` and `comments` routes need to be fulfilled.

### Ember Router

The [Ember Router][] adds a DSL for declaring your app's routes on top of
`router.js`. It defines the API for the `Ember.Route` class that handles
intelligent defaults, rendering templates, and loading data into controllers.


## History

`router.js` has gone through a few iterations between 2013 and 2014:

* July of 2013 – `router.js` adds promise-awareness.
* Jan 2014 – refactored `router.js`'s primitives to handle corner cases.

### Corner Cases

1. Avoid running `model` hooks (responsible for fetching data needed to enter a
   route) for shared parent routes.

2. Avoid running model hooks when redirecting in the middle of another transition.
   e.g. during a transition to `articles/123/comments/2` you redirect to
   `articles/123/comments/3` after resolving Article 123 and you want to
   avoid re-running the hooks to load Article 123 again.

3. Handle two different approaches to transitions:

   * URL based (where a URL is parsed into route parameters that are used to
     load all the data needed to enter a route (e.g. `{ article_id: 123 }`).

   * direct named transition-based, where a route name and any context objects
     are provided (e.g. `transitionTo('article', articleObject)`), and the
     provided context object(s) might be promises that can't be serialized
     into URL params until they've fulfilled.


## Classes

### `HandlerInfo`

A `HandlerInfo` is an object that describes the state of a route handler.

For example, the `foo/bar` URL likely breaks down into a hierarchy of two
handlers: the `foo` handler and the `bar` handler. A "handler" is just an
object that defines hooks that `router.js` will call in the course of a
transition (e.g. `model`, `beforeModel`, `setup`, etc.).

In Ember.js, handlers are instances of `Ember.Route`.

A `HandlerInfo` instance contains that handler's model (e.g. `articleObject`),
or the URL parameters associated with the current state of that handler
(e.g. `{ article_id: '123' }`).

Because `router.js` allows you to reuse handlers between different routes and
route hierarchies, we need `HandlerInfo`s to describe the state of each route
hierarchy.

`HandlerInfo` is a top-level class with 3 subclasses:

#### `UnresolvedHandlerInfoByParam`
`UnresolvedHandlerInfoByParam` has the URL params stored on it which it can use
to resolve itself (by calling the handler's `beforeModel`/`model`/`afterModel`
hooks).

#### `UnresolvedHandlerInfoByObject`
`UnresolvedHandlerInfoByObject` has a context object, but no URL params.
It can use the context to resolve itself and serialize into URL params once
the context object is fulfilled.

#### `ResolvedHandlerInfo`
`ResolvedHandlerInfo` has calculated its URL params and resolved context/model
object.

#### Public API
`HandlerInfo` has just a `resolve` method which fires all `model` hooks and
ultimately resolves to a `ResolvedHandlerInfo` object.

The `ResolvedHandlerInfo`'s `resolve` method just returns a promise that
fulfills with itself.

### `TransitionState`

The `TransitionState` object consists of an array of `HandlerInfo`s
(though more might be added to it; not sure yet).

#### Public API
It too has a public API consisting only of a `resolve` method that
will loop through all of its `HandlerInfo`s, swapping unresolved
`HandlerInfo`s with `ResolvedHandlerInfo`s as it goes.

Instances of `Router` and `Transition` contain `TransitionState`
properties, which is useful since, depending on whether or not there is
a currently active transition, the "starting point" of a transition
might be the router's current hierarchy of `ResolvedHandlerInfo`s, or it
might be a transition's hierarchy of `ResolvedHandlerInfo`s mixed with
unresolved HandlerInfos.

### `TransitionIntent`

A `TransitionIntent` describes an attempt to transition.

 via URL
or by named transition (via its subclasses `URLTransitionIntent` and
`NamedTransitionIntent`).

#### `URLTransitionIntent`
A `URLTransitionIntent` has a `url` property.

#### `NamedTransitionIntent`
A `NamedTransitionIntent` has a target route `name` and `contexts` array
property.

This class defines only one method `applyToState` which takes an instance of
`TransitionState` and plays this `TransitionIntent` on top of it to generate
and return a new instance of `TransitionState` that contains a combination of
resolved and unresolved `HandlerInfo`s.

`TransitionIntent`s don't care whether the provided state comes from a router
or a currently active transition; whatever you provide it, both subclasses of
`TransitionIntent`s are smart enough to spit out a `TransitionState`
containing `HandlerInfo`s that still need to be resolved in order to complete
a transition.

Much of the messy logic that used to live in `paramsForHandler`/`getMatchPoint`
now live way less messily in the `applyToState` methods.

This makes it easy to detect corner cases like no-op transitions – if the
returned `TransitionState` consists entirely of `ResolvedHandlerInfo`s, there's
no need to fire off a transition. It simplifies things like redirecting into a
child route without winding up in some infinite loop on the parent route hook
that's doing the redirecting.

This simplifies `Transition#retry`; to retry a transition, provide its `intent`
property to the transitioning function used by `transitionTo`, `handleURL`.
`handle` function will make the right choice as to the correct `TransitionState`
to pass to the intent's `applyToState` method.

This approach is used to implement `Router#isActive`. You can determine if a
destination route is active by constructing a `TransitionIntent`, applying it
to the router's current state, and returning `true` if all of the
`HandlerInfo`s are already resolved.

[Ember Router]: http://emberjs.com/guides/routing/
