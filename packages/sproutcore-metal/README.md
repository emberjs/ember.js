Delerium is a mixin system for JavaScript that makes it easier to combine and apply mixins.

# The Problem

Extending an object is a common pattern in JavaScript.  Usually you can find
a method that will copy properties onto another object like so:

    javascript:
    \$.extend(myObject, { .. properties .. });
    
This works great for very tiny bits of code, but when you want to start 
importing libraries from multiple sources it can get out of hand pretty 
quickly.  For example, what happens when you try to add some properties from
one object that require properties from another object?  Or what happens 
when properties conflict?

# Enter Mixins

Mixins are a smarter version of the basic extend function that know how to
track dependencies and combine properties.

  SC.Mixin.create({
    
    foo: SC.property('bar').private(),
    
    _foo: SC.property('foo').val('BAZ').public()
  })
  
  
  