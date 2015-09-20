The fundamental primitive of the Glimmer system is the "reference".

References represent:

* Property paths from a given root
* The result of a read-only computation

It has this interface:

```idl
interface Reference<T> : Destroyable {
  T value();
  bool isDirty();
}

interface Destroyable {
  void destroy();
}
```

You can get the current value of a reference by calling `.value()` on it.

If `isDirty` returns true, that means that calling `.value()` might (but is not required to) return a different value.

## Composition

It is possible to build functions like `map` for the base reference type:

```js
class MapReference {
  constructor(parent, callback) {
    this._parent = parent;
    this._callback = callback;
  }

  // compute the value by asking the parent reference for its value and passing it to the callback
  value() {
    return this._callback.call(undefined, this._parent.value());
  }

  // we're dirty if our parent is dirty
  isDirty() {
    return this._parent.isDirty();
  }

  // nothing to do here
  destroy() {}
}

function map(parent, callback) {
  return new MapReference(parent, callback);
}
```

## Web Framework Processing Model

The basic processing model for using this type in web frameworks is:

1) Dynamic areas are populated with the initial `.value()` of a reference
2) Every time you think you might want to update a dynamic area, first check `.isDirty()` on its associated reference. If it's false, there's no work to be done.
3) If it's true, get the `.value()` again and update the area.

Exactly how you decide that you want to update a dynamic area is left up to the web framework, but web frameworks (Ember, Angular and React at least) usually batch updates until the application code has finished running.

Through the rest of this explainer, when I refer to the model used by a web framework, I do not mean that they are using a "reference" concept internally, but rather than you can understand the tradeoffs made by that library in terms of references. (this also means that Glimmer could implement a model that made the same set of tradeoffs using references)

## Simple Usage

Here's the usage of a simple library you can write that implements `Reference` for working with object paths.

```js
let obj = { person: { first: "Yehuda", last: "Katz" } };
let root = RootReference(obj);
let firstName = root.path('person.first');

firstName.value() // "Yehuda"
firstName.isDirty() // true (see below)

obj.update({ person: { first: "Godfrey", last: "Chan" } });

firstName.isDirty() // true (see below)
firstName.value() // "Godfrey"
```

In this case, since the library is working with mutable objects, it would probably always report that the reference was dirty. It could also track the last value, but that would only be useful if the whole path was guaranteed to be immutable, which is not the case here.

This is roughly the Angular "dirty checking" model. On every "digest loop" (after the application code has finished running), check all active references. If a reference is dirty, update its area of DOM.

This means that we have to do a lot of dirty checking, but it also means that the user is completely insulated from participating in updating the DOM when they update values.

## Better Than Dirty Tracking

We could also write a version of this library that just reported `false` unless the root was explicitly updated.

```js
let obj = { person: { first: "Yehuda", last: "Katz" } };
let root = RootReference(obj);
let firstName = root.path('person.first');

firstName.value() // "Yehuda"
firstName.isDirty() // false

obj.update({ person: { first: "Godfrey", last: "Chan" } });

firstName.isDirty() // true
firstName.value() // "Godfrey"
```

In this version of the library, the path only reports that it's dirty if the root that it was chained off of is explicitly updated.

This allows us to have objects that we can change as usual, as long as somebody eventually notifies the root that the changes were made.

This is roughly the React "setState" model. Each component controls a root, and calling `setState` on a component is roughly equivalent to `update()`ing the root that it owns. In practice, `setState` also builds a new tree of virtual DOM, but that is a consequence of the JSX model, not the data flow model.

The "cursor" approach sometimes used in React is an explicit encoding of something like this idea.

The main frustrating thing about this model is that since JavaScript objects are actually mutable, if somebody changes an internal part of a rooted object without notify the root, the `value()` will be out of sync and the reference will report clean.

Using immutable objects under the root is one way to address this problem, because it ensures that flushing the root is the only way to cause the paths off of the root to become dirty.

## Collaborating Object Model

Finally, we could write a version of the library that has a collaborating object model:

```js
let Person = ReactiveObject.extend();

let person = Person.create({ first: "Yehuda", last: "Katz" });
let obj = { person: person };
let root = RootReference(obj);
let firstName = root.path('person.first');

firstName.value() // "Yehuda"
firstName.isDirty() // false

person.set('first', "Yohuda");

firstName.isDirty() // true
firstName.value() // "Yohuda"

obj.update({ person: Person.create({ first: "Godfrey", last: "Chan" }) });

firstName.isDirty() // true
firstName.value() // "Godfrey"
```

This is roughly the Ember model. Ember assumes that all mutations will occur through `object.set()` or `Ember.set()`, and therefore knows precisely when a particular path is dirty. The internal `ChainNode` system in `ember-metal` is effectively a reference system that is limited to the object model.

Here's the same example with `Ember.set`.

```js
let obj = { person: { first: "Yehuda", last: "Katz" } };
let root = RootReference(obj);
let firstName = root.path('person.first');

firstName.value() // "Yehuda"
firstName.isDirty() // false

Ember.set(obj, 'person.first', "Yohuda');

firstName.isDirty() // true
firstName.value() // "Yohuda"

obj.update({ person: { first: "Godfrey", last: "Chan" } });

firstName.isDirty() // true
firstName.value() // "Godfrey"
```

One of the biggest limitations of this model is that it requires all mutations to go through `Ember.set`, which can become awkward, especially when interacting with libraries not designed for Ember.

That said, it was always possible to do something like this:

```js
let person = { first: "Yehuda", last: "Katz" };
let obj = { person };
let root = RootReference(obj);
let firstName = root.path('person.first');

firstName.value() // "Yehuda"
firstName.isDirty() // false

Ember.set(obj, 'person', { first: "Godfrey", last: "Chan" });

firstName.isDirty() // true
firstName.value() // "Godfrey"
```

However, the Ember 1.x view layer was not set up to handle this well, as we will see.

## Trouble in Paradise

> From this point on, I'll explore the historical limitations of the
> Ember templating layer, how we have improved them in Glimmer, and what
> we can do further. If you're not interested in that, jump directly to
> the "Composition" section below.

While this worked well in the Ember object model, the Ember 1.12 view layer didn't do a good job tracking replacements to entire objects higher up in the chain.

```hbs
{{#each post.comments as |comment|}}
  <p>{{comment.body}}</p>
{{/each}}
```

```js
let comments = [{ id: "1", votes: 10, body: "Hello" }, { id: "2", votes: 50, body: "First" }];;
let obj = { post: { comments: comments } };
let root = RootReference(obj);
let comments = root.path('post.comments');

// loop over the comments and put them in the DOM
let currentComments = comments.value();
let comment1 = currentComments[0]; // put in DOM
let comment2 = currentComments[1]; // put in DOM

root.update({ post: { comments: comments.sortBy('votes', 'desc') } });

// if we want to update the list
comment.isDirty() // true

// comments no longer represents the same array, so we need to start over
currentComments = comments.value();
// throw away the DOM made for comment1 and comment2
comment1 = currentComments[0]; // put in DOM
comment2 = currentComments[1]; // put in DOM
```

The coarseness of the tracking in the 1.12 template engine made it very likely that changes to entire data structures would destroy entire areas. This is unfortunate because:

1. Most parts of a template are actually static and wouldn't need to change even if the underlying values were all different.
2. In the case of sorting an array, there is already a perfectly good chunk of DOM to reuse. This is also true more generally; just because a data structure was replaced high up does not mean that the values put into the DOM have changed.

The original Glimmer engine changed the model so that:

1. Static parts of a template that have not changed never need to be torn down
2. Dynamic parts are not changed unless the computed inputs to that dynamic part have changed.

Here's a concrete example:

```hbs
{{#if currentUser.isAdmin}}
<p>Admin</p>
<p>{{currentUser.name}}</p>
{{/if}}
```

```js
this.currentUser = { isAdmin: true, name: "Stefan Penner" };

// rendering the template results in <p>Admin</p><p>Stefan Penner</p>

this.set('currentUser', { isAdmin: true, name: "Robert Jackson" });
```

In Ember 1.12, since currentUser has changed, Ember would tear down the entire block and start over. In Glimmer, since `currentUser.isAdmin` remains true, we don't tear down the contents of the block, and then we only update the text node that said `"Stefan Penner"` to now say `"Robert Jackson"`.

This makes replacing entire data structures a reasonable part of the Ember programming model as of Ember 1.13.

## Two Worlds

While this was an effective improvement to the templating layer, Glimmer itself is not aware of the Ember object model, requiring it to register and teardown observers quite often to bridge the gap.

1. A template itself creates a series of RootReferences for the component (`this`) and all locals (block arguments)
2. For each template, asking for a reference to a path creates a series of linked references (`comment.byline.name` will create a chain of `this` -> `comment` -> `byline` -> `name`).
3. If there is any reuse, the same reference is used (`comment.byline.name` and `comment.byline.date` share the same reference from `this` -> `comment` -> `byline`).
4. For each link in the chain, Glimmer adds an Ember observer, and tears it down when the template is destroyed.

> The current version of Ember calls references "Streams". The internal object model manages observers in a similar way, and its references are called `ChainNode`s.

The bridging of the `Stream` and `ChainNode` worlds via observers works reasonably well, but has a few issues:

1. There is no sharing of Streams across templates. If two separate templates refer to `someModel.name`, that creates two streams, which each manage their own observers. (Internally, the `ChainNode` system is smart enough to avoid some work.)
2. Subscribing to a stream which then registers an observer is an unnecessary duplication of work that adds up in hot paths.
3. Because Streams create many links from objects into the view layer, tearing down a particular part of the view layer requires unlinking a large number of observers, which happens via recursive teardown of streams. Ideally, only the small number of direct links between the object layer and view layer would have to be torn down.
4. The ChainNode system is fairly opaque and has a small bus factor. Adding features like support for Immutable JS in the most efficient way is tricky.

The TLDR is: the bridging has too much cost.

## Unifying Streams and ChainNodes into References

The solution is to unify both systems into a single system: References.

A complete implementation is outside the scope of this explainer, but the short version is that it's possible to store references in the objects themselves that can be shared across all templates the same way that `ChainNode`s can be shared today.

## More Efficient Composition Via Notifiation

Ehen doing a lot of composition using the base type, each intermediate link has to call `isDirty()` on all of its inputs, which can quickly add up.

To reduce the cost of dirty checking, there is an optional extension to the reference type that allows the root reference to notify child references when they have become dirty. This interface can be used to build chains of references, but the end consumer of such a chain still checks the dirtiness of the final reference to decide what to do.

```idl
interface NotifyingReference<T> : Reference<T> {
  Destroyable _chain(NotifyingReference child);
  void _notify();
}
```

Implementing the `map` function for this type is more involved:

```js
class MapReference {
  constructor(parent, callback) {
    // same as before
    this._parent = parent;
    this._callback = callback;

    this._dirty = true;

    // bookkeeping for chaining
    this._chainedRefs = new Set();
    this._unchain = parent.chain(this);
  }

  // same as before
  value() {
    this._dirty = false; // not dirty until the next time we're notified
    return this._callback.call(undefined, this._parent);
  }

  isDirty() {
    // the remembered dirtiness flag
    return this._dirty;
  }

  // this is called by our parent when it wants to let us know that it has become dirty
  notify() {
    // first, set our dirty flag
    this._dirty = true;

    // notify any chainable references that asked to be notified
    this._chainedRefs.forEach(ref => chainedRef.notify());
  }

  // this is how children ask us to be notified
  chain(child) {
    this._chainedRefs.add(child);
    return { destroy: () => { this._chainedRefs.delete(child) } };
  }

  // when we are destroyed, ask the parent to stop notifying us of changes
  destroy() {
    this._unchain.destroy();
  }
}

function map(parent, callback) {
  return new MapReference(parent, callback);
}
```

It is of course quite simple to make a base class to handle these mechanics:

```js
class NotifyingReference {
  constructor() {
    this._dirty = true;
    this._chainedRefs = new Set();
    this._sources = new Set();
  }

  value() {
    this._dirty = false;
    return this.compute(); // subclasses implement compute
  }

  isDirty() { return this._dirty; }

  notify() {
    this._dirty = true;
    this._chainedRefs.forEach(ref => chainedRef.notify());
  }

  chain(child) {
    this._chainedRefs.add(child);
    return { destroy: () => { this._chainedRefs.delete(child) } };
  }

  destroy() {
    this._sources.forEach(s => s.destroy());
  }

  // helper
  _addDependency(ref) {
    this._sources.add(ref);
  }
}

// Using the base class
class MapReference extends NotifyingReference {
  constructor(parent, callback) {
    super();
    this._parent = parent;
    this._callback = callback;
    this._addDependency(parent);
  }

  compute() {
    return this._callback.call(undefined, this._parent);
  }
}
```



