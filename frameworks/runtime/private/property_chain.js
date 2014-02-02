sc_require('system/object');

/**
  @class
  @private

  SC._PropertyChain is used as the bookkeeping system for notifying the KVO
  system of changes to computed properties that contains paths as dependent
  keys.

  Each instance of SC._PropertyChain serves as a node in a linked list. One node
  is created for each property in the path, and stores a reference to the name
  of the property and the object to which it belongs. If that property changes,
  the SC._PropertyChain instance notifies its associated computed property to
  invalidate, then rebuilds the chain with the new value.

  To create a new chain, call SC._PropertyChain.createChain() with the target,
  path, and property to invalidate if any of the objects in the path change.

  For example, if you called createChain() with 'foo.bar.baz', it would
  create a linked list like this:

   ---------------------     ---------------------     ---------------------
  | property:     'foo' |   | property:     'bar' |   | property:     'baz' |
  | nextProperty: 'bar' |   | nextProperty: 'baz' |   | nextProperty: undef |
  | next:           ------->| next:           ------->| next:     undefined |
   ---------------------     ---------------------     ---------------------

  @extends SC.Object
  @since SproutCore 1.5
*/

SC._PropertyChain = SC.Object.extend(
/** @scope SC.Object.prototype */ {
  /**
    The object represented by this node in the chain.

    @type Object
  */
  object: null,

  /**
    The key on the previous object in the chain that contains the object
    represented by this node in the chain.

    @type String
  */
  property: null,

  /**
    The target object. This is the object passed to createChain(), and the
    object which contains the +toInvalidate+ property that will be invalidated
    if +property+ changes.

    @type Object
  */
  target: null,

  /**
    The property of +target+ to invalidate when +property+ changes.

    @type String
  */
  toInvalidate: null,

  /**
    The property key on +object+ that contains the object represented by the
    next node in the chain.

    @type String
  */
  nextProperty: null,

  /**
    Registers this segment of the chain with the object it represents.

    This should be called with the object represented by the previous node in
    the chain as the first parameter. If no previous object is provided, it will
    assume it is the root node in the chain and treat the target as the previous
    object.

    @param {Object} [newObject] The object in the chain to hook to.
  */
  activate: function(newObject) {
    var curObject = this.get('object'),
        property  = this.get('property'),
        nextObject;

    // If no parameter is passed, assume we are the root in the chain
    // and look up property relative to the target, since dependent key
    // paths are always relative.
    if (!newObject) { newObject = this.get('target'); }

    if (curObject && curObject!==newObject) {
      this.deactivate();
    }
    this.set('object', newObject);

    // In the special case of @each, we treat the enumerable as the next
    // property so just skip registering it
    if (newObject && property!=='@each') {
      newObject.registerDependentKeyWithChain(property, this);
    }

    // now - lookup the object for the next one...
    if (this.next) {
      nextObject = newObject ? newObject.get(property) : undefined;
      this.next.activate(nextObject);
    }

    return this;
  },

  /**
    Removes this segment of the chain from the object it represents. This is
    usually called when the object represented by the previous segment in the
    chain changes.
  */
  deactivate: function() {
    var object   = this.get('object'),
        property = this.get('property');

    // If the chain element is not associated with an object,
    // we don't need to deactivate anything.
    if (object) object.removeDependentKeyWithChain(property, this);
    if (this.next) this.next.deactivate();
    return this;
  },

  /**
    Invalidates the +toInvalidate+ property of the +target+ object.
  */
  notifyPropertyDidChange: function() {
    var target       = this.get('target'),
        toInvalidate = this.get('toInvalidate'),
        curObj, newObj;

    // Tell the target of the chain to invalidate the property
    // that depends on this element of the chain
    target.propertyDidChange(toInvalidate);

    // If there are more dependent keys in the chain, we need
    // to invalidate them and set them up again.
    if (this.next) {
      // Get the new value of the object associated with this node to pass to
      // activate().
      curObj = this.get('object');
      newObj = curObj.get(this.get('property'));

      this.next.activate(newObj); // reactivate down the line
    }
  }

  // @if (debug)
  ,
  /**
    Returns a string representation of the chain segment.

    @returns {String}
  */
  toString: function() {
    return "SC._PropertyChain(target: %@, property: %@)".fmt(
      this.get('target'), this.get('property'));
  }
  // @endif
});

SC._PropertyChain.createChain = function(path, target, toInvalidate) {
  var parts = path.split('.');
  var len = parts.length,
      i   = 1;

  var root = SC._PropertyChain.create({
    property:     parts[0],
    target:       target,
    toInvalidate: toInvalidate,
    nextProperty: parts[1]
  });


  root.set('length', len);
  var tail = root;

  while(--len >= 1) {
    tail = tail.next = SC._PropertyChain.create({
      property:     parts[i],
      target:       target,
      toInvalidate: toInvalidate,
      nextProperty: parts[++i]
    });

    tail.set('length', len);
  }

  return root;
};
