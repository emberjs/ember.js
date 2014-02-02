// ==========================================================================
// Project:   SproutCore - JavaScript Application Framework
// Copyright: ©2006-2011 Strobe Inc. and contributors.
//            Portions ©2008-2011 Apple Inc. All rights reserved.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

sc_require('validators/validator') ;
sc_require('system/utils/misc');

/**
  Handles parsing and validating of numbers.
  
  @extends SC.Validator
  @author Charles Jolley
  @version 1.0
  @class
*/
SC.Validator.Number = SC.Validator.extend(
/** @scope SC.Validator.Number.prototype */ {

  /**
    Number of decimal places to show.  
    
    If 0, then numbers will be treated as integers.  Otherwise, numbers will
    show with a fixed number of decimals.
  */
  places: 0,
  
  fieldValueForObject: function(object, form, field) {
    switch(SC.typeOf(object)) {
      case SC.T_NUMBER:
        object = object.toFixed(this.get('places')) ;
        break ;
      case SC.T_NULL:
      case SC.T_UNDEFINED:
        object = '';
        break ;
    }
    return object ;
  },

  objectForFieldValue: function(value, form, field) {
    // strip out commas
    var result;
    value = value.replace(/,/g,'');
    switch(SC.typeOf(value)) {
      case SC.T_STRING:
        if (value.length === 0) {
          value = null ;
        } else if (this.get('places') > 0) {
          value = parseFloat(value) ;
        } else {
          if(value.length===1 && value.match(/-/)) value = null;
          else {
            result = parseInt(value,0) ;
            if(isNaN(result)){
              value = SC.uniJapaneseConvert(value);
              value = parseInt(value,0) ;
              if(isNaN(value)) value='';
            }else value = result;
          }
        }
        break ;
      case SC.T_NULL:
      case SC.T_UNDEFINED:
        value = null ;
        break ;
    }
    return value ;
  },
  
  validate: function(form, field) { 
    var value = field.get('fieldValue') ;
    return (value === '') || !(isNaN(value) || isNaN(parseFloat(value))) ; 
  },
  
  validateError: function(form, field) {
    var label = field.get('errorLabel') || 'Field' ;
    return SC.$error(SC.String.loc("Invalid.Number(%@)", label), label) ;
  },
  
  /** 
    Allow only numbers, dashes, period, and commas
  */
  validateKeyDown: function(form, field, charStr) {
    if(!charStr) charStr = "";
    var text = field.$input().val();
    if (!text) text='';
    text+=charStr;

    if(this.get('places')===0){
      if(charStr.length===0) return true;
      else return text.match(/^[\-{0,1}]?[0-9,\0]*/)[0]===text;
    }else {
      if(charStr.length===0) return true;
      else return text.match(/^[\-{0,1}]?[0-9,\0]*\.?[0-9\0]+/)===text;
    }
  }
    
}) ;
