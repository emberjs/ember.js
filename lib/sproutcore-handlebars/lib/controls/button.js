SC.Button = SC.View.extend({
  classNames: ['sc-button'],
  classNameBindings: ['isActive'],

  targetObject: function() {
    var target = this.get('target');

    if (SC.typeOf(target) === "string") {
      return SC.getPath(target);
    } else {
      return target;
    }
  }.property('target').cacheable(),

  mouseDown: function() {
    this.set('isActive', true);
    this._mouseDown = true;
    this._mouseEntered = true;
  },

  mouseLeave: function() {
    if (this._mouseDown) {
      this.set('isActive', false);
      this._mouseEntered = false;
    }
  },

  mouseEnter: function() {
    if (this._mouseDown) {
      this.set('isActive', true);
      this._mouseEntered = true;
    }
  },

  mouseUp: function(event) {
    if (this.get('isActive')) {
      var action = this.get('action'),
          target = this.get('targetObject');

      if (target && action) {
        if (typeof action === 'string') {
          action = target[action];
        }
        action.call(target, this);
      }

      this.set('isActive', false);
    }

    this._mouseDown = false;
    this._mouseEntered = false;
  },

  touchStart: function(touch) {
    this.mouseDown(touch);
  },

  touchEnd: function(touch) {
    this.mouseUp(touch);
  }
});
