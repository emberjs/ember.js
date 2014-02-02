// ==========================================================================
// Project:   SproutCore - JavaScript Application Framework
// Copyright: ©2006-2011 Strobe Inc. and contributors.
//            Portions ©2008-2011 Apple Inc. All rights reserved.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

sc_require('mixins/validatable') ;

/** @class

  Base view for managing a view backed by an input element.  Since the web
  browser provides native support for editing input elements, this view
  provides basic support for listening to changes on these input elements and
  responding to them.

  Generally you will not work with a FieldView directly.  Instead, you should
  use one of the subclasses implemented by your target platform such as
  SC.CheckboxView, SC.RadioView, SC.TextFieldView, and so on.

  @extends SC.View
  @extends SC.Control
  @extends SC.Validatable
  @since SproutCore 1.0
*/
SC.FieldView = SC.View.extend(SC.Control, SC.Validatable,
/** @scope SC.FieldView.prototype */ {

  /**
  _field_isMouseDown: NO,

  /**
    The raw value of the field itself.  This is computed from the 'value'
    property by passing it through any validator you might have set.  This is
    the value that will be set on the field itself when the view is updated.

    @type String
  */
  fieldValue: function() {
    var value = this.get('value');
    if (SC.typeOf(value) === SC.T_ERROR) value = value.get('errorValue');
    return this.fieldValueForObject(value);
  }.property('value', 'validator').cacheable(),

  // ..........................................................
  // PRIMITIVES
  //

  /**
    Override to return an CoreQuery object that selects the input elements
    for the view.  If this method is defined, the field view will
    automatically edit the attrbutes of the input element to reflect the
    current isEnabled state among other things.
  */
  $input: function() {
    var elementTagName = this._inputElementTagName(); // usually "input"
    return this.$(elementTagName).andSelf().filter(elementTagName);
  },

  /** @private
    Override to specify the HTML element type to use as the field. For
    example, "input" or "textarea".
  */
  _inputElementTagName: function() {
    return 'input';
  },

  /**
    Override to set the actual value of the field.

    The default implementation will simple copy the newValue to the value
    attribute of any input tags in the receiver view.  You can override this
    method to provide specific functionality needed by your view.

    @param {Object} newValue the value to display.
    @returns {SC.FieldView} receiver
  */
  setFieldValue: function(newValue) {
    if (SC.none(newValue)) newValue = '' ;
    var input = this.$input();

    // Don't needlessly set the element if it already has the value, because
    // doing so moves the cursor to the end in some browsers.
    if (input.val() !== newValue) {
      input.val(newValue);
    }
    return this ;
  },

  /**
    Override to retrieve the actual value of the field.

    The default implementation will simply retrieve the value attribute from
    the first input tag in the receiver view.

    @returns {String} value
  */
  getFieldValue: function() {
    return this.$input().val();
  },

  _field_fieldValueDidChange: function(evt) {
    SC.run(function() {
      this.fieldValueDidChange(NO);
    }, this);
  },

  /**
    Your class should call this method anytime you think the value of the
    input element may have changed.  This will retrieve the value and update
    the value property of the view accordingly.

    If this is a partial change (i.e. the user is still editing the field and
    you expect the value to change further), then be sure to pass YES for the
    partialChange parameter.  This will change the kind of validation done on
    the value.  Otherwise, the validator may mark the field as having an error
    when the user is still in mid-edit.

    @param partialChange (optional) YES if this is a partial change.
    @returns {Boolean|SC.Error} result of validation.
  */
  fieldValueDidChange: function(partialChange) {
    // collect the field value and convert it back to a value
    var fieldValue = this.getFieldValue();
    var value = this.objectForFieldValue(fieldValue, partialChange);
    this.setIfChanged('value', value);


    // ======= [Old code -- left here for concept reminders. Basic validation
    // API works without it] =======

    // validate value if needed...

    // this.notifyPropertyChange('fieldValue');
    //
    // // get the field value and set it.
    // // if ret is an error, use that instead of the field value.
    // var ret = this.performValidate ? this.performValidate(partialChange) : YES;
    // if (ret === SC.VALIDATE_NO_CHANGE) return ret ;
    //
    // this.propertyWillChange('fieldValue');
    //
    // // if the validator says everything is OK, then in addition to posting
    // // out the value, go ahead and pass the value back through itself.
    // // This way if you have a formatter applied, it will reformat.
    // //
    // // Do this BEFORE we set the value so that the valueObserver will not
    // // overreact.
    // //
    // var ok = SC.$ok(ret);
    // var value = ok ? this._field_getFieldValue() : ret ;
    // if (!partialChange && ok) this._field_setFieldValue(value) ;
    // this.set('value',value) ;
    //
    // this.propertyDidChange('fieldValue');
    //
    // return ret ;
  },

  // ..........................................................
  // INTERNAL SUPPORT
  //

  /** @private
    invoked when the value property changes.  Sets the field value...
  */
  _field_valueDidChange: function() {
    this.setFieldValue(this.get('fieldValue'));
  }.observes('fieldValue'),

  /**
    SC.View view state callback.

    After the layer is created, set the field value and begin observing
    change events on the input field.
  */
  didCreateLayer: function() {
    this.setFieldValue(this.get('fieldValue'));
    this._addChangeEvent();
  },

  /**
    SC.View state callback.

    Removes the change event from the input field.
  */
  willDestroyLayer: function() {
    SC.Event.remove(this.$input(), 'change', this, this._field_fieldValueDidChange);
  },

  // ACTIONS
  // You generally do not need to override these but they may be used.

  /**
    Called to perform validation on the field just before the form
    is submitted.  If you have a validator attached, this will get the
    validators.
  */
  // validateSubmit: function() {
  //   var ret = this.performValidateSubmit ? this.performValidateSubmit() : YES;
  //   // save the value if needed
  //   var value = SC.$ok(ret) ? this._field_getFieldValue() : ret ;
  //   if (value != this.get('value')) this.set('value', value) ;
  //   return ret ;
  // },

  // OVERRIDE IN YOUR SUBCLASS
  // Override these primitives in your subclass as required.

  /**
    SC.RootResponder event handler.

    Allow the browser to do its normal event handling for the mouse down
    event.  But first, set isActive to YES.
  */
  mouseDown: function(evt) {
    this._field_isMouseDown = YES;
    evt.allowDefault();
    return YES;
  },

  /**
    SC.RootResponder event handler.

    Remove the active class on mouseExited if mouse is down.
  */
  mouseExited: function(evt) {
    if (this._field_isMouseDown) this.set('isActive', NO);
    evt.allowDefault();
    return YES;
  },

  /**
    SC.RootResponder event handler.

    If mouse was down and we renter the button area, set the active state again.
  */
  mouseEntered: function(evt) {
    this.set('isActive', this._field_isMouseDown);
    evt.allowDefault();
    return YES;
  },

  /**
    SC.RootResponder event handler.

    On mouse up, remove the isActive class and then allow the browser to do
    its normal thing.
  */
  mouseUp: function(evt) {
    // track independently in case isEnabled has changed
    if (this._field_isMouseDown) this.set('isActive', NO);
    this._field_isMouseDown = NO;
    evt.allowDefault();
    return YES ;
  },

  /**
    SC.RootResponder event handler.

    Simply allow keyDown & keyUp to pass through to the default web browser
    implementation.
  */
  keyDown: function(evt) {

    // handle tab key
    if (evt.which === 9 || evt.keyCode===9) {
      var view = evt.shiftKey ? this.get('previousValidKeyView') : this.get('nextValidKeyView');
      if (view) view.becomeFirstResponder();
      else evt.allowDefault();
      return YES ; // handled
    }

    // validate keyDown...
    if (this.performValidateKeyDown(evt)) {
      this._isKeyDown = YES ;
      evt.allowDefault();
    } else {
      evt.stop();
    }

    return YES;
  },

  /**
    Override of SC.Responder.prototype.acceptsFirstResponder.

    Tied to the `isEnabledInPane` state.
  */
  acceptsFirstResponder: function() {
    if (SC.FOCUS_ALL_CONTROLS) { return this.get('isEnabledInPane'); }
    return NO;
  }.property('isEnabledInPane'),

  /** @private */
  _addChangeEvent: function() {
    SC.Event.add(this.$input(), 'change', this, this._field_fieldValueDidChange);
  },

  /** @private */
  // these methods use the validator to convert the raw field value returned
  // by your subclass into an object and visa versa.
  _field_setFieldValue: function(newValue) {
    this.propertyWillChange('fieldValue');
    if (this.fieldValueForObject) {
      newValue = this.fieldValueForObject(newValue) ;
    }
    var ret = this.setFieldValue(newValue) ;
    this.propertyDidChange('fieldValue');
    return ret ;
  },

  /** @private */
  _field_getFieldValue: function() {
    var ret = this.getFieldValue() ;
    if (this.objectForFieldValue) ret = this.objectForFieldValue(ret);
    return ret ;
  }
});

