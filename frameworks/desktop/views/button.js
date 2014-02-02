// ==========================================================================
// Project:   SproutCore - JavaScript Application Framework
// Copyright: ©2006-2011 Strobe Inc. and contributors.
//            Portions ©2008-2011 Apple Inc. All rights reserved.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

/**
  @static
  @constant
  @type String
*/
SC.TOGGLE_BEHAVIOR = 'toggle';

/**
  @static
  @constant
  @type String
*/
SC.PUSH_BEHAVIOR = 'push';

/**
  @static
  @constant
  @type String
*/
SC.TOGGLE_ON_BEHAVIOR = 'on';

/**
  @static
  @constant
  @type String
*/
SC.TOGGLE_OFF_BEHAVIOR = 'off';

/**
  @static
  @constant
  @type String
*/
SC.HOLD_BEHAVIOR = 'hold';

/** @class

  Implements a push-button-style button.  This class is used to implement
  both standard push buttons and tab-style controls.  See also SC.CheckboxView
  and SC.RadioView which are implemented as field views, but can also be
  treated as buttons.

  By default, a button uses the SC.Control mixin which will apply CSS
  classnames when the state of the button changes:

   - `active` -- when button is active
   - `sel` -- when button is toggled to a selected state

  @extends SC.View
  @extends SC.Control
  @since SproutCore 1.0
*/
SC.ButtonView = SC.View.extend(SC.Control,
/** @scope SC.ButtonView.prototype */ {

  /**
    Tied to the isEnabledInPane state

    @type Boolean
    @default YES
  */
  acceptsFirstResponder: function() {
    if (SC.FOCUS_ALL_CONTROLS) { return this.get('isEnabledInPane'); }
    return NO;
  }.property('isEnabledInPane'),

  /**
    @type Array
    @default ['sc-button-view']
    @see SC.View#classNames
  */
  classNames: ['sc-button-view'],

  /**
    Whether the title and toolTip will be escaped to avoid HTML injection attacks
    or not.

    You should only disable this option if you are sure you are displaying
    non-user generated text.

    Note: this is not an observed display property.  If you change it after
    rendering, you should call `displayDidChange` on the view to update the layer.

    @type Boolean
    @default true
   */
  escapeHTML: true,

  /**
    The theme to apply to the button. By default, a subtheme with the name of
    'square' is created for backwards-compatibility.

    @type String
    @default 'square'
  */
  themeName: 'square',


  // ..........................................................
  // Value Handling
  //

  /**
    Used to automatically update the state of the button view for toggle style
    buttons.

    For toggle style buttons, you can set the value and it will be used to
    update the isSelected state of the button view.  The value will also
    change as the user selects or deselects.  You can control which values
    the button will treat as `isSelected` by setting the `toggleOnValue` and
    `toggleOffValue`.  Alternatively, if you leave these properties set to
    `YES` or `NO`, the button will do its best to convert a value to an
    appropriate state:

     - `null`, `false`, `0` -- `isSelected = false`
     - any other single value -- `isSelected = true`
     - array -- if all values are the same state, that state; otherwise `MIXED`.

    @type Object
    @default null
  */
  value: null,

  /**
    Value of a selected toggle button.

    For a toggle button, set this to any object value you want. The button
    will be selected if the value property equals the targetValue. If the
    value is an array of multiple items that contains the targetValue, then
    the button will be set to a mixed state.

    default is YES

    @type Boolean|Object
    @default YES
  */
  toggleOnValue: YES,

  /**
    Value of an unselected toggle button.

    For a toggle button, set this to any object value you want.  When the
    user toggle's the button off, the value of the button will be set to this
    value.

    @type Boolean|Object
    @default NO
  */
  toggleOffValue: NO,


  // ..........................................................
  // Title Handling
  //

  /**
    If YES, then the title will be localized.

    @type Boolean
    @default NO
  */
  localize: NO,

  /** @private */
  localizeBindingDefault: SC.Binding.bool(),

  /**
    The button title.  If localize is `YES`, then this should be the
    localization key to display.  Otherwise, this will be the actual string
    displayed in the title.  This property is observable and bindable.

    @type String
    @default ""
  */
  title: "",

  /**
    If set, the title property will be updated automatically
    from the content using the key you specify.

    @type String
    @default null
  */
  contentTitleKey: null,

  /**
    The button icon. Set this to either a URL or a CSS class name (for
    spriting). Note that if you pass a URL, it must contain at
    least one slash to be detected as such.

    @type String
    @default null
  */
  icon: null,

  /**
    If you set this property, the icon will be updated automatically from the
    content using the key you specify.

    @type String
    @default null
  */
  contentIconKey: null,

  /**
    If YES, button will attempt to display an ellipsis if the title cannot
    fit inside of the visible area. This feature is not available on all
    browsers.

    Note: this is not an observed display property.  If you change it after
    rendering, you should call `displayDidChange` on the view to update the layer.

    @type Boolean
    @default YES
  */
  needsEllipsis: YES,

  /**
    This is generated by localizing the title property if necessary.

    @type String
    @observes 'title'
    @observes 'localize'
  */
  displayTitle: function() {
    var ret = this.get('title');
    return (ret && this.get('localize')) ? SC.String.loc(ret) : (ret || '');
  }.property('title','localize').cacheable(),

  /**
    The key equivalent that should trigger this button on the page.

    @type String
    @default null
  */
  keyEquivalent: null,


  // ..........................................................
  // BEHAVIOR
  //

  /**
    The behavioral mode of this button.

    Possible values are:

     - `SC.PUSH_BEHAVIOR` -- Pressing the button will trigger an action tied to the
       button. Does not change the value of the button.
     - `SC.TOGGLE_BEHAVIOR` -- Pressing the button will invert the current value of
       the button. If the button has a mixed value, it will be set to true.
     - `SC.TOGGLE_ON_BEHAVIOR` -- Pressing the button will set the current state to
       true no matter the previous value.
     - `SC.TOGGLE_OFF_BEHAVIOR` -- Pressing the button will set the current state to
       false no matter the previous value.
     - `SC.HOLD_BEHAVIOR` -- Pressing the button will cause the action to repeat at a
       regular interval specified by 'holdInterval'

    @type String
    @default SC.PUSH_BEHAVIOR
  */
  buttonBehavior: SC.PUSH_BEHAVIOR,

  /*
    If buttonBehavior is `SC.HOLD_BEHAVIOR`, this specifies, in milliseconds,
    how often to trigger the action. Ignored for other behaviors.

    @type Number
    @default 100
  */
  holdInterval: 100,

  /**
    If YES, then this button will be triggered when you hit return.

    This is the same as setting the `keyEquivalent` to 'return'.  This will also
    apply the "def" classname to the button.

    @type Boolean
    @default NO
  */
  isDefault: NO,
  isDefaultBindingDefault: SC.Binding.oneWay().bool(),

  /**
    If YES, then this button will be triggered when you hit escape.
    This is the same as setting the keyEquivalent to 'escape'.

    @type Boolean
    @default NO
  */
  isCancel: NO,
  isCancelBindingDefault: SC.Binding.oneWay().bool(),

  /**
    The name of the action you want triggered when the button is pressed.

    This property is used in conjunction with the target property to execute
    a method when a regular button is pressed.  These properties are not
    relevant when the button is used in toggle mode.

    If you do not set a target, then pressing a button will cause the
    responder chain to search for a view that implements the action you name
    here.  If you set a target, then the button will try to call the method
    on the target itself.

    For legacy support, you can also set the action property to a function.
    Doing so will cause the function itself to be called when the button is
    clicked.  It is generally better to use the target/action approach and
    to implement your code in a controller of some type.

    @type String
    @default null
  */
  action: null,

  /**
    The target object to invoke the action on when the button is pressed.

    If you set this target, the action will be called on the target object
    directly when the button is clicked.  If you leave this property set to
    null, then the button will search the responder chain for a view that
    implements the action when the button is pressed instead.

    @type Object
    @default null
  */
  target: null,

  /*
    TODO When is this property ever changed? Is this redundant with
    render delegates since it can now be turned on on a theme-by-theme
    basis? --TD
  */
  /**
    If YES, use a focus ring.

    @type Boolean
    @default NO
  */
  supportFocusRing: NO,

  // ..........................................................
  // Auto Resize Support
  //
  //
  // These properties are provided so that SC.AutoResize can be mixed in
  // to enable automatic resizing of the button.
  //

  /** @private */
  supportsAutoResize: YES,

  /*
    TODO get this from the render delegate so other elements may be used.
  */
  /** @private */
  autoResizeLayer: function() {
    var ret = this.invokeRenderDelegateMethod('getRenderedAutoResizeLayer', this.$());
    return ret || this.get('layer');
  }.property('layer').cacheable(),

  /** @private */
  autoResizeText: function() {
    return this.get('displayTitle');
  }.property('displayTitle').cacheable(),

  /**
    The padding to add to the measured size of the text to arrive at the measured
    size for the view.

    `SC.ButtonView` gets this from its render delegate, but if not supplied, defaults
    to 10.

    @default 10
    @type Number
  */
  autoResizePadding: SC.propertyFromRenderDelegate('autoResizePadding', 10),


  // TODO: What the hell is this? --TD
  _labelMinWidthIE7: 0,

  /**
    Called when the user presses a shortcut key, such as return or cancel,
    associated with this button.

    Highlights the button to show that it is being triggered, then, after a
    delay, performs the button's action.

    Does nothing if the button is disabled.

    @param {Event} evt
    @returns {Boolean} YES if successful, NO otherwise
  */
  triggerActionAfterDelay: function(evt) {
    // If this button is disabled, we have nothing to do
    if (!this.get('isEnabledInPane')) return NO;

    // Set active state of the button so it appears highlighted
    this.set('isActive', YES);

    // Invoke the actual action method after a small delay to give the user a
    // chance to see the highlight. This is especially important if the button
    // closes a pane, for example.
    this.invokeLater('triggerAction', SC.ButtonView.TRIGGER_DELAY, evt);
    return YES;
  },

  /** @private
    Called by triggerActionAfterDelay; this method actually
    performs the action and restores the button's state.

    @param {Event} evt
  */
  triggerAction: function(evt) {
    this._action(evt, YES);
    this.didTriggerAction();
    this.set('isActive', NO);
  },

  /**
    Callback called anytime the button's action is triggered.  You can
    implement this method in your own subclass to perform any cleanup needed
    after an action is performed.
  */
  didTriggerAction: function() {},


  // ................................................................
  // INTERNAL SUPPORT
  //

  /** @private - save keyEquivalent for later use */
  init: function() {
    sc_super();

    var keyEquivalent = this.get('keyEquivalent');
    // Cache the key equivalent. The key equivalent is saved so that if,
    // for example, isDefault is changed from YES to NO, the old key
    // equivalent can be restored.
    if (keyEquivalent) {
      this._defaultKeyEquivalent = keyEquivalent;
    }

    // if value is not null, update isSelected to match value.  If value is
    // null, we assume you may be using isSelected only.
    if (!SC.none(this.get('value'))) this._button_valueDidChange();
  },

  /**
    The WAI-ARIA role of the button.

    @type String
    @default 'button'
    @readOnly
  */
  ariaRole: 'button',

  /**
    The following properties affect how `SC.ButtonView` is rendered, and will
    cause the view to be rerendered if they change.

    Note: 'value', 'isDefault', 'isCancel' are also display properties, but are
    observed separately.

    @type Array
    @default ['icon', 'displayTitle', 'displayToolTip', 'supportFocusRing', 'buttonBehavior']
  */
  displayProperties: ['icon', 'displayTitle', 'displayToolTip', 'supportFocusRing', 'buttonBehavior'],

  /**
    The name of the render delegate in the theme that should be used to
    render the button.

    In this case, the 'button' property will be retrieved from the theme and
    set to the render delegate of this view.

    @type String
    @default 'buttonRenderDelegate'
  */
  renderDelegateName: 'buttonRenderDelegate',

  contentKeys: {
    'contentValueKey': 'value',
    'contentTitleKey': 'title',
    'contentIconKey': 'icon'
  },

  /**
    Handle a key equivalent if set.  Trigger the default action for the
    button.  Depending on the implementation this may vary.

    @param {String} keystring
    @param {SC.Event} evt
    @returns {Boolean}  YES if handled, NO otherwise
  */
  performKeyEquivalent: function(keystring, evt) {
    //If this is not visible
    if (!this.get('isVisibleInWindow')) return NO;

    if (!this.get('isEnabledInPane')) return NO;
    var equiv = this.get('keyEquivalent');

    // button has defined a keyEquivalent and it matches!
    // if triggering succeeded, true will be returned and the operation will
    // be handled (i.e performKeyEquivalent will cease crawling the view
    // tree)
    if (equiv) {
      if (equiv === keystring) return this.triggerAction(evt);

    // should fire if isDefault OR isCancel.  This way if isDefault AND
    // isCancel, responds to both return and escape
    } else if ((this.get('isDefault') && (keystring === 'return')) ||
        (this.get('isCancel') && (keystring === 'escape'))) {
          return this.triggerAction(evt);
    }

    return NO; // did not handle it; keep searching
  },

  // ..........................................................
  // VALUE <-> isSelected STATE MANAGEMENT
  //

  /**
    This is the standard logic to compute a proposed isSelected state for a
    new value.  This takes into account the `toggleOnValue`/`toggleOffValue`
    properties, among other things.  It may return `YES`, `NO`, or
    `SC.MIXED_STATE`.

    @param {Object} value
    @returns {Boolean} return state
  */
  computeIsSelectedForValue: function(value) {
    var targetValue = this.get('toggleOnValue'), state, next ;

    if (SC.typeOf(value) === SC.T_ARRAY) {

      // treat a single item array like a single value
      if (value.length === 1) {
        state = (value[0] == targetValue) ;

      // for a multiple item array, check the states of all items.
      } else {
        state = null;
        value.find(function(x) {
          next = (x == targetValue) ;
          if (state === null) {
            state = next ;
          } else if (next !== state) state = SC.MIXED_STATE ;
          return state === SC.MIXED_STATE ; // stop when we hit a mixed state.
        });
      }

    // for single values, just compare to the toggleOnValue...use truthiness
    } else {
      if(value === SC.MIXED_STATE) state = SC.MIXED_STATE;
      else state = (value === targetValue) ;
    }
    return state ;
  },

  /** @private
    Whenever the button value changes, update the selected state to match.
  */
  _button_valueDidChange: function() {
    var value = this.get('value'),
        state = this.computeIsSelectedForValue(value);
    this.set('isSelected', state) ; // set new state...

    // value acts as a display property
    this.displayDidChange();
  }.observes('value'),

  /** @private
    Whenever the selected state is changed, make sure the button value is
    also updated.  Note that this may be called because the value has just
    changed.  In that case this should do nothing.
  */
  _button_isSelectedDidChange: function() {
    var newState = this.get('isSelected'),
        curState = this.computeIsSelectedForValue(this.get('value'));

    // fix up the value, but only if computed state does not match.
    // never fix up value if isSelected is set to MIXED_STATE since this can
    // only come from the value.
    if ((newState !== SC.MIXED_STATE) && (curState !== newState)) {
      var valueKey = (newState) ? 'toggleOnValue' : 'toggleOffValue' ;
      this.set('value', this.get(valueKey));
    }
  }.observes('isSelected'),


  /** @private
    Used to store the keyboard equivalent.

    Setting the isDefault property to YES, for example, will cause the
    `keyEquivalent` property to 'return'. This cached value is used to restore
    the `keyEquivalent` property if isDefault is set back to NO.

    @type String
  */
  _defaultKeyEquivalent: null,

  /** @private

    Whenever the isDefault or isCancel property changes, re-render and change
    the keyEquivalent property so that we respond to the return or escape key.
  */
  _isDefaultOrCancelDidChange: function() {
    var isDefault = !!this.get('isDefault'),
        isCancel = !isDefault && this.get('isCancel') ;

    if (isDefault) {
      this.set('keyEquivalent', 'return'); // change the key equivalent
    } else if (isCancel) {
      this.set('keyEquivalent', 'escape') ;
    } else {
      // Restore the default key equivalent
      this.set('keyEquivalent', this._defaultKeyEquivalent);
    }

    // isDefault and isCancel act as display properties
    this.displayDidChange();
  }.observes('isDefault', 'isCancel'),

  /** @private
    On mouse down, set active only if enabled.
  */
  mouseDown: function(evt) {
    var buttonBehavior = this.get('buttonBehavior');

    if (!this.get('isEnabledInPane')) return YES ; // handled event, but do nothing
    this.set('isActive', YES);
    this._isMouseDown = YES;

    if (buttonBehavior === SC.HOLD_BEHAVIOR) {
      this._action(evt);
    } else if (!this._isFocused && (buttonBehavior!==SC.PUSH_BEHAVIOR)) {
      this._isFocused = YES ;
      this.becomeFirstResponder();
    }

    return YES;
  },

  /** @private
    Remove the active class on mouseExited if mouse is down.
  */
  mouseExited: function(evt) {
    if (this._isMouseDown) {
      this.set('isActive', NO);
    }
    return YES;
  },

  /** @private
    If mouse was down and we renter the button area, set the active state again.
  */
  mouseEntered: function(evt) {
    if (this._isMouseDown) {
      this.set('isActive', YES);
    }
    return YES;
  },

  /** @private
    ON mouse up, trigger the action only if we are enabled and the mouse was released inside of the view.
  */
  mouseUp: function(evt) {
    if (this._isMouseDown) this.set('isActive', NO); // track independently in case isEnabledInPane has changed
    this._isMouseDown = false;

    if (this.get('buttonBehavior') !== SC.HOLD_BEHAVIOR) {
      var inside = this.$().within(evt.target);
      if (inside && this.get('isEnabledInPane')) this._action(evt) ;
    }

    return YES ;
  },

  /** @private */
  touchStart: function(touch){
    var buttonBehavior = this.get('buttonBehavior');

    if (!this.get('isEnabledInPane')) return YES ; // handled event, but do nothing
    this.set('isActive', YES);

    if (buttonBehavior === SC.HOLD_BEHAVIOR) {
      this._action(touch);
    } else if (!this._isFocused && (buttonBehavior!==SC.PUSH_BEHAVIOR)) {
      this._isFocused = YES ;
      this.becomeFirstResponder();
    }

    // don't want to do whatever default is...
    touch.preventDefault();

    return YES;
  },

  /** @private */
  touchesDragged: function(evt, touches) {
    if (!this.touchIsInBoundary(evt)) {
      if (!this._touch_exited) this.set('isActive', NO);
      this._touch_exited = YES;
    } else {
      if (this._touch_exited) this.set('isActive', YES);
      this._touch_exited = NO;
    }

    evt.preventDefault();
    return YES;
  },

  /** @private */
  touchEnd: function(touch){
    this._touch_exited = NO;
    this.set('isActive', NO); // track independently in case isEnabledInPane has changed

    if (this.get('buttonBehavior') !== SC.HOLD_BEHAVIOR) {
      if (this.touchIsInBoundary(touch) && this.get('isEnabledInPane')) {
        this._action();
      }
    }

    touch.preventDefault();
    return YES ;
  },

  /** @private */
  keyDown: function(evt) {
    // handle tab key
     if(!this.get('isEnabledInPane')) return YES;
    if (evt.which === 9 || evt.keyCode === 9) {
      var view = evt.shiftKey ? this.get('previousValidKeyView') : this.get('nextValidKeyView');
      if(view) view.becomeFirstResponder();
      else evt.allowDefault();
      return YES ; // handled
    }
    if (evt.which === 13 || evt.which === 32) {
      this.triggerActionAfterDelay(evt);
      return YES ; // handled
    }

    // let other keys through to browser
    evt.allowDefault();

    return NO;
  },

  /** @private
    Perform an action based on the behavior of the button.

     - toggle behavior: switch to on/off state
     - on behavior: turn on.
     - off behavior: turn off.
     - otherwise: invoke target/action
  */
  _action: function(evt, skipHoldRepeat) {
    switch(this.get('buttonBehavior')) {

    // When toggling, try to invert like values. i.e. 1 => 0, etc.
    case SC.TOGGLE_BEHAVIOR:
      var sel = this.get('isSelected') ;
      if (sel) {
        this.set('value', this.get('toggleOffValue')) ;
      } else {
        this.set('value', this.get('toggleOnValue')) ;
      }
      break ;

    // set value to on.  change 0 => 1.
    case SC.TOGGLE_ON_BEHAVIOR:
      this.set('value', this.get('toggleOnValue')) ;
      break ;

    // set the value to false. change 1 => 0
    case SC.TOGGLE_OFF_BEHAVIOR:
      this.set('value', this.get('toggleOffValue')) ;
      break ;

    case SC.HOLD_BEHAVIOR:
      this._runHoldAction(evt, skipHoldRepeat);
      break ;

    // otherwise, just trigger an action if there is one.
    default:
      //if (this.action) this.action(evt);
      this._runAction(evt);
    }
  },

  /** @private */
  _runAction: function(evt) {
    var action = this.get('action'),
        target = this.get('target') || null,
        rootResponder;

    if (action) {
      if (action && (SC.typeOf(action) === SC.T_FUNCTION)) {
        this.action(evt);
        return;
      } else {
        rootResponder = this.getPath('pane.rootResponder');
        if (rootResponder) {
          // newer action method + optional target syntax...
          rootResponder.sendAction(action, target, this, this.get('pane'), null, this);
        }
      }
    }
  },

  /** @private */
  _runHoldAction: function(evt, skipRepeat) {
    if (this.get('isActive')) {
      this._runAction();

      if (!skipRepeat) {
        // This run loop appears to only be necessary for testing
        SC.RunLoop.begin();
        this.invokeLater('_runHoldAction', this.get('holdInterval'), evt);
        SC.RunLoop.end();
      }
    }
  },


  /** @private */
  didBecomeKeyResponderFrom: function(keyView) {
    // focus the text field.
    if (!this._isFocused) {
      this._isFocused = YES ;
      this.becomeFirstResponder();
      if (this.get('isVisibleInWindow')) {
        this.$().focus();
      }
    }
  },

  /** @private */
  willLoseKeyResponderTo: function(responder) {
    if (this._isFocused) this._isFocused = NO ;
  },

  /** @private */
  didAppendToDocument: function() {
    if(SC.browser.isIE &&
        SC.browser.compare(SC.browser.version, '7') === 0 &&
        this.get('useStaticLayout')){
      var layout = this.get('layout'),
          elem = this.$(), w=0;
      if(elem && elem[0] && (w=elem[0].clientWidth) && w!==0 && this._labelMinWidthIE7===0){
        var label = this.$('.sc-button-label'),
            paddingRight = parseInt(label.css('paddingRight'),0),
            paddingLeft = parseInt(label.css('paddingLeft'),0),
            marginRight = parseInt(label.css('marginRight'),0),
            marginLeft = parseInt(label.css('marginLeft'),0);
        if(marginRight=='auto') SC.Logger.log(marginRight+","+marginLeft+","+paddingRight+","+paddingLeft);
        if(!paddingRight && isNaN(paddingRight)) paddingRight = 0;
        if(!paddingLeft && isNaN(paddingLeft)) paddingLeft = 0;
        if(!marginRight && isNaN(marginRight)) marginRight = 0;
        if(!marginLeft && isNaN(marginLeft)) marginLeft = 0;

        this._labelMinWidthIE7 = w-(paddingRight + paddingLeft)-(marginRight + marginLeft);
        label.css('minWidth', this._labelMinWidthIE7+'px');
      }else{
        this.invokeLater(this.didAppendToDocument, 1);
      }
    }
  }

}) ;

/**
  How long to wait before triggering the action.

  @constant
  @type {Number}
*/
SC.ButtonView.TRIGGER_DELAY = 200;

/**
  The delay after which "click" behavior should transition to "click and hold"
  behavior. This is used by subclasses such as PopupButtonView and
  SelectButtonView.

  @constant
  @type Number
*/
SC.ButtonView.CLICK_AND_HOLD_DELAY = SC.browser.isIE ? 600 : 300;

SC.REGULAR_BUTTON_HEIGHT=24;


