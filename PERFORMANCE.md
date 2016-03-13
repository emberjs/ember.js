# Performance

It is important to be conscious of performance in hot code paths. In such code paths there should be 3 goals:

- Be as fast as possible
- Be memory efficient
- Be as stable as possible

This guide is meant to document known performance issues so that the contributors are aware of them.

## Performance Sensitive Areas

- Change detection: `observer`, `computed`
- View creation: `View`, `Renderer`
- Routing: `Router`
- Dependency Injection: `Container`, `Registry`

__Note :__ If you are not in a performance sensitive area feel free to use these constructs. That being said, please do your due diligence to ensure your contribution is indeed not in a hot path.

## Array Methods

Most of the time using array methods e.g. `forEach`, `map`, `filter`, is fine, but in hot paths these methods can become very costly. One would think that these methods would almost be like macros that would compile into more efficient code, but that is not the case. In hot paths these methods can be up to 10X slower than just writing a `for`-loop.

The reason behind the slowness is largely do to the fact that these methods take a closure which allocates memory. In turn this creates GC pressure and potentially creates a polymorphic call site.

## Closures

Try to keep closures to a minimum in hot code paths.

- They create GC pressure.
- They may result in polymorphic call site (see below).

The reason behind why closures are slower is that contrary to popular belief, closures actually cause the VM to create a stateful `context` object at the call site. This is very similar to `new`-ing a constructor and creating an instance at the call site. Because of this closures are grouped into the same Polymorphic and Monomorphic call site heuristics.

## Polymorphic vs Monomorphic Call Sites

Calling `fn()` may be fast or slow depending whether the `fn` variable is polymorphic (changes over time) or monomorphic (stable). The difference can be 4x in speed. Monomorphic sites can be inlined, where as polymorphic sites prevent inline and may even cause de-optimization of your code. In general stick to classes with instance method, and avoid polymorphism for code sensitive paths such as change-detection and dependency injection.

## Named argument

Named arguments are slower than positional arguments because they require creation of intermediary object. In addition this object creates GC pressure. For internal hot code paths we should stay away from named arguments. We should reserved named arguments for external user facing API (or non hot code path code only).

## Default arguments

```
someMethod(arg1 = 'hey') {
  ...
}
```
gets transpiled into:

```
someMethod: function() {
  var arg1 = arguments[0] !== (void 0) ? arguments[0] : 'hey';
  ...
}
```

This prevents Chrome from optimizing the method and shows up in the CPU profile as non optimized method with the mark "Not optimized: Optimized too many times".
