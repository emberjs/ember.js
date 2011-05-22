SproutCore Metal extends JavaScript objects to support property observing, events, and a number of other key abstractions.  It is a slightly more powerful substitute for underscore and other utility libraries.

In general Metal attempts to make minimial modifications to your objects. It 
also does not implement or require any kind of class based system.

# Object Creation

`SC.create(obj)`

Creates a new object.  Configured 

`SC.createPrototype()`

# Properties

Create a new object that will be used as a prototype.  Unlike create() this 
will leave property observing disabled on the object.

`SC.get()`, `SC.set()`

These two methods will get and set property values on objects respectively,
respecting property observers, computed properties, and other enhancements.

You only need to use these two methods if you are writing code that will run
on IE7 or IE8 without Chrome Frame.  All other browsers support getters and setters, which Metal uses automatically.

`SC.getPath()`, `SC.setPath()`

These two methods will walk a property path you pass in and get or set the
property at the end of it, respectively.  These methods are useful when you
might have a hierarchy of objects, some of which may not exist.  Unlike 
regular property accessors, these methods won't blow up if an object in the
path does not exist.

`SC.propertyWillChanges()`, `SC.propertyDidChange()`

You can call these methods to notify the observer system that a given property
is about to change or has just changed.  Normally you won't need to call 
these methods but sometimes it is needed if you have some indirect relation
that you can't model with property bindings.

## Defining Properties

`SC.mixin(obj, props...)`

Augments the passed object with the passed set of properties.  This method 
will mixins, computed properties, and other special options.

## Computed Properties

Computed properties are a more powerful version of getters and setters.  When you access the property for the first time, your computing function will be 
invoked.  However computed properties also understand concepts like dependent keys, which allows them to cache and automatically invalidate.

You typically use SC.mixin() to define a computed property:

    var contact = { firstName: 'John', lastName: 'Doe' };
    SC.mixin(contact, { 
      fullName: SC.computed(function() {
        return this.firstName + ' ' + this.lastName;
      }).property('firstName', 'lastName').cacheable()
    });

# Mixins

Metal supports proper mixins.  A mixin won't be applied to an object more 
than once.  It can also depend on other mixins.  This allows you to have 
mixins that won't be duplicated.

`SC.Mixin.create(...)`

Creates a new mixin.  Pass property hashes or other mixins that this mixin
depends on.

`mixin.reopen(...)`

Adds additional properties or other Mixin dependencies to the named mixin.

`mixin.without(...)`

Returns a new mixin that will exclude the passed properties from the mixin.

## Required Properties

You can name required properties in a mixin that must be defined by the 
object you apply the mixin to or other mixins you apply.  

    MyMixin = SC.Mixin.create({
      mustBeDefined: SC.required()
    });
    
Attempting to apply this mixin to an object without defining `mustBeDefined`
will raise an exception.

## Aliases

You can define properties that should simply be aliases of another property.

    MyMixin = SC.Mixin.create({
      foo: 'FOO',
      bar: SC.alias('foo')
    });
  
    obj = {}
    SC.mixin(obj, MyMixin);
    obj.bar // 'FOO'



# Events

Now you can add listeners and send events on any object, even if that object
does not have built in support for it.

`SC.addListener(obj, eventName, target, method)`

Adds a listener to the named object/eventName pair.  Will invoke the passed
target/method.

`SC.removeListener(obj, eventName, target, method)`

Removes a listener on the named object/eventName pair.

`SC.sendEvent(obj, eventName, args...)`

Sends an event on the passed object, invoking any listeners.

# Observers

Property observers are a special type of listeners that are invoked whenever
a value on an object changes.

`SC.addObserver(obj, propertyName, target, method)`

Adds a new observer.  Will be invoked just after the property changes.

`SC.addBeforeObserver(obj, propertyName, target, method)`

Adds a new observer to invoke before the property changes.

`SC.removeObserver(obj, propertyName, target, method)`

Removes an observer.

`SC.removeBeforeObserver(obj, propertyName, target, method)`

See above.

`SC.propertyWillChange(obj, propertyName)`

Notifies the observing system that a given property is about to change. 
Normally you won't need to invoke this method yourself.

`SC.propertyDidChange(obj, propertyName)`

Notifies the observing system that a given property has just changed.

`SC.beginPropertyChanges(obj)`

Suspends property observer notifications until you call a matching 
`SC.endPropertyChanges()`.  This allows you to avoid having multiple change
notifications sent more than once.

`SC.endPropertyChanges(obj)`

Resumes property observer notifications.


# Core Utilities

`SC.guidFor`

Returns a unique ID for any object you pass in.  This ID is gauranteed to remain unique to the object throughout its lifetime.

`sc_assert()`

This global function can be removed automatically by a build tool, allowing you to define assertions that are removed in production builds.

