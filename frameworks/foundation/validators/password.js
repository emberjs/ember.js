// ==========================================================================
// Project:   SproutCore - JavaScript Application Framework
// Copyright: ©2006-2011 Strobe Inc. and contributors.
//            Portions ©2008-2011 Apple Inc. All rights reserved.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

sc_require('validators/validator') ;

/**
  Ensures all fields with the Password validator attached in the same form
  contain the same value.
  
  @class
  @extends SC.Validator
  @author Charles Jolley
  @version 1.0
*/
SC.Validator.Password = SC.Validator.extend(
/** @scope SC.Validator.Password.prototype */ {

  attachTo: function(form,field) {
    sc_super();
    if (!this.fields) this.fields = [] ;
    this.fields.push(field) ;
  },

  validate: function(force) {
    if (!this.fields || this.fields.length === 0) return true ;
    
    var empty = false ;
    var notEmpty = false ;
    var ret = true ;
    var value = this.fields[0].get('fieldValue') ;
    this.fields.forEach(function(field) {
      var curValue = field.get('fieldValue') ;
      if (curValue != value) ret= false ;
      if (!curValue || curValue.length === 0) empty = true ;
      if (curValue && curValue.length > 0) notEmpty = true ;
    }) ;

    // if forces, valid OK if there was an empty.  If not forced, valid OK 
    // only if all fields match AND they are not all empty.
    if (force) {
      return (notEmpty === false) ? false : ret ;
    } else {
      return (empty === true) ? true : ret ;
    }
  },
  
  // update field states
  updateFields: function(form,valid) {
    if (!this.fields || this.fields.length === 0) return true ;
    var err = SC.String.loc("Invalid.Password");
    var topField = this._field ;
    this.fields.forEach(function(f) {
      var msg = (valid) ? null : ((f == topField) ? err : '') ;
      form.setErrorFor(f,msg) ;
    }) ;
    return (valid) ? SC.VALIDATE_OK : err ;
  },
  
  validateChange: function(form, field, oldValue) { 
    return this.updateFields(form, this.validate(false)) ;
  },

  // this method is called just before the form is submitted.
  // field: the field to validate.
  validateSubmit: function(form, field) { 
    return this.updateFields(form, this.validate(true)) ;
  },

  // this method gets called 1ms after the user types a key (if a change is
  // allowed).  You can use this validate the new partial string and return 
  // an error if needed.
  //
  // The default will validate a partial only if there was already an error.
  // this allows the user to try to get it right before you bug them.
  validatePartial: function(form, field) {
    var isInvalid = !this._field.get('isValid') ;
    if (isInvalid) {
      return this.updateFields(form, this.validate(false)) ;
    } else return SC.VALIDATE_NO_CHANGE ;
  }
    
}) ;
