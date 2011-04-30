// ==========================================================================
// Project:   SproutCore Costello - Property Observing Library
// Copyright: ©2006-2011 Strobe Inc. and contributors.
//            Portions ©2008-2011 Apple Inc. All rights reserved.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

// ........................................................................
// CHAIN OBSERVER
//

// This is a private class used by the observable mixin to support chained
// properties.

// ChainObservers are used to automatically monitor a property several
// layers deep.
// org.plan.name = SC._ChainObserver.create({
//    target: this, property: 'org',
//    next: SC._ChainObserver.create({
//      property: 'plan',
//      next: SC._ChainObserver.create({
//        property: 'name', func: myFunc
//      })
//    })
//  })
//
SC._ChainObserver = function(property, root) {
  this.property = property ;
  this.root = root || this ;
} ;

// This is the primary entry point.  Configures the chain.
SC._ChainObserver.createChain = function(rootObject, path, target, method, context) {

  // First we create the chain.
  var parts = path.split('.'),
      root  = new SC._ChainObserver(parts[0]),
      tail  = root;

  for(var i=1, l=parts.length; i<l; i++) {
    tail = tail.next = new SC._ChainObserver(parts[i], root) ;
  }

  var tails = root.tails = [tail];

  // Now root has the first observer and tail has the last one.
  // Feed the rootObject into the front to setup the chain...
  // do this BEFORE we set the target/method so they will not be triggered.
  root.objectDidChange(rootObject);

  tails.forEach(function(tail) {
    // Finally, set the target/method on the tail so that future changes will
    // trigger.
    tail.target = target; tail.method = method ; tail.context = context ;
  });

  // no need to hold onto references to the tails; if the underlying
  // objects go away, let them get garbage collected
  root.tails = null;

  // and return the root to save
  return root ;
};

SC._ChainObserver.prototype = {
  isChainObserver: true,

  // the object this instance is observing
  object: null,

  // the property on the object this link is observing.
  property: null,

  // if not null, this is the next link in the chain.  Whenever the
  // current property changes, the next observer will be notified.
  next: null,

  root: null,

  // if not null, this is the final target observer.
  target: null,

  // if not null, this is the final target method
  method: null,

  // an accessor method that traverses the list and finds the tail
  tail: function() {
    if(this._tail) { return this._tail; }

    var tail = this;

    while(tail.next) {
      tail = tail.next;
    }

    this._tail = tail;
    return tail;
  },

  // invoked when the source object changes.  removes observer on old
  // object, sets up new observer, if needed.
  objectDidChange: function(newObject) {
    if (newObject === this.object) return; // nothing to do.

    // if an old object, remove observer on it.
    if (this.object) {
      if (this.property === '@each' && this.object._removeContentObserver) {
        this.object._removeContentObserver(this);
      } else if (this.object.removeObserver) {
        this.object.removeObserver(this.property, this, this.propertyDidChange);
      }
    }

    // if a new object, add observer on it...
    this.object = newObject ;

    // when [].propName is used, we will want to set up observers on each item
    // added to the Enumerable, and remove them when the item is removed from
    // the Enumerable.
    //
    // In this case, we invoke addEnumerableObserver, which handles setting up
    // and tearing down observers as items are added and removed from the
    // Enumerable.
    if (this.property === '@each' && this.next) {
      if (this.object && this.object._addContentObserver) {
        this.object._addContentObserver(this);
      }
    } else {
      if (this.object && this.object.addObserver) {
        this.object.addObserver(this.property, this, this.propertyDidChange);
      }

      // now, notify myself that my property value has probably changed.
      this.propertyDidChange() ;
    }
  },

  // the observer method invoked when the observed property changes.
  propertyDidChange: function() {
    // get the new value
    var object = this.object ;
    var property = this.property ;
    var value = (object && object.get) ? object.get(property) : null ;

    // if we have a next object in the chain, notify it that its object
    // did change...
    if (this.next) { this.next.objectDidChange(value) ; }

    // if we have a target/method, call it.
    var target  = this.target,
        method  = this.method,
        context = this.context ;

    if (target && method) {
      var rev = object ? object.propertyRevision : null ;
      if (context) {
        method.call(target, object, property, value, context, rev);
      } else {
        method.call(target, object, property, value, rev) ;
      }
    }
  },

  // teardown the chain...
  destroyChain: function() {

    // remove observer
    var obj = this.object ;
    if (obj && obj.removeObserver) {
      obj.removeObserver(this.property, this, this.propertyDidChange) ;
    }

    // destroy next item in chain
    if (this.next) this.next.destroyChain() ;

    // and clear left overs...
    this.next = this.target = this.method = this.object = this.context = null;
    return null ;
  }

} ;
