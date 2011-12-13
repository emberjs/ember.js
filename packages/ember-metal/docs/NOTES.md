# Ember Metal

Metal adds Key-Value Observing and Computed Properties to JavaScript.  These are some preliminary notes on the API.  Note that this still needs a lot of cleanup.

## Methods That Matter

The core of Metal are a few methods that you use to create objects and add 
properties to them.  These methods are very similar to the standard ES5 
methods (so you can use this as a polyfill library if you like) but they also
understand how to support computed properties, observers, and other magic.

### `Ember.create(obj, props)`

Creates a new object with the passed object as its prototype.  Similar to 
Object.create() except that it is available on all browsers and also activates
computed properties and observers as needed.

### `Ember.createPrototype(obj, props)`

Just like `Ember.create()` except that properties and observers are not activated
(they are still inherited).  Use this method when creating objects to be used
as part of a prototype inheritence chain.

### `Ember.mixin(obj, props...)`

This is the primary way you should add new properties to an existing object.
The first parameter is always the object you want to apply properties to.  The
remaining parameters are property hashes you want copied on or Mixins.

In addition to copying basic properties, this also embues the object with some special magic including:

  * Observers and computed properties defined in the property hash will be 
    setup on the object, including dependencies.
  * If you pass a `Mixin` instance, this method will only apply the mixin 
    once.  This applies even if you applied the Mixin instance to the object 
    previously.  It will also apply any dependent mixins.
  * When overriding an existing method, functions will be wrapped such that
    when they are invoked `this._super()` will point to the previous method
    so you can easily invoke it.

### `Ember.defineProperty(obj, key, desc, value)`

This method works just like the ES5 standard `Object.defineProperty()` except
that it can also take descriptors like a ComputedProperty and define them 
here.  Most of the time you won't work with this method directly.  Instead you
should use `Ember.mixin()` to add new properties to an object.




## Accessing Properties

Once you create an object and add some properties to it, you usually can
access those properties directly using normal dot notation.  Occasionally,
however, dot notation won't do the trick.  In those cases Metal defines some
_universal accessors_ that can get at properties for you without having to
write extra code.

You should consider using universal accessors when one of the following is true:

  * __You want to work with paths instead of keys.__  Walking down a path 
    (like 'foo.bar') is a fairly common task in many meta-programming models.
    In these cases, the `Ember.getPath()` and `Ember.setPath()` accessors can walk
    the path for you.  They will also handle cases like null objects in the 
    path more elegantly.
    
  * __You need to support unknownProperty.__ Some metaprogramming techniques
    rely on being able to access a property on an object that isn't actually 
    created until the first time you try to access it.  This is usually done 
    by implementing an _unknown property handler_ that will be invoked when 
    you try to access the non-existent property.  Since JavaScript getters and
    setters don't support this directly, you can use `Ember.get()` and `Ember.set()`
    instead.
    
  * __You are writing code for IE7 and 8.__  Versions of IE older than IE9 do
    not support native getters and setters, which are required to trigger 
    observers and computed properties with dot notation.  If you want to
    target these browsers use Chrome Frame or always use universal accessors
    instead.
    
    
### `Ember.get(obj, keyName)`, `Ember.getPath(obj, path)`

These two methods will retrieve a value on the passed object.  `Ember.get()` is
the most simple, looking up just a key on the receiver object.  `Ember.getPath()`
accepts a full property path, which it will walk down until it gets to the 
end (and returns the value) or until it reaches a null object in which case it
will return __undefined__.

`Ember.getPath()` also can take just the path with no object in front.  In that
case it will search from the top level instead of starting at a root object.

Unless you are coding for IE7-8 or you need to walk a path, you normally
will not need to use these methods.  Instead you can just access properties
using the normal dot syntax.  If you do want to work on IE7-8 then you should
_always_ use Ember.get() to retrieve a property since it will enable support for
computed properties and other features.

### `Ember.set(obj, keyName, value)`, `Ember.setPath(obj, path, value)`

These two methods will set a value on the passed object.  `Ember.set()` is the 
most simple, setting the value on a simple key.  `Ember.setPath()` will actually
walk down a property path until it gets to the end and then set the value for
the last key in the chain.  If `Ember.setPath()` encounters a null object while
walking the path it will throw an exception.

Unless you are coding for IE7-8 or you need to walk a path, you normally
will not need to use these methods.  Instead you can just set properties
using the normal dot syntax.  If you do want to work on IE7-8 then you should
_always_ use Ember.set() to modify a property since it will enable support for
computed properties and observers.

### `Ember.propertyWillChange(obj, keyName)`, `Ember.propertyDidChange(obj, keyName)`

Sometimes you know the value of a particular key is about to or has changed
but for whatever reason Metal may not be able to observe it.  In this case you
can manually tell Metal that the property will, then has, changed by calling
these two methods.




## Computed Properties

Computed properties are functions that are accessed just like properties. When
you try to get or set a property, your function will be called instead, giving
you the opportunity to do any number of complex tasks.

Most of the time computed properties are used to massage data and defer 
computation.  Metal has a number of features oriented specifically towards
helping you with the two cases.

Let's say you have a contact record with a firstName and a lastName.  You 
want to display a fullName.  Rather than having to constantly recompute this
it would be nice if your contact record just had a method to do this and keep 
it up to date:

    var contact = { firstName: 'John', lastName: 'Doe' };
    Ember.mixin(contact, {
      fullName: Ember.computed(function() {
        return [this.firstName, this.lastName].join(' ');
      }).property('firstName', 'lastName').cacheable()
    });
    
    contact.fullName  // 'John Doe'
    contact.firstName = 'JANE'
    contact.fullName // 'JANE Doe'
    
In the example above there are a few key things to notice.  

First, you indicate that the function is a computed property by wrapping it in the `Ember.computed()` call.  This actually returns a new special type of object 
called a __computed property descriptor__.  `Ember.mixin()` will recognize this
descriptor when applying properties and setup the computed property.

Second, after the call to `Ember.computed()` this method also uses a helper
function called `property()`. The property helper tells Metal which other key paths on the current object this property depends on.  Anytime those dependent keys change, metal will automatically notify observers of this property as well.

The property helper pairs nicely with the final `cacheable()` helper function
which tells Metal that it can cache the return value of this computed 
property and simply reuse it until one of the dependent keys changes.  Using
this approach you can easily defer computing expensive tasks by exposed a 
cached value that will be reused whenever possible but still be up to date
when its input data changes.

### Computed Property Method Signature

Unlike most accessor systems, computed properties only require you to write
one function to handle both getting and setting.  Metal works this way because
setters are often supersets of getters anyway so this makes your code smaller
and easier to maintain.  

A computed property method typically looks like:

    function(key, value) {
      if (value !== undefined) {
        // set property
      }
      // return value.
    }
    
These functions always take two parameters. When used as a getter, the second
parameter (`value`) will be undefined.  When used as a setter it will have a
value other than undefined (possibly including `null`).

### `Ember.computed(func)`

Takes the passed function and returns a `ComputedProperty` descriptor that 
can be applied to an object using `Ember.mixin()`.

### `ComputedProperty#property(key...)` 

This will set the dependent keys for the property. Any key paths you pass here will be monitored.  Changing any of those keys path values will automatically invalidate this property.

### `ComputedProperty#cacheable(flag)`

Calling this with no parameters or with flag set to true will make the property cacheable.  This means getting the property will only invoke the function one time until a dependent key changes or you manually call `Ember.propertyWillChange()`/`Ember.propertyDidChange()`.
    
    
    
## Property Observers

Sometimes you just want to know when a property value has been changed so you
can take action on it.  Metal gives you the ability to be notified both just
before and after a property value is changed.  This is called _observing_ a
property.

### `Ember.addBeforeObserver(obj, path, target, method)`, `Ember.addObserver(obj, path, target, method)`

These two methods add new property observers that will be invoked just before or after the named path on the object changes.  You can pass either a single key or a property path to these methods.  If you pass a complex path then your observer will be notified if any property in the path changes

The observer method you pass can take up to three optional parameters - the 
first two will always echo back the same object and path that you passed in
(so you can create generic observers).  If you accept a third argument then
the most recent value of the property will be passed as well.

### `Ember.removeBeforeObserver(obj, path, target, method)`, `Ember.removeObserver(obj, path, target, method)`

Removes a previously registered observer so that it will no longer receive
property notifications.

### `Ember.beginPropertyChanges()`

Temporarily suspends delivering observer notifications until you call `Ember.endPropertyChanges()` a matching number of times.  This is useful for
bunching together many updates.

### `Ember.endPropertyChanges()`

Resumes property observing.  See `Ember.beginPropertyChanges()`

## Mixins

__TODO:  Explain mixins__

### `Ember.mixin(obj, props...)`

Applies the passed properties or mixins to the object.

### `Ember.Mixin.create(props...)`

Creates a new mixin instance.  Pass any number of property hashes or other
mixins.  These will become the dependencies used to apply the mixin with 
`Ember.mixin()`.

### `Ember.Mixin#detect(obj)`

Returns true if the passed object has the passed mixin already applied.

### `Ember.Mixin#keys()`

Returns all the property keys defined on the mixin.

### `Ember.Mixin#without(keyName...)`

Returns a new mixin that will include the passed mixin and any dependents but
exclude the passed key names.

### `Ember.included(obj)`

Returns an array of all the mixins currently applied to the passed object.

### `Ember.alias(keyName)`

Returns an object you can set as the value of a property on a mixin to alias 
another method.  For example:

    Ember.mixin(myObject, {
      foo: 'FOO',
      bar: Ember.alias('foo')
    });
    
Will make `bar` equal to `'FOO'`.

### `Ember.observer(func, paths...)`, `Ember.beforeObserver(func, paths...)`

Returns a function that when applied during mixin will be automatically setup
as an observer on the passed paths.

    Ember.mixin(myObject, {
      fooDidChange: Ember.observer(function() {
        //...code
      }, 'foo')
    });
    
This example will cause the fooDidChange() method to be invoked anytime the 
'foo' property is modified.

The `Ember.beforeObserver()` method will do the same thing but will fire before
a property value changes.

## Events

Metal comes with a basic event system that uses the same meta infrastructure
used for property observing and descriptors.  This event system is used to 
implement property observing but it is generic enough it can be used for 
any kind of event that you want.

### `Ember.addListener(obj, eventName, target, method, xform)`

Adds a listener for an event on the passed object.  This method can accept
a target and method pair.  See "Invoking Callbacks" for more information on
what you can pass to methods like this.

The xform parameter is a transform function used by some internal features.
You can omit it.

### `Ember.removeListener(obj, eventName, target, method)`

Removes a listener for an event on the passed object.  You must pass the 
exact same options (including the same target/method pair) as you passed to
`Ember.addListener()` to disable this.

### `Ember.hasListeners(obj, eventName)`

Returns true if the object has listeners on the passed eventName.

### `Ember.sendEvent(obj, eventName, params...)`

Sends the named event on the target object.  Any listeners on the event will
be invoked with essentially the same parameters that you pass here (including
the object and eventName).

Note that if you want to intercept sending of events you can do so by 
implementing the `sendEvent()` method on the target object.  If Metal finds
this method implemented it will invoke it first and then deliver to any 
listeners unless you return `true` (indicating that you handled the event).

### `Ember.listenersFor(obj, eventName)`

Returns an array of any listeners registered for the given event.  Each item
in the array with itself be another array with the target and method to be 
invoked, respectively.  These target/method pairs will not be normalized yet
so you will need to resolve any method names, etc.

This method is mostly intended for debugging purposes.

### `Ember.watchedEvents(obj)`

Returns an array of all the events that currently have listeners on them for
the given object.  This is most often used for debugging.



## Bindings

__TODO: Are bindings part of runtime or metal?__




## Legacy Support

Metal augments the JavaScript environment to automatically notice when key 
properties on your objects change in order to deliver events, observer 
notifications and other actions.  In order to do this it relies on a newer 
feature in JavaScript environments called __getters and setters__.

All browsers in common usage support getters and setters except for IE7 and 8.
In particular, all mobile browsers support them, which is why we think now is 
the time to start to use them.

If you need to support IE7 and 8 however, you cannot rely on the getter and 
setter feature in order for your app to work.  In this case, you will need to
use the manual `Ember.get()` and `Ember.set()` method anytime you want to retrieve
or modify a property on an object.  If you use this throughout your code then
you can take advantage of all the same features found in metal.




## Callbacks

All methods in Metal that take a callback accept two parameters: a "target" and "method".  Anytime you see this parameter set, you can actually pass your
callbacks in several different ways:

### Function Only

Keeping with how most asynchronous libraries function, you can always pass a function to metal methods and ignore the second parameter.  When used this way the function will be invoked on callback with `this` set to the global object.

    function fooDidChange() {
      //...
    }
    
    // invokes fooDidChange() whenever 'foo' changes.
    // "this" will point to the global object
    Ember.addObserver(myObject, 'foo', fooDidChange);
    
    // stop invoking fooDidChange()
    Ember.removeObserver(myObject, 'foo', fooDidChange);
    
### Target and Method

Many times the callback you want to invoke is actually a method on a specific object.  For many libraries this means you have to create a temporary, anonymous function that will invoke the method with the proper context.  This not only leads to extra code, but it also means you need to keep track of those temporary functions to later remove them.

In Metal for these cases, you can instead pass the target object and method as two parameters - target and method.  Metal will keep track of both, making it 
easy for you to later deregister them:

    var myController = {
      fooDidChange: function() {
        //...
      }
    };
    
    // invokes myController.fooDidChange() whenever 'foo' changes
    // "this" will be myController
    Ember.addObserver(myObject, 'foo', myController, myController.fooDidChange);

    // stops invoking myController.fooDidChange()
    Ember.removeObserver(myObject,'foo',myController, myController.fooDidChange);
    
### Target and Method Name

Similar to the last option, you can also pass a target object and a method 
_name_ instead of the function itself.  In this case Metal will lookup the
actual method to invoke at the time of the callback.  This means that you can
actually swap out the method function in the interim if you want.

    var myController = {
      fooDidChange: function() {
        //...
      }
    };

    // invokes myController.fooDidChange() whenever 'foo' changes
    // "this" will be myController
    Ember.addObserver(myObject, 'foo', myController, 'fooDidChange');

    // stops invoking myController.fooDidChange()
    Ember.removeObserver(myObject,'foo',myController, 'fooDidChange');




## Property Paths

Most functions in Metal that work with properties accept __property paths__,
not just key names.  A property path allows you to navigate objects multiple
levels deep.  For example, a computed property like this:

    Ember.mixin(contact, {
      streetAddress: Ember.computed(function() {
          // computed streetAddress..
      }).property('address.houseNumber', 'address.streetName')
    });
    
Will depend on the properties at `contact.address.houseNumber` and `contact.address.streetName`.  If any property in these paths changes ('address' or 'houseNumber'/'streetName'), the property will be recomputed.

All property paths you use in your application will be processed
the same way according to the following rules:

  1. __All property paths are relative to some other object unless they begin with a capital letter or $__.  In the example above, 'address.houseNumber' is relative to the `contact` object that you registered the observer on.  If you instead passed `Address.houseNumber` it would have been treated like an absolute path starting from the top level.
  2. __You can force a path to be local by starting it with 'this'__.  For example 'MyApp.contact.address' is global. 'this.MyApp.contact.address' will be relative.  Also 'this.address.streetName' and 'address.streetName' are equivalent.
  3. __By default, any change in a property path will trigger property observers or recomputed computed properties.__  In the example above, modifying 'address' or 'houseNumber' or 'streetName' will recompute the property.
  4. __You can use the "\*" separator to override this behavior.__  In the example above "address.houseNumber" notices a change to `address` or `houseNumber` but "this.address*houseNumber" would only observe the `houseNumber` property.  This feature is sometimes useful for performance optimizations but you should rarely need it.


## Internals: How It Works

  * All data about an object is stored on a special meta property that you can retrieve with the `Ember.meta()` method.  You almost never work with this meta property directly. 
  * On various objects in the meta object you will see a property called `__emberproto__`.  This property is used to detect when a given meta object was inherited from a parent object.  When you create an object via prototype inheritance, all the `__emberproto__` properties will point to the parent object.  When metal notices this it will clone the object before using it.
  * Whenever an observer is added on an object, metal will "watch" that property.  Adding a watch on a property will convert it from a regular property to a getter/setter, which is how metal is able to notice changes and do something about it.  If you are on a platform that doesn't support getters/setters, we can't do this automatically.  That is why you have to use Ember.get() and Ember.set() instead.
  * Whenever a computed property is added on an object, metal will set a getter/setter on the property as well that will invoke the computed property.
  * Metal will "watch" any properties a computed property depends on.  This will convert that property to a getter/setter also.
  * Property paths (i.e. paths with more than one key) are called "chained properties" internally.  Whenever you add a dependent property or observer on a chained property, metal actually observes that path but then it also sets up a series of 'ChainNodes' that watch each property in the path and update their parent whenever it changes.
  








