require('ember-runtime/mixins/target_action_support');

/**
@module ember
@submodule ember-handlebars
*/

var get = Ember.get, set = Ember.set;

/**
  @class Button
  @namespace Ember
  @extends Ember.View
  @uses Ember.TargetActionSupport
  @deprecated
*/
Ember.Button = Ember.View.extend(Ember.TargetActionSupport, {
  classNames: ['ember-button'],
  classNameBindings: ['isActive'],

  tagName: 'button',

  propagateEvents: false,

  attributeBindings: ['type', 'disabled', 'href', 'tabindex'],

  /**
    @private

    Overrides `TargetActionSupport`'s `targetObject` computed
    property to use Handlebars-specific path resolution.

    @property targetObject
  */
  targetObject: Ember.computed(function() {
    var target = get(this, 'target'),
        root = get(this, 'context'),
        data = get(this, 'templateData');

    if (typeof target !== 'string') { return target; }

    return Ember.Handlebars.get(root, target, { data: data });
  }).property('target'),

  // Defaults to 'button' if tagName is 'input' or 'button'
  type: Ember.computed(function(key) {
    var tagName = this.tagName;
    if (tagName === 'input' || tagName === 'button') { return 'button'; }
  }),

  disabled: false,

  // Allow 'a' tags to act like buttons
  href: Ember.computed(function() {
    return this.tagName === 'a' ? '#' : null;
  }),

  mouseDown: function() {
    if (!get(this, 'disabled')) {
      set(this, 'isActive', true);
      this._mouseDown = true;
      this._mouseEntered = true;
    }
    return get(this, 'propagateEvents');
  },

  mouseLeave: function() {
    if (this._mouseDown) {
      set(this, 'isActive', false);
      this._mouseEntered = false;
    }
  },

  mouseEnter: function() {
    if (this._mouseDown) {
      set(this, 'isActive', true);
      this._mouseEntered = true;
    }
  },

  mouseUp: function(event) {
    if (get(this, 'isActive')) {
      // Actually invoke the button's target and action.
      // This method comes from the Ember.TargetActionSupport mixin.
      this.triggerAction();
      set(this, 'isActive', false);
    }

    this._mouseDown = false;
    this._mouseEntered = false;
    return get(this, 'propagateEvents');
  },

  keyDown: function(event) {
    // Handle space or enter
    if (event.keyCode === 13 || event.keyCode === 32) {
      this.mouseDown();
    }
  },

  keyUp: function(event) {
    // Handle space or enter
    if (event.keyCode === 13 || event.keyCode === 32) {
      this.mouseUp();
    }
  },

  // TODO: Handle proper touch behavior. Including should make inactive when
  // finger moves more than 20x outside of the edge of the button (vs mouse
  // which goes inactive as soon as mouse goes out of edges.)

  touchStart: function(touch) {
    return this.mouseDown(touch);
  },

  touchEnd: function(touch) {
    return this.mouseUp(touch);
  },

  init: function() {
    Ember.deprecate("Ember.Button is deprecated and will be removed from future releases. Consider using the `{{action}}` helper.");
    this._super();
  }
});
