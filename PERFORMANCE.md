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

One of the reasons behind the slowness is largely do to the fact that these methods take a closure which allocates memory. In turn this creates GC pressure and potentially creates a polymorphic call site. For a more in depth explanation please see the following [explainer](https://gist.github.com/stefanpenner/376efb906388954146a8).

## Closures

Try to keep closures to a minimum in hot code paths.

- They create GC pressure.
- They may result in polymorphic call site (see below).

The reason behind why closures are slower is that contrary to popular belief, closures actually cause the VM to create a stateful `context` object at the call site. This is very similar to `new`-ing a constructor and creating an instance at the call site. Because of this closures are grouped into the same Polymorphic and Monomorphic call site heuristics.

## Polymorphic vs Monomorphic Call Sites

Calling `fn()` may be fast or slow depending whether the `fn` variable is polymorphic (changes over time) or monomorphic (stable). The difference can be 4x in speed. Monomorphic sites can be inlined, where as polymorphic sites prevent inline and may even cause de-optimization of your code. In general stick to classes with instance method, and avoid polymorphism for code sensitive paths such as change-detection and dependency injection. For more information about how VMs handle optimizations please read [this article](http://mrale.ph/blog/2015/01/11/whats-up-with-monomorphism.html).

```
function add(x, y) {
  return x + y;
}

add(1, 2);      // + in add is monomorphic
add("a", "b");  // + in add becomes polymorphic
```

## Object Shaping And Stability

VMs optimize JS objects by creating hidden classes for each property of that object or context. Because of this you should avoid mutating the shape of an object once it is created.

```
class Point { // Hidden class 0
  constructor(x) {
    this.x = x; // Hidden class 1
  }
}

let p1 = new P(10);
let p2 = new P(11); // Shares hidden class 1
let p3 = new P(12);
p3.y = 20; // Creates hidden class 2 :(
```

## Default arguments

```
someMethod(arg1 = 'hey') {
  ...
}
```
gets transpiled into:

```
someMethod: function() {
 arguments.length <= 0 || arguments[0] === undefined ? 'hey' : arguments[0];  ...
}
```

This prevents Chrome from optimizing the method and shows up in the CPU profile as non optimized method with the mark "Not optimized: Optimized too many times".

## Pre-allocate arrays

When looping over a data set to create a new resulting array the result array should pre-allocate the size and slot in the result.

```
function mapByTwo(data) {
  let ret = new Array(data.length);

  for (let i = 0; i < data.length; i++) {
    ret[i] = data[i] * 2;
  }

  return ret;
}
```

By doing so we avoid allocating memory by using `push`, `pop`, slotting, etc. V8 specifically will pre-allocate the required memory for the array and maintain/set the arrays hidden class to a compact SMI (Small integer, 31 bits unassigned) array. For arrays over 64K elements, items should be added one at a time.
