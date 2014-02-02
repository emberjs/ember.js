// ==========================================================================
// Project:   SproutCore - JavaScript Application Framework
// Copyright: ©2006-2011 Strobe Inc. and contributors.
//            Portions ©2008-2011 Apple Inc. All rights reserved.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

sc_require('validators/validator') ;

/**
  Handles parsing and validating of positive integers.
  
  @extends SC.Validator
  @author Nirumal Thomas
  @version 1.0
  @class
*/
SC.Validator.PositiveInteger = SC.Validator.extend(
/** @scope SC.Validator.PositiveInteger.prototype */ {

  /**
    Default Value to be displayed. If the value in the text field is null,
    undefined or an empty string, it will be replaced by this value.

    @property
    @type Number
    @default null
  */
  defaultValue: null,

  fieldValueForObject: function(object, form, field) {
    switch(SC.typeOf(object)) {
      case SC.T_NUMBER:
        object = object.toFixed(0) ;
        break ;
      case SC.T_NULL:
      case SC.T_UNDEFINED:
        object = this.get('defaultValue') ;
        break ;
    }
    return object ;
  },

  objectForFieldValue: function(value, form, field) {
    // strip out commas
    value = value.replace(/,/g,'');
    switch(SC.typeOf(value)) {
      case SC.T_STRING:
        if (value.length === 0) {
          value = this.get('defaultValue') ;
        } else {
          value = parseInt(value, 0) ;
        }
        break ;
      case SC.T_NULL:
      case SC.T_UNDEFINED:
        value = this.get('defaultValue') ;
        break ;
    }
    if(isNaN(value)) return this.get('defaultValue');
    return value ;
  },

  validate: function(form, field) {
    var value = field.get('fieldValue') ;
    return (value === '') || !isNaN(value) ;
  },
  
  validateError: function(form, field) {
    var label = field.get('errorLabel') || 'Field' ;
    return SC.$error(SC.String.loc("Invalid.Number(%@)", label), label) ;
  },
  
  /** 
    Allow only numbers
  */
  validateKeyDown: function(form, field, charStr) {
    var text = field.$input().val();
    if (!text) text='';
    text+=charStr;
    if(charStr.length===0) return true ;
    else return text.match(/^[0-9\0]*/)[0]===text;
  }
    
}) ;
