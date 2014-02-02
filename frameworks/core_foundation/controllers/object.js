// ==========================================================================
// Project:   SproutCore - JavaScript Application Framework
// Copyright: ©2006-2011 Strobe Inc. and contributors.
//            Portions ©2008-2011 Apple Inc. All rights reserved.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

sc_require('controllers/controller') ;

/** @class

  An ObjectController gives you a simple way to manage the editing state of
  an object.  You can use an ObjectController instance as a "proxy" for your
  model objects.

  Any properties you get or set on the object controller, will be passed
  through to its content object.  This allows you to setup bindings to your
  object controller one time for all of your views and then swap out the
  content as needed.

  ## Working with Arrays

  An ObjectController can accept both arrays and single objects as content.
  If the content is an array, the ObjectController will do its best to treat
  the array as a single object.  For example, if you set the content of an
  ObjectController to an array of Contact records and then call:

      contactController.get('name');

  The controller will check the name property of each Contact in the array.
  If the value of the property for each Contact is the same, that value will
  be returned.  If the any values are different, then an array will be
  returned with the values from each Contact in them.

  Most SproutCore views can work with both arrays and single content, which
  means that most of the time, you can simply hook up your views and this will
  work.

  If you would prefer to make sure that your ObjectController is always
  working with a single object and you are using bindings, you can always
  setup your bindings so that they will convert the content to a single object
  like so:

      contentBinding: SC.Binding.single('MyApp.listController.selection') ;

  This will ensure that your content property is always a single object
  instead of an array.

  @extends SC.Controller
  @since SproutCore 1.0
*/
SC.ObjectController = SC.Controller.extend(
/** @scope SC.ObjectController.prototype */ {

  //@if(debug)
  /* BEGIN DEBUG ONLY PROPERTIES AND METHODS */

  /* @private */
  toString: function () {
    var content = this.get('content'),
      ret = sc_super();

    return content ? "%@:\n  ↳ %@".fmt(ret, content) : ret;
  },

  /* END DEBUG ONLY PROPERTIES AND METHODS */
  //@endif

  // ..........................................................
  // PROPERTIES
  //

  /**
    Set to the object you want this controller to manage.  The object should
    usually be a single value; not an array or enumerable.  If you do supply
    an array or enumerable with a single item in it, the ObjectController
    will manage that single item.

    Usually your content object should implement the SC.Observable mixin, but
    this is not required.  All SC.Object-based objects support SC.Observable

    @type Object
  */
  content: null,

  /**
    If YES, then setting the content to an enumerable or an array with more
    than one item will cause the Controller to attempt to treat the array as
    a single object.  Use of get(), for example, will get every property on
    the enumerable and return it.  set() will set the property on every item
    in the enumerable.

    If NO, then setting content to an enumerable with multiple items will be
    treated like setting a null value.  hasContent will be NO.

    @type Boolean
  */
  allowsMultipleContent: NO,

  /**
    Becomes YES whenever this object is managing content.  Usually this means
    the content property contains a single object or an array or enumerable
    with a single item.  Array's or enumerables with multiple items will
    normally make this property NO unless allowsMultipleContent is YES.

    @type Boolean
  */
  hasContent: function() {
    return !SC.none(this.get('observableContent'));
  }.property('observableContent'),

  /**
    Makes a controller editable or not editable.  The SC.Controller class
    itself does not do anything with this property but subclasses will
    respect it when modifying content.

    @type Boolean
  */
  isEditable: YES,

  /**
    Primarily for internal use.  Normally you should not access this property
    directly.

    Returns the actual observable object proxied by this controller.  Usually
    this property will mirror the content property.  In some cases - notably
    when setting content to an enumerable, this may return a different object.

    Note that if you set the content to an enumerable which itself contains
    enumerables and allowsMultipleContent is NO, this will become null.

    @type Object
  */
  observableContent: function() {
    var content = this.get('content'),
        len, allowsMultiple;

    // if enumerable, extract the first item or possibly become null
    if (content && content.isEnumerable) {
      len = content.get('length');
      allowsMultiple = this.get('allowsMultipleContent');

      if (len === 1) content = content.firstObject();
      else if (len===0 || !allowsMultiple) content = null;

      // if we got some new content, it better not be enum also...
      if (content && !allowsMultiple && content.isEnumerable) content=null;
    }

    return content;
  }.property('content', 'allowsMultipleContent').cacheable(),

  // ..........................................................
  // METHODS
  //

  /**
    Override this method to destroy the selected object.

    The default just passes this call onto the content object if it supports
    it, and then sets the content to null.

    Unlike most calls to destroy() this will not actually destroy the
    controller itself; only the the content.  You continue to use the
    controller by setting the content to a new value.

    @returns {SC.ObjectController} receiver
  */
  destroy: function() {
    var content = this.get('observableContent') ;
    if (content && SC.typeOf(content.destroy) === SC.T_FUNCTION) {
      content.destroy();
    }
    this.set('content', null) ;
    return this;
  },

  /**
    Invoked whenever any property on the content object changes.

    The default implementation will simply notify any observers that the
    property has changed.  You can override this method if you need to do
    some custom work when the content property changes.

    If you have set the content property to an enumerable with multiple
    objects and you set allowsMultipleContent to YES, this method will be
    called anytime any property in the set changes.

    If all properties have changed on the content or if the content itself
    has changed, this method will be called with a key of "*".

    @param {Object} target the content object
    @param {String} key the property that changes
    @returns {void}
  */
  contentPropertyDidChange: function(target, key) {
    if (key === '*') this.allPropertiesDidChange();
    else this.notifyPropertyChange(key);
  },

  /**
    Called whenver you try to get/set an unknown property.  The default
    implementation will pass through to the underlying content object but
    you can override this method to do some other kind of processing if
    needed.

    @param {String} key key being retrieved
    @param {Object} value value to set or undefined if reading only
    @returns {Object} property value
  */
  unknownProperty: function(key,value) {

    // avoid circular references
    if (key==='content') {
      if (value !== undefined) this.content = value;
      return this.content;
    }

    // for all other keys, just pass through to the observable object if
    // there is one.  Use getEach() and setEach() on enumerable objects.
    var content = this.get('observableContent'), loc, cur, isSame;
    if (content===null || content===undefined) return undefined; // empty

    // getter...
    if (value === undefined) {
      if (content.isEnumerable) {
        value = content.getEach(key);

        // iterate over array to see if all values are the same. if so, then
        // just return that value
        loc = value.get('length');
        if (loc>0) {
          isSame = YES;
          cur = value.objectAt(0);
          while((--loc > 0) && isSame) {
            if (cur !== value.objectAt(loc)) isSame = NO ;
          }
          if (isSame) value = cur;
        } else value = undefined; // empty array.

      } else value = (content.isObservable) ? content.get(key) : content[key];

    // setter
    } else {
      if (!this.get('isEditable')) {
        throw new Error("%@.%@ is not editable".fmt(this,key));
      }

      if (content.isEnumerable) content.setEach(key, value);
      else if (content.isObservable) content.set(key, value);
      else content[key] = value;
    }

    return value;
  },

  // ...............................
  // INTERNAL SUPPORT
  //

  /** @private - setup observer on init if needed. */
  init: function() {
    sc_super();
    if (this.get('content')) this._scoc_contentDidChange();
    if (this.get('observableContent')) this._scoc_observableContentDidChange();
  },

  _scoc_contentDidChange: function () {
    var last = this._scoc_content,
        cur  = this.get('content');

    if (last !== cur) {
      this._scoc_content = cur;
      var func = this._scoc_enumerableContentDidChange;
      if (last && last.isEnumerable) {
        last.removeObserver('[]', this, func);
      }
      if (cur && cur.isEnumerable) {
        cur.addObserver('[]', this, func);
      }
    }
  }.observes("content"),

  /**  @private

    Called whenever the observable content property changes.  This will setup
    observers on the content if needed.
  */
  _scoc_observableContentDidChange: function() {
    var last = this._scoc_observableContent,
        cur  = this.get('observableContent'),
        func = this.contentPropertyDidChange,
        efunc= this._scoc_enumerableContentDidChange;

    if (last === cur) return this; // nothing to do
    //console.log('observableContentDidChange');

    this._scoc_observableContent = cur; // save old content

    // stop observing last item -- if enumerable stop observing set
    if (last) {
      if (last.isEnumerable) last.removeObserver('[]', this, efunc);
      else if (last.isObservable) last.removeObserver('*', this, func);
    }

    if (cur) {
      if (cur.isEnumerable) cur.addObserver('[]', this, efunc);
      else if (cur.isObservable) cur.addObserver('*', this, func);
    }

    // notify!
    if ((last && last.isEnumerable) || (cur && cur.isEnumerable)) {
      this._scoc_enumerableContentDidChange();
    } else {
      this.contentPropertyDidChange(cur, '*');
    }

  }.observes("observableContent"),

  /** @private
    Called when observed enumerable content has changed.  This will teardown
    and setup observers on the enumerable content items and then calls
    contentPropertyDidChange().  This method may be called even if the new
    'cur' is not enumerable but the last content was enumerable.
  */
  _scoc_enumerableContentDidChange: function() {
    var cur  = this.get('observableContent'),
        set  = this._scoc_observableContentItems,
        func = this.contentPropertyDidChange;

    // stop observing each old item
    if (set) {
      set.forEach(function(item) {
        if (item.isObservable) item.removeObserver('*', this, func);
      }, this);
      set.clear();
    }

    // start observing new items if needed
    if (cur && cur.isEnumerable) {
      if (!set) set = SC.Set.create();
      cur.forEach(function(item) {
        if (set.contains(item)) return ; // nothing to do
        set.add(item);
        if (item.isObservable) item.addObserver('*', this, func);
      }, this);
    } else set = null;

    this._scoc_observableContentItems = set; // save for later cleanup

    // notify
    this.contentPropertyDidChange(cur, '*');
    return this ;
  }

}) ;
