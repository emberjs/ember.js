### Table of Contents

1. [Introduction](./01-introduction.md)
2. [~~Precompiler Overview~~](./02-precompiler-overview.md)
3. [~~Runtime Overview~~](./03-runtime-overview.md)
4. [References](./04-references.md)
5. [Validators](./05-validators.md)
6. [~~Runtime Compiler~~](./06-runtime-compiler.md)
7. [~~Initial Render~~](./07-initial-render.md)
8. [~~Rerendering (Updating)~~](./08-rerendering-updating.md)
9. [~~The Environment~~](./09-the-environment.md)
10. [~~Optimizations~~](./10-optimizations.md)

# References

The core primitive of the Glimmer runtime is the `Reference` abstract data
type.

Fundamentally, a reference is a stable object that represents the result of a
pure (side-effect-free) computation, where the result of the computation
might change over time. It has the following interface:

```typescript
interface Reference<T> {
  value(): T;
}
```

If you are familiar with FRP terminologies, you might recognize this as a
discrete "signal". The key departure from other similar constructs in other
libraries (such as Ember's `Stream`s and ReactiveX's `Observable`s) is that
references is a pull-based system with no notion of "subscriptions" or
"notifications".

As explained in the previous chapter, we find a pull-based system to be a
better fit (and ultimately more efficient) for the kind of problems we are
trying to solve. (In the next chapter, we will discuss a technique for tracking
changes without notifications.)

In the following example, we will construct a simple reference that "captures"
the value for the `foo` variable over its lifetime:

```typescript
let foo = 1;

let fooReference: Reference<number> = {
  value() {
    return foo;
  }
};

fooReference.value(); // => 1

foo++;

fooReference.value(); // => 2
```

As you can see, calling `fooReference.value()` will always yield the current
value of the `foo` variable.

This is a fairly basic example, but it begins to illustrate the power of the
`Reference` abstraction. While JavaScript variables always contain *values*
that could be passed around to (and held onto by) other functions, the
*variable bindings* themselves are not a first-class value. Using the reference
system, it is trivial to pass a variable *by reference* (hence the name for the
`Reference` data type).

### Composition

`Reference`s are inherently composable. In this example, we will model the
`foo + bar` computation using `Reference`s:

```typescript
let foo = 1;
let bar = 2;

let fooReference: Reference<number> = {
  value() {
    return foo;
  }
};

let barReference: Reference<number> = {
  value() {
    return bar;
  }
};

let fooPlusBarReference: Reference<number> = {
  value() {
    return fooReference.value() + barReference.value();
  }
};

fooPlusBarReference.value(); // => 3

foo = 2;

fooPlusBarReference.value(); // => 4

bar = 3;

fooPlusBarReference.value(); // => 5
```

As you can see, `fooPlusBarReference` *composes* `fooReference` and
`barReference` instead of accessing the variables directly. As `foo` and `bar`
change over time, the `fooPlusBarReference` stays up-to-date and returns the
correct result of `foo + bar`.

### Combinators

Because `Reference`s are so composable, it is also very easy to write some
higher-order combinators to model some common operations. For example, we can
generalize `fooPlusBarReference` into a reusable `AdditionReference` class:

```typescript
class AdditionReference implements Reference<number> {
  private lhs: Reference<number>;
  private rhs: Reference<number>;

  constructor(lhs: Reference<number>, rhs: Reference<number>) {
    this.lhs = lhs;
    this.rhs = rhs;
  }

  value(): number {
    return this.lhs.value() + this.rhs.value();
  }
}
```

Another example is the "map" operation:

```typescript
// A `Mapper` is a function that takes a value of type `T` and returns a new
// value of type `U`.
type Mapper<T,U> = (T) => U;

function map<T,U>(source: Reference<T>, mapper: Mapper<T,U>): Reference<U> {
  return new MapperReference(source, mapper);
}

class MapperReference<T, U> implements Reference<U> {
  private source: Reference<T>;
  private mapper: Mapper<T,U>;

  constructor(source: Reference<T>, mapper: Mapper<T,U>) {
    this.source = source;
    this.mapper = mapper;
  }

  value(): U {
    let { source, mapper } = this;
    return mapper(source.value());
  }
}

let foo = 4919;

let fooReference: Reference<number> = {
  value() {
    return foo;
  }
};

// Converts a number into its hexidecimal (base 16) representation
let toHexMapper: Mapper<number, string> = function(num) {
  return '0x' + num.toString(16).toUpperCase();
};

let hexReference = map(fooReference, toHexMapper);

hexReference.value(); // => '0x1337'

foo = 49374;

hexReference.value(); // => '0xC0DE'
```

### Lazy Evaluation

Since references are pull-based, it is trivial to implement lazy evaluation
semantics simply by avoiding calling `.value()` until it is necessary. Consider
this naïve implementation of a reference that models the ternary conditional
expression in JavaScript (`condition ? ifTrue : ifFalse`):

```typescript
class ConditionalExpressionReference<T> implements Reference<T> {
  private predicate: Reference<boolean>;
  private consequent: Reference<T>;
  private alternative: Reference<T>;

  constructor(predicate: Reference<boolean>, consequent: Reference<T>, alternative: Reference<T>) {
    this.predicate = predicate;
    this.consequent = consequent;
    this.alternative = alternative;
  }

  value(): T {
    let predicate = this.predicate.value();
    let consequent = this.consequent.value();
    let alternative = this.alternative.value();

    return predicate ? consequent : alternative;
  }
}

let dayOfWeek = 'Friday';

let isWorkDay: Reference<boolean> = {
  value() {
    return dayOfWeek !== 'Saturday' && dayOfWeek !== 'Sunday';
  }
};

let work: Reference<string> = {
  value() {
    let result = [];

    result.push('Working...');
    result.push('Working...');
    result.push('Working...');
    result.push('(X_X)');

    return result.join(' ');
  }
};

let relax: Reference<string> = {
  value() {
    return 'Relaxing... (v_v)'
  }
};

let result = new ConditionalExpressionReference(isWorkDay, work, relax);

result.value(); // => 'Working... Working... Working... (X_X)'

dayOfWeek = 'Saturday';

result.value(); // => 'Relaxing... (v_v)'
```

While this implementation works, it eagerly evaluates both the "consequent"
and "alternative" references, even though only one of the two values are used.
This is not ideal, because the references might represent arbitrarily expensive
computations.

Instead, we can change the implementation to evaluate the references lazily
(also known as "short-circuit evaluation" in this case):

```typescript
class ConditionalExpressionReference<T> implements Reference<T> {
  // ...

  value(): T {
    let { predicate, consequent, alternative } = this;

    if (predicate.value()) {
      return consequent.value();
    } else {
      return alternative.value();
    }
  }
}
```

In this improved implementation, it is guaranteed that only one of the two
clauses is evaluated, eliminating a wasteful and potentially expensive
computation.

* * *

## References in Glimmer

References play a very important role in the Glimmer templating system.

When Glimmer renders a template, each dynamic segment (such as the `{{foo}}` in
`<b>{{foo}}</b>`) are represented by a single reference. On initial render,
these dynamic segments are populated by pulling an initial `value()` out of
these references.

These references also allow the templates to be re-rendered later with the
most-current data, simply by pulling the latest `value()` out of each reference
and updating the DOM nodes correspondingly (we will discuss the second part
later).

References also help bridge the gap between the "impure" (effectful) parts
of the system from the "pure" (functional) part of the system.

In Handlebars, a template is always rendered against a "context" (typically
known as "self" inside Glimmer), similar to JavaScript's `this` when invoking
a function. Take the following template as an example:

```handlebars
<h1>Welcome, {{user.name.first}}!</h1>

<p>Message of the day: {{motd}}</p>
```

Assuming `motd` is not a helper, both of the dynamic segments are describing a
path lookup on the context (sometimes called a "self lookup" inside Glimmer).
That is, `{{user.name.first}}` is referring the value of `this.user.name.first`
where `this` is the context object. In fact, they can be rewritten as
`{{this.user.name.first}}` and `{{this.motd}}` for clarity.

Since it is possible for the context to change from one object to a different
object between re-renders, the context itself is modeled as a reference.
Because Handlebars supports arbitrary path lookups on the context (as we saw
in the previous example), Glimmer needs a way to create additional references
from the context reference for a given path.

Here is one possible solution:

```typescript
// Encodes the "soft fail" path lookup semantics in Handlebars
//
// Usage:
//   let obj = { foo: { bar: 'baz' } };
//   get(obj, 'foo')              => { bar: 'baz' }
//   get(obj, 'foo, 'bar')        => 'baz'
//   get(obj, 'foo, 'nope')       => undefined
//   get(obj, 'foo, 'bar', 'baz') => undefined
function get(object: any, ...subpaths: string[]) {
  if (subpaths.length === 0) {
    return object;
  }

  if (object && typeof object === 'object') {
    let head = subpaths[0];
    let tail = subpaths.slice(1);

    return get(object[head], ...tail);
  }
}

class PathLookupReference implements Reference<any> {
  private context: Reference<any>;
  private subpaths: string[];

  constructor(context: Reference<any>, path: string) {
    this.context = context;
    this.subpaths = path.split('.');
  }

  value(): any {
    return get(this.context.value(), ...this.subpaths);
  }
}

let context = {
  user: { name: { first: 'Godfrey', last: 'Chan' } },
  motd: 'Welcome back!'
}

let contextReference: Reference<any> = {
  value() {
    return context;
  }
};

// {{user.name.first}}
let firstName = new PathLookupReference(contextReference, 'user.name.first');

// {{motd}}
let motd = new PathLookupReference(contextReference, 'motd');

firstName.value(); // => 'Godfrey'
motd.value(); // => 'Welcome back!'

context.user.name = { first: 'Yehuda', last: 'Katz' };

firstName.value(); // => 'Yehuda'
```

While this implementation works, because it evaluates the context reference
into a value, the "parent" and "child" references are not connected in any
meaningful way.

Occasionally, there might be extra information on the context object that you
might want to propagate to the downstream references.

For example, the context object might be a simple primitive type like strings,
numbers, or `undefined`, in which case all the subsequent path lookups will
yield `undefined`.

Alternatively, the context object might be an immutable data structure, in which
case all of downstream `value()`s do not need to be recomputed so long as
the context object itself did not get replaced.

In addition to the context objects, certain advanced features in Handlebars
(and other extensions in host environments like Ember) inadvertently means that
almost any references (such as the result returned by a helper) can be used in
a path lookup position.

For all of these reasons, Glimmer defines an extension to the base `Reference`
type called a `PathReference`:

```typescript
interface PathReference<T> extends Reference<T> {
  get(path: string): PathReference<any>;
}
```

In addition to the `value()` method, `PathReference`s support a `get` method
that is responsible for converting these path lookups into a child reference.
This allows the parent reference to encode and propagates extra information
downwards.

A simple example is a reference containing a primitive value (such as a string,
a number, `undefined`, etc):

```typescript
const NULL_REFERENCE: PathReference<void> = {
  value() {
    return undefined;
  },

  get(path: string) {
    return NULL_REFERENCE;
  }
};

type Primitive = string | number | boolean | void;

class PrimitiveReference<T extends Primitive> implements PathReference<T> {
  private innerValue: T;

  constructor(value: T) {
    this.innerValue = value;
  }

  value(): T {
    return this.innerValue;
  }

  get(path: string): PathReference<void> {
    return NULL_REFERENCE;
  }
}
```

Since all subsequent path lookups on a primitive value will always yield
`undefined`, `PrimitiveReference` is able to take advantage of this information
and return a constant, specialized `PathReference` in its implementation of
`get()`.

Another example is the `hash` helper in Ember, which takes the named arguments
and convert it into a "hash" (or "dictionary") object:

```handlebars
<user-profile user={{currentUser}} options={{hash compact=false me=true}} />

{{#each currentUser.friends as |friend|}}
  <user-profile user={{friend}} options={{hash compact=true me=false}} />
{{/each}}
```

Inside the `user-profile` component, `options` can be accessed like a regular
property:

```handlebars
<div class="user-profile">
  <h3>{{@user.name}}</h3>

  {{#unless @options.me}}
    <mutual-friends user={{@user}} />
  {{/unless}}

  {{#unless @options.compact}}
    ...
  {{/unless}}
</div>
```

Here is a simplified implementation for the `hash` reference:

```typescript
class HashReference implements PathReference<Dictionary<any>> {
  private args: Dictionary<PathReference<any>>;

  constructor(args: Dictionary<PathReference<any>>) {
    this.args = args;
  }

  value(): Dictionary<any> {
    let dict = new Dictionary<any>();

    Object.keys(this.args).forEach((name) => {
      dict[name] = this.args[name].value();
    });

    return dict;
  }

  get(path: string): PathReference<any> {
    return this.args[path] || NULL_REFERENCE;
  }
}
```

By implementing the `PathReference` interface, `HashReference` can avoid
constructing the `Dictionary` object (and evaluating all the unused references
in the process) to fulfill a simple path lookup (e.g. `{{@options.me}}` in the
example above).

* * *

[Next: Validators »](./05-validators.md)
