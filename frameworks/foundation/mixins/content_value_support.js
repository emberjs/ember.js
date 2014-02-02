// ==========================================================================
// Project:   SproutCore - JavaScript Application Framework
// Copyright: ©2006-2010 Sprout Systems, Inc. and contributors.
//            Portions ©2008-2011 Apple Inc. All rights reserved.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

/**
  @namespace

  This mixin allows a view to get its value from a content object based
  on the value of its contentValueKey.

      myView = SC.View.create({
        content: {prop: "abc123"},

        contentValueKey: 'prop'
      });

      // myView.get('value') will be "abc123"

  This is useful if you have a nested record structure and want to have
  it be reflected in a nested view structure. If your data structures
  only have primitive values, consider using SC.Control instead.
*/
SC.ContentValueSupport = {
  /**
    Walk like a duck.

    @type Boolean
    @default YES
  */
  hasContentValueSupport: YES,

  /** @private */
  initMixin: function () {
    // setup content observing if needed.
    this._control_contentKeysDidChange();
  },

  /** @private */
  destroyMixin: function () {
    // Remove old observers on self.
    this._cleanup_old_observers();

    // Remove old observers on content.
    this._cleanup_old_content_observers();
  },

  /**
    The value represented by this control.

    Most controls represent a value of some type, such as a number, string
    or image URL.  This property should hold that value.  It is bindable
    and observable.  Changing this value will immediately change the
    appearance of the control.  Likewise, editing the control
    will immediately change this value.

    If instead of setting a single value on a control, you would like to
    set a content object and have the control display a single property
    of that control, then you should use the content property instead.

    @type Object
    @default null
  */
  value: null,

  /**
    The content object represented by this control.

    Often you need to use a control to display some single aspect of an
    object, especially if you are using the control as an item view in a
    collection view.

    In those cases, you can set the content and contentValueKey for the
    control.  This will cause the control to observe the content object for
    changes to the value property and then set the value of that property
    on the "value" property of this object.

    Note that unless you are using this control as part of a form or
    collection view, then it would be better to instead bind the value of
    the control directly to a controller property.

    @type SC.Object
    @default null
  */
  content: null,

  /**
    Keys that should be observed on the content object and mapped to values on
    this object. Should be a hash of local keys that point to keys on the content to
    map to local values. For example, the default is {'contentValueKey': 'value'}.
    This means that the value of this.contentValueKey will be observed as a key on
    the content object and its value will be mapped to this.value.

    @type Hash
    @default null
  */
  contentKeys: null,

  _default_contentKeys: {
    contentValueKey: 'value'
  },

  /**
    The property on the content object that would want to represent the
    value of this control.  This property should only be set before the
    content object is first set.  If you have a displayDelegate, then
    you can also use the contentValueKey of the displayDelegate.

    @type String
    @default null
  */
  contentValueKey: null,

  /**
    Invoked whenever any property on the content object changes.

    The default implementation will update the value property of the view
    if the contentValueKey property has changed.  You can override this
    method to implement whatever additional changes you would like.

    The key will typically contain the name of the property that changed or
    '*' if the content object itself has changed.  You should generally do
    a total reset if '*' is changed.

    @param {Object} target the content object
    @param {String} key the property that changes
    @returns {void}
    @test in content
  */
  contentPropertyDidChange: function (target, key) {
    var contentKeys = this.get('contentKeys');

    if (contentKeys) {
      var contentKey;

      for (contentKey in contentKeys) {
        // if we found the specific contentKey, then just update that and we're done
        if (key === this.getDelegateProperty(contentKey, this, this.get('displayDelegate'), contentKeys)) {
          return this.updatePropertyFromContent(contentKeys[contentKey], key, contentKey, target);
        }

        // else if '*' is changed, then update for every contentKey
        else if (key === '*') {
          this.updatePropertyFromContent(contentKeys[contentKey], key, contentKey, target);
        }
      }
    }

    else {
      return this.updatePropertyFromContent('value', key, 'contentValueKey', target);
    }
  },

  /**
    Helper method you can use from your own implementation of
    contentPropertyDidChange().  This method will look up the content key to
    extract a property and then update the property if needed.  If you do
    not pass the content key or the content object, they will be computed
    for you.  It is more efficient, however, for you to compute these values
    yourself if you expect this method to be called frequently.

    @param {String} prop local property to update
    @param {String} key the contentproperty that changed
    @param {String} contentKey the local property that contains the key
    @param {Object} content
    @returns {SC.Control} receiver
  */
  updatePropertyFromContent: function (prop, key, contentKey, content) {
    var del, v;

    if (contentKey === undefined) contentKey = "content" + prop.capitalize() + "Key";

    // prefer our own definition of contentKey
    if (this[contentKey]) contentKey = this.get(contentKey);
    // if we don't have one defined check the delegate
    else if ((del = this.get('displayDelegate')) && (v = del[contentKey])) contentKey = del.get ? del.get(contentKey) : v;
    // if we have no key we can't do anything so just short circuit out
    else return this;

    // only bother setting value if the observer triggered for the correct key
    if (key === '*' || key === contentKey) {
      if (content === undefined) content = this.get('content');

      if (content) v = content.get ? content.get(contentKey) : content[contentKey];
      else v = null;

      this.setIfChanged(prop, v);
    }

    return this;
  },

  /**
    Relays changes to the value back to the content object if you are using
    a content object.

    This observer is triggered whenever the value changes.  It will only do
    something if it finds you are using the content property and
    contentValueKey and the new value does not match the old value of the
    content object.

    If you are using contentValueKey in some other way than typically
    implemented by this mixin, then you may want to override this method as
    well.

    @returns {void}
  */
  updateContentWithValueObserver: function (target, key) {
    var reverseContentKeys = this._reverseContentKeys;

    // if everything changed, iterate through and update them all
    if (!key || key === '*') {
      for (key in reverseContentKeys) {
        this.updateContentWithValueObserver(this, key);
      }
    }

    // get value -- set on content if changed
    var value = this.get(key);

    var content = this.get('content'),
    // get the key we should be setting on content, asking displayDelegate if
    // necessary
    contentKey = this.getDelegateProperty(reverseContentKeys[key], this, this.displayDelegate);

    // do nothing if disabled
    if (!contentKey || !content) return this;

    if (typeof content.setIfChanged === SC.T_FUNCTION) {
      content.setIfChanged(contentKey, value);
    }

    // avoid re-writing inherited props
    else if (content[contentKey] !== value) {
      content[contentKey] = value;
    }
  },

  /** @private
    This should be null so that if content is also null, the
    _contentDidChange won't do anything on init.
  */
  _control_content: null,
  _old_contentValueKeys: null,
  _old_contentKeys: null,

  /** @private
    Observes when a content object has changed and handles notifying
    changes to the value of the content object.

    Optimized for the default case of only observing contentValueKey. If you use
    a custom value for contentKeys it will switch to using a CoreSet to track
    observed keys.
  */
  _control_contentDidChange: function (target, key) {
    // remove an observer from the old content if necessary
    this._cleanup_old_content_observers();

    var content = this.get('content'),
    contentKeys = this.get('contentKeys'), contentKey,
    oldKeys = this._old_contentValueKeys,
    f = this.contentPropertyDidChange;

    // add observer to new content if necessary.
    if (content && content.addObserver) {
      // set case
      if (contentKeys) {
        // lazily create the key set
        if (!oldKeys) oldKeys = SC.CoreSet.create();

        // add observers to each key
        for (contentKey in contentKeys) {
          contentKey = this.getDelegateProperty(contentKey, this, this.get('displayDelegate'));

          if (contentKey) {
            content.addObserver(contentKey, this, f);

            oldKeys.add(contentKey);
          }
        }
      }

      // default case hardcoded for contentValueKey
      else {
        contentKey = this.getDelegateProperty('contentValueKey', this, this.get('displayDelegate'));

        if (contentKey) {
          content.addObserver(contentKey, this, f);

          // if we had a set before, continue using it
          if (oldKeys) oldKeys.add(contentKey);
          // otherwise just use a string
          else oldKeys = contentKey;
        }
      }
    }

    // notify that values did change.
    key = (!key || key === 'content') ? '*' : this.get(key);
    if (key) this.contentPropertyDidChange(content, key);

    // Cache values for clean up.
    this._control_content = content;
    this._old_contentValueKeys = oldKeys;
  }.observes('content'),

  /** @private
    Observes changes to contentKeys and sets up observers on the local keys to
    update the observers on the content object.
  */
  _control_contentKeysDidChange: function () {
    var key, reverse = {},
    // if no hash is present, use the default contentValueKey -> value
    contentKeys = this.get('contentKeys') || this._default_contentKeys,
    contentKey,
    f = this._control_contentDidChange,
    reverseF = this.updateContentWithValueObserver;

    // Remove old observers.
    this._cleanup_old_observers();

    // add new observers
    for (key in contentKeys) {
      contentKey = contentKeys[key];

      // build reverse mapping to update content with value
      reverse[contentKey] = key;

      // add value observer
      this.addObserver(contentKey, this, reverseF);

      // add content key observer
      this.addObserver(key, this, f);
    }

    // store reverse map for later use
    this._reverseContentKeys = reverse;

    this._old_contentKeys = contentKeys;

    // call the other observer now to update all the observers
    this._control_contentDidChange();
  }.observes('contentKeys'),

  /** @private */
  _cleanup_old_content_observers: function () {
    var old = this._control_content,
      oldKeys = this._old_contentValueKeys,
      oldType = SC.typeOf(oldKeys),
      f = this.contentPropertyDidChange,
      contentKey;

    if (old && old.removeObserver && oldKeys) {
      // default case
      if (oldType === SC.T_STRING) {
        old.removeObserver(oldKeys, this, f);

        this._old_contentValueKeys = oldKeys = null;
      }

      // set case
      else {
        var i, len = oldKeys.get('length');

        for (i = 0; i < len; i++) {
          contentKey = oldKeys[i];

          old.removeObserver(contentKey, this, f);
        }

        oldKeys.clear();
      }
    }
  },

  /** @private */
  _cleanup_old_observers: function () {
    var oldContentKeys = this._old_contentKeys,
      f = this._control_contentDidChange,
      reverseF = this.updateContentWithValueObserver,
      contentKey, key;

    // remove old observers
    for (key in oldContentKeys) {
      contentKey = oldContentKeys[key];

      this.removeObserver(contentKey, this, reverseF);
      this.removeObserver(key, this, f);
    }
  }
};

