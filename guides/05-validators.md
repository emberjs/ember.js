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

# Validators

Since the computation encapsulated in a reference can be arbitrarily expensive,
it is usually a good idea to avoid recomputing its `value()` more often than
necessary.

In particular, because references are modeling pure computations, there is no
reason to recompute the `value()` of reference if its inputs has not changed.
While it is not always possible to enumerate the inputs to a reference, it can
be done in a lot of cases.

For example, Handlebars helpers are required to be pure functions that operate
solely on their inputs (arguments). If the inputs have not changed, the result of
the helper invocation will also remain unchanged.

Consider this simple example:

```handlebars
<p>{{uppercase (concat book.title ": " book.subtitle)}}</p>
```

The `concat` and `uppercase` helpers can be modeled as such:

```typescript
class ConcatReference implements Reference<string> {
  private parts: Reference<string>[];

  constructor(...parts: Reference<string>[]) {
    this.parts = parts;
  }

  value(): string {
    return this.parts.map(reference => reference.value()).join('');
  }
}

class UppercaseReference implements Reference<string> {
  private str: Reference<string>;

  constructor(str: Reference<string>) {
    this.str = str;
  }

  value(): string {
    return this.str.value().toUpperCase();
  }
}

///

// <p>{{uppercase (concat book.title ": " book.subtitle)}}</p>

let book = {
  title: 'The Lord of the Rings',
  subtitle: 'The Fellowship of the Ring'
};

let titleReference: Reference<string> = {
  value() {
    return book.title;
  }
};

let seperatorReference: Reference<string> = {
  value() {
    return ': ';
  }
};

let subtitleReference: Reference<string> = {
  value() {
    return book.subtitle;
  }
};

let result: Reference<string> = (
  new UppercaseReference(
    new ConcatReference(
      titleReference,
      seperatorReference,
      subtitleReference
    )
  )
);

result.value(); // => 'THE LORD OF THE RINGS: THE FELLOWSHIP OF THE RING'

book.subtitle = 'The Two Towers';

result.value(); // => 'THE LORD OF THE RINGS: THE TWO TOWERS'
```

In this case, the inputs to both `ConcatReference` and `UppercaseReference` are
quite clear: `ConcatReference` takes an array of references as input, therefore
it only needs to be recomputed if and only if any of the input references have
"changed" (i.e. a "reduce" operation); on the other hand, `UppercaseReference`
takes a single reference as input, so it should only be recomputed if and only
if the input reference has "changed" (i.e. a "map" operation).

This presents a recursive problem – we know how to model the freshness of
a `ConcatReference` and `UppercaseReference` as long as we also have a way to
model the freshness of their input references. In other words, we need a system
that allows us describe the freshness of a computation in terms of their
inputs.

The validators system in Glimmer is designed to solve exactly this problem. For
now, we will set aside the fundamental question of how to derive the freshness
of a computation in the first place and focus on the composition aspect of the
validators system.

## Entity Tags

The core primitive of the validators system is called an `EntityTag`. An entity
tag is a stable object that provides certain guarantees about the freshness of
a computation result. It has the following interface:

```typescript
interface EntityTag<T> {
  value(): T;
  validate(ticket: T): boolean;
}
```

Specifically, each entity tag has a `value()` method that returns an *opaque
validation ticket* which encodes the current state of the computation.

The validation ticket can later be passed back into the `validate` method on
the same entity tag, which returns a boolean value indicating the whether the
computation result might have changed since the validation was produced.

Specifically, if `validate` returns `true` for the given validation ticket, it
is guaranteed that the computation result has *not* changed since the
validation ticket was produced. In other words, if you have cached the result
of the computation at the same time (more precisely – the same "time step" of
the discrete system) when the validation ticket was produced, it is not
necessary to rerun the same computation again since the result would be
equivalent.

On the other hand, if `validate` returns `false`, the computation *might* have
changed since the validation ticket was produced. Any cached result can no
longer be relied on and a recomputation is necessary.

However, a negative validation does not imply rerunning the computation would
*always* yield a different result – it merely means that the entity tag can no
longer be certain about the freshness of the computation. In other words, it
operates like a bloom filter in that false positives are explicitly allowed and
expected from time to time.

Aside: if you are paying close attention, you might notice that `EntityTag`
happens to implement the `Reference` interface! While interesting, this does
not have much practical implications. However, it is helpful to remember that,
just like references, entity tags are stable, long lived objects that a can be
held on to by a consumer and queried repeatedly.

### Entity Tags in HTTP

The entity tag system in Glimmer is inspired by a similar system in the HTTP
protocol. Understanding its origin might be helpful for understanding some of
the operational details of the Glimmer validators system.

In the HTTP protocol, entity tags (or "ETags") are used to handle revalidation
of cached web content. When rendering a page, an HTTP server can optionally
include an `ETag` header in the response. For example:

```
HTTP/1.1 200 OK
Date: Wed, 30 Mar 2016 00:00:00 GMT
Content-Type: text/plain
ETag: "0267aa812d66aafb7c4ffb790d8b5ffc"
Content-Length: 12

Hello world!
```

The `ETag` header here is an opaque validator chosen by the server that encodes
information about this response. For example, a common implementation is an MD5
hash (or any other hash functions) of the response body.

The browser can then cache the response alongside with the `ETag`. When the user
requests the same page again, it could send a "conditional GET" request to the
server with the cached `ETag`:

```
GET /motd HTTP/1.1
If-None-Match: "0267aa812d66aafb7c4ffb790d8b5ffc"
Host: example.com
```

At this point, the server can do whatever it takes to determine the freshness of
the cached content. For example, the server can re-apply the same hash function
to the document and compare that against the `ETag` supplied by the client.

After this process, if the server determined that the cached content is still
valid, it can then send an empty "Not Modified" response and avoid transmitting
the same content again:

```
HTTP/1.1 304 Not Modified
Date: Wed, 30 Mar 2016 00:30:00 GMT
ETag: "0267aa812d66aafb7c4ffb790d8b5ffc"
Content-Length: 0
```

Since the server has confirmed that the cached content is still valid, the
browser can simply fetch the document from its local cache and display it to
the user.

In an alternate universe, the server might find that a new version of the
document has been uploaded since then, meaning that the browser's cached copy
has become stale.

In this universe, the server could simply return the new content along with a
new `ETag`:

```
HTTP/1.1 200 OK
Date: Wed, 30 Mar 2016 00:00:00 GMT
Content-Type: text/plain
ETag: "9e3299e7c8dabfb0aca9aee52a129cca"
Content-Length: 14

Goodbye world!
```

In this case, the browser would evict the old content from its cache, cache
the new version of the document along with the new `ETag` and display the new
content to the user.

### Entity Tags in Glimmer

While entity tags serves a slightly different purpose in Glimmer, the idea is
similar.

Let's define an extension to the `Reference` interface that requires each
reference to have a corresponding tag that guarantees the freshness of its
`value()` method:

```typescript
interface Tagged {
  tag: EntityTag<any>;
}

interface TaggedReference<T> extends Reference<T>, Tagged {
}
```

We will continue to defer the question of *how* exactly do we derive the
freshness of a reference in the first place. For now, take a leap of faith and
assume that they *do* work, and that a tag revalidation is cheap relative to
recomputing the `value()` of a reference.

With this infrastructure in place, we can finally apply this to our helper
references.

Let's start with `UppercaseReference`. If you recall, `UppercaseReference` only
needs to be recomputed if and only if its input reference has changed.
Therefore, we can simply reuse the input reference's entity tag:

```typescript
class UppercaseReference implements TaggedReference<string> {
  public tag: EntityTag<any>;
  private str: Reference<string>;

  constructor(str: TaggedReference<string>) {
    this.tag = str.tag;
    this.str = str;
  }

  value(): string {
    return this.str.value().toUpperCase();
  }
}
```

On the other hand, `ConcatReference` needs to be computed if and only if any of
its input references has changed, so we need to combine the input tags into a
composite tag:

```typescript
class ConcatReference implements TaggedReference<string> {
  public tag: EntityTag<any>;
  private parts: TaggedReference<string>[];

  constructor(...parts: TaggedReference<string>[]) {
    let tags = parts.map(reference => reference.tag);
    this.tag = new CompositeTag(tags);
    this.parts = parts;
  }

  value(): string {
    return this.parts.map(reference => reference.value()).join('');
  }
}

class CompositeTag implements EntityTag<any[]> {
  private tags: EntityTag<any>[];

  constructor(tags: EntityTag<any>[]) {
    this.tags = tags;
  }

  value(): any[] {
    return this.tags.map(tag => tag.value());
  }

  validate(tickets: any[]): boolean {
    return this.tags.every((tag, i) => tag.validate(tickets[i]));
  }
}
```

Finally, we can put all of these together and write a very simple renderer that
renders a reference into a single text node and keeps it up-to-date:

```typescript
class SimpleRenderer {
  private reference: TaggedReference<string>;
  private lastTicket: any;
  private textNode: Text;

  constructor(reference: TaggedReference<string>) {
    this.reference = reference;
    this.lastTicket = null;
    this.textNode = null;
  }

  render(parentNode = document.body) {
    let { reference } = this;

    this.lastTicket = reference.tag.value();

    let text = reference.value();
    let textNode = this.textNode = document.createTextNode(text);

    parentNode.appendChild(textNode);
  }

  rerender() {
    let { reference, lastTicket } = this;

    if (!reference.tag.validate(lastTicket)) {
      this.textNode.textContent = reference.value();
      this.lastTicket = reference.tag.value();
    }
  }
}
```

Although very basic, this renderer is smart enough to use the entity tags on
the references to avoid unnecessary DOM updates. Fundamentally, this is very
similar to how Glimmer renders simple curlies (e.g. `{{foo}}`) into the DOM.

## Revision Tags

While the abstract concept of entity tags is very flexible, it leaves open the
important question of how to encode freshness information into a validation
ticket up to each individual entity tag implementation.

Furthermore, since we cannot make any assumptions about the semantics of these
encodings, the only way to combine multiple tags is to store one validation
ticket per entity tag and later validate each of the store tickets with the
corresponding tag, i.e. the `CompositeTag` class used in the `ConcatReference`
example.

Since combining tags from multiple input sources is a very common pattern, it
is very important that it could be implemented as efficiently as possible (both
in terms of space and time complexity).

To address this issue, Glimmer uses a specialized variant of the entity tag
system called revision tags. This limitation might be loosened in the future in
favor of letting the host environment supply its own entity tag system.

The revision tag system is based around the idea of a global revision counter.
The global revision counter is a monotonically increasing sequence, which is
just a fancy way of saying that it's a global number that only increases but
never decreases.

Conceptually, a discrete system (which is what Glimmer assumes) can be modeled
a series of state transitions. The global revision counter is incremented by
one every time the system undergoes a state transition. In other words, the
global revision counter is incremented every time a variable is changed in the
system.

In practice, we are only concerned with a subset of all state changes that are
*observable* from the perspective of the templating system. For example, when a
variable that is not part of any templates is modified, it is not particularly
important that the global revision counter is incremented.

In addition to the global counter, each (observable) object in the system has
an internal "last modified" revision counter. Every time an object is modified,
this counter will be set to the current value of the global revision counter
(after the global revision counter has been incremented).

The easiest way to implement this is with a collaborating object model. For
example, all observable changes in Ember are already required to go through the
`Ember.set` function. This is a perfect opportunity to increment both the
global and per-object revision counters.

These primitives lay out the foundation for the revision tag system. If we can
assume each observable object in the system has a `lastModified` counter, then
it would be possible to construct an entity tag for each object where the
validation ticket is the current value of the `lastModified` counter. This tag
will guarantee the freshness of any first-level path lookups on that object.
In other words, all property lookups on an object will have the same result so
long as the `lastModified` remain unchanged.

The following is a simplified implementation of the system. The only departure
from the description above is that the `lastModified` counter is tracked inside
the tag for an object instead of being a separate field on the object. (Besides
simplifying the implementation, it also avoids keeping a pointer from the tag
back to the object).

```typescript
type Revision = number;

type RevisionTag = EntityTag<Revision>;

let $REVISION_COUNTER: Revision = 1;

interface TrackedObject {
  tag: DirtyableTag;
}

class DirtyableTag implements RevisionTag {
  private lastRevision: Revision;

  constructor() {
    this.lastRevision = $REVISION_COUNTER;
  }

  value(): Revision {
    return this.lastRevision;
  }

  validate(ticket: Revision): boolean {
    return ticket === this.lastRevision;
  }

  dirty() {
    this.lastRevision = ++$REVISION_COUNTER;
  }
}

function set(object: TrackedObject, property: string, value: any) {
  object.tag.dirty();
  return object[property] = value;
}

///

let person: TrackedObject = {
  tag: new DirtyableTag(),
  name: 'Godfrey Chan'
};

person.tag.value(); // => 1

set(person, 'name', 'Yehuda Katz');

person.tag.validate(1); // => false
person.tag.value(); // => 2
```

Having a tag on each object allows references to bridge the pure and impure
parts of the system and propagate freshness information across the entire
reference chain.

For example, this is the updated implementation of `UppercaseReference`:

```typescript
interface VersionedReference<T> extends Reference<T> {
  tag: RevisionTag;
}

class UppercaseReference implements VersionedReference<string> {
  public tag: RevisionTag;
  private str: Reference<string>;

  constructor(str: VersionedReference<string>) {
    this.tag = str.tag;
    this.str = str;
  }

  value(): string {
    return this.str.value().toUpperCase();
  }
}

///

const person: TrackedObject = {
  tag: new DirtyableTag(),
  name: 'Godfrey Chan'
};

let nameReference: VersionedReference<string> = {
  tag: person.tag,

  value() {
    return person.name;
  }
};

let uppercaseReference = new UppercaseReference(nameReference);

uppercaseReference.value();         // => 'GODFREY CHAN'
uppercaseReference.tag.value();     // => 1
uppercaseReference.tag.validate(1); // => true

set(person, 'name', 'Yehuda Katz');

uppercaseReference.tag.validate(1); // => false
uppercaseReference.value();         // => 'YEHUDA KATZ'
uppercaseReference.tag.value();     // => 2
```

Since we can now assume that validation tickets are revision numbers, we can
combine them much more efficiently by just returning the largest validation
ticket. Here is the updated implementation of of `ConcatReference` (and
`CompositeTag`):

```typescript
class ConcatReference implements VersionedReference<string> {
  public tag: RevisionTag;
  private parts: VersionedReference<string>[];

  constructor(...parts: VersionedReference<string>[]) {
    let tags = parts.map(reference => reference.tag);
    this.tag = new CompositeTag(tags);
    this.parts = parts;
  }

  value(): string {
    return this.parts.map(reference => reference.value()).join('');
  }
}

class CompositeTag implements RevisionTag {
  private tags: RevisionTag[];

  constructor(tags: RevisionTag[]) {
    this.tags = tags;
  }

  value(): Revision {
    let tickets = this.tags.map(tag => tag.value());
    return Math.max(...tickets);
  }

  validate(ticket: Revision): boolean {
    return ticket === this.value();
  }
};
```

Semantically, this is equivalent to saying a `ConcatReference` is last
modified when any of its input references was last modified, which is
equivalent to saying a `ConcatReference` needs to be recomputed if and only if
any of its input references needs to be recomputed.

There revision tag system also has a few "special" tags.

The constant tag has a `value()` of 0, which is smaller than the initial
revision number. This can be used to model computation and values that can
never changed, such as primitive values:

```typescript
const CONSTANT_TAG: RevisionTag = {
  value() {
    return 0;
  },

  validate(ticket: Revision) {
    return ticket === 0;
  }
};

const NULL_REFERENCE: VersionedReference<void> = {
  tag: CONSTANT_TAG,

  value() {
    return null;
  }
};
```

The volatile tag has a `value()` of `NaN`. This has two interesting properties.
First, because `Math.max(..., NaN, ...)` returns `NaN`, the `NaN` ticket will
dominate any other tickets in a composite tag. Second, because `NaN !== NaN` in
JavaScript, the tickets given out by this tag will never be valid.

Essentially, the volatile tag is a "poison" tag that will cause the entire
reference chain to become volatile. This is very useful for modeling
computations that depend on values (or events) outside of the boundaries of the
collaborating object model (such as objects that can be mutated without going
through `Ember.set`):

```typescript
const VOLATILE_TAG: RevisionTag = {
  value() {
    return NaN;
  },

  validate(ticket: Revision) {
    return false; // NaN !== NaN
  }
};

let currentTime: VersionedReference<number> = {
  tag: VOLATILE_TAG,

  value() {
    return Date.now();
  }
};

let $input = $('input');

let currentInputValue: VersionedReference<string> = {
  tag: VOLATILE_TAG,

  value() {
    return $('input').val();
  }
};
```

The current tag has a `value()` of the current value of the global revision
counter. This is useful for tracking computations involving unspecified inputs
that are known to be within boundaries of the collaborating object model,
because the tickets will be invalidated as soon as anything inside the system
has changed:

```typescript
const CURRENT_TAG: RevisionTag = {
  value() {
    return $REVISION_COUNTER;
  },

  validate(ticket: Revision) {
    return ticket === $REVISION_COUNTER;
  }
};
```

Alternatively, without a collaborating object model, this tag can be used
in all root references that bridges the untracked objects into the system. The
revision counter can be artificially incremented once just before entering the
global render loop: this will ensure that each computation is only performed
once inside each render loop. This assumes the templates are side-effects-free.

Together, this sets of primitives allows us to implement a very efficient yet
expressive dirty-tracking system without notifications and subscriptions within
the reference chain.

* * *

[Next: Runtime Compiler »](./06-runtime-compiler.md)
