// ==========================================================================
// Project:   SproutCore - JavaScript Application Framework
// Copyright: ©2006-2011 Strobe Inc. and contributors.
//            Portions ©2008-2011 Apple Inc. All rights reserved.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

sc_require('system/string');

SC.VALIDATE_OK = YES;
SC.VALIDATE_NO_CHANGE = NO;

/**
  @class
  
  Validators provide a way for you to implement simple form field validation
  and transformation.  To use a validator, simply name the validator in the
  "validate" attribute in your text field.  For example, if you want to
  validate a field using the PhoneNumberValidator use this:

      <input value="1234567890" validate="phone-number" />

  Validators get notified at three points.  You can implement one or all
  of these methods to support validation.  All of the validate methods except
  for validateKeypress behave the same way.  You are passed a form, field,
  and possibly the oldValue.  You are expected to return Validator.OK or
  an error string.  Inside this method you typically do one of all of the
  following:

  1. You can simply validate the field value and return OK or an error str
  2. You can modify the field value (for example, you could format the
     string to match some predefined format).
  3. If you need to roundtrip the server first to perform validation, you can
     return Validator.OK, then save the form and field info until after the
     roundtrip.  On return, if there is a problem, first verify the field
     value has not changed and then call form.errorFor(field,str) ;

  @extends SC.Object
  @since SproutCore 1.0
*/
SC.Validator = SC.Object.extend(
/** @scope SC.Validator.prototype */ {

  // ..........................................
  // OBJECT VALUE CONVERSION
  //
  // The following methods are used to convert the string value of a field
  // to and from an object value.  The default implementations return
  // the string, but you can override this to provide specific behaviors. 
  // For example, you might add or remove a dollar sign or convert the 
  // value to a number.
  
/**
  Returns the value to set in the field for the passed object value.  
  
  The form and view to be set MAY (but will not always) be passed also.  You
  should override this method to help convert an input object into a value
  that can be displayed by the field.  For example, you might convert a 
  date to a property formatted string or a number to a properly formatted
  value.
  
  @param {Object} object The object to transform
  @param {SC.FormView} form The form this field belongs to. (optional)
  @param {SC.View} view The view the value is required for.
  @returns {Object} a value (usually a string) suitable for display
*/
  fieldValueForObject: function(object, form, view) { return object; },
  
  /**
    Returns the object value for the passed string.
    
    The form and view MAY (but wil not always) be passed also.  You should
    override this method to convert a field value, such as string, into an
    object value suitable for consumption by the rest of the app.  For example
    you may convert a string into a date or a number.
    
    @param {String} value the field value.  (Usually a String).
    @param {SC.FormView} form The form this field belongs to. (optional)
    @param {SC.View} view The view this value was pulled from.
    @returns {Object} an object suitable for consumption by the app.
  */
  objectForFieldValue: function(value, form, view) { return value; },
  
  // ..........................................
  // VALIDATION PRIMITIVES
  //

  /**
    Validate the field value.  
    
    You can implement standard behavior for your validator by using the validate()
    and validateError() methods.  validate() should return NO if the field is not
    valid, YES otherwise.  If you return NO from this method, then the validateError()
    method will be called so you can generate an error object describing the specific problem.

    @param {SC.FormView} form the form this view belongs to
    @param {SC.View} field the field to validate.  Responds to fieldValue.
    @returns {Boolean} YES if field is valid.
  */
  validate: function(form, field) { return true; },

  /**
    Returns an error object if the field is invalid.
  
    This is the other standard validator method that can be used to implement basic validation.
    Return an error object explaining why the field is not valid.  It will only be called if
    validate() returned NO.
    
    The default implementation of this method returns a generic error message with the loc
    string "Invalid.Generate({fieldValue})".  You can simply define this loc string in
    strings.js if you prefer or you can override this method to provide a more specific error message.
  
    @param {SC.FormView} form the form this view belongs to
    @param {SC.View} field the field to validate.  Responds to fieldValue.
    @returns {SC.Error} an error object
  */
  validateError: function(form, field) { 
    return SC.$error(
      SC.String.loc("Invalid.General(%@)", field.get('fieldValue')),
      field.get('fieldKey')) ; 
  },

  // ..........................................
  // VALIDATION API
  //

  /**
    Invoked just before the user ends editing of the field.

    This is a primitive validation method.  You can implement the two higher-level
    methods (validate() and validateError()) if you prefer.
    
    The default implementation calls your validate() method and then validateError()
    if validate() returns NO.  This method should return SC.VALIDATE_OK if validation
    succeeded or an error object if it fails.
  
    @param {SC.FormView} form the form for the field
    @param {SC.View} field the field to validate
    @param {Object} oldValue: the value of the field before the change

    @returns SC.VALIDATE_OK or an error object.
  
  */
  validateChange: function(form, field, oldValue) { 
    return this.validate(form,field) ? SC.VALIDATE_OK : this.validateError(form, field);
  },

  /**
    Invoked just before the form is submitted.
  
    This method gives your validators one last chance to perform validation
    on the form as a whole.  The default version does the same thing as the 
    validateChange() method.
  
    @param {SC.FormView} form the form for the field
    @param {SC.View} field the field to validate

    @returns SC.VALIDATE_OK or an error object.
  
  */  
  validateSubmit: function(form, field) { 
    return this.validate(form,field) ? SC.VALIDATE_OK : this.validateError(form, field);
  },

  /**
    Invoked 1ms after the user types a key (if a change is allowed).  
  
    You can use this validate the new partial string and return an error if 
    needed. The default will validate a partial only if there was already an 
    error. This allows the user to try to get it right before you bug them.
  
    Unlike the other methods, you should return SC.VALIDATE_NO_CHANGE if you
    did not actually validate the partial string.  If you return 
    SC.VALIDATE_OK then any showing errors will be hidden.
  
    @param {SC.FormView} form the form for the field
    @param {SC.View} field the field to validate

    @returns SC.VALIDATE_OK, SC.VALIDATE_NO_CHANGE or an error object.
  */  
  validatePartial: function(form, field) { 
    if (!field.get('isValid')) {
      return this.validate(form,field) ? SC.VALIDATE_OK : this.validateError(form, field);
    } else return SC.VALIDATE_NO_CHANGE ;
  },
  
  /**
    Invoked when the user presses a key.  
  
    This method is used to restrict the letters and numbers the user is 
    allowed to enter.  You should not use this method to perform full 
    validation on the field.  Instead use validatePartial().
  
    @param {SC.FormView} form the form for the field
    @param {SC.View} field the field to validate
    @param {String} char the characters being added
    
    @returns {Boolean} YES if allowed, NO otherwise
  */
  validateKeyDown: function(form, field,charStr) { return true; },

  // .....................................
  // OTHER METHODS

  /**
    Called on all validators when they are attached to a field.  
  
    You can use this to do any setup that you need.  The default does nothing.
    
    @param {SC.FormView} form the form for the field
    @param {SC.View} field the field to validate
  */
  attachTo: function(form,field) { },

  /**
    Called on a validator just before it is removed from a field.  You can 
    tear down any setup you did for the attachTo() method.
    
    @param {SC.FormView} form the form for the field
    @param {SC.View} field the field to validate
  */
  detachFrom: function(form, field) {}

}) ;

SC.Validator.mixin(/** @scope SC.Validator */ {

  /**
    Return value when validation was performed and value is OK.
  */
  OK: true, 
  
  /**
    Return value when validation was not performed.
  */
  NO_CHANGE: false,  

  /**
    Invoked by a field whenever a validator is attached to the field.
    
    The passed validatorKey can be a validator instance, a validator class
    or a string naming a validator. To make your validator
    visible, you should name your validator under the SC.Validator base.
    for example SC.Validator.Number would get used for the 'number' 
    validator key.
  
    This understands validatorKey strings in the following format:

    * 'key' or 'multiple_words' will find validators Key and MultipleWords

    * if you want to share a single validator among multiple fields (for
      example to validate that two passwords are the same) set a name inside
      brackets. i.e. 'password[pwd]'.

    @param {SC.FormView} form the form for the field
    @param {SC.View} field the field to validate
    @param {Object} validatorKey the key to validate
    
    @returns {SC.Validator} validator instance or null
  */  
  findFor: function(form,field, validatorKey) {
    
    // Convert the validator into a validator instance.
    var validator ;
    if (!validatorKey) return ; // nothing to do...
    
    if (validatorKey instanceof SC.Validator) {
      validator = validatorKey ;
    } else if (validatorKey.isClass) {
      validator = validatorKey.create() ;
      
    } else if (SC.typeOf(validatorKey) === SC.T_STRING) {

      // extract optional key name
      var name = null ;
      var m = validatorKey.match(/^(.+)\[(.*)\]/) ;
      if (m) {
        validatorKey = m[1] ; name = m[2]; 
      }
      
      // convert the validatorKey name into a class.
      validatorKey = SC.String.classify(validatorKey);
      var validatorClass = SC.Validator[validatorKey] ;
      if (SC.none(validatorClass)) {
        throw new Error("validator %@ not found for %@".fmt(validatorKey, field));
      } else if (name) {

        // if a key was also passed, then find the validator in the list of
        // validators for the form.  Otherwise, just create a new instance.
        if (!form) {
          throw new Error("named validator (%@) could not be found for field %@ because the field does not belong to a form".fmt(name,field));
        }
        
        if (!form._validatorHash) form._validatorHash = {} ;
        validator = (name) ? form._validatorHash[name] : null ;
        if (!validator) validator = validatorClass.create() ;
        if (name) form._validatorHash[name] = validator ;
      } else validator = validatorClass.create() ;
    } 
    
    return validator ;
  },
  
  /**
    Convenience class method to call the fieldValueForObject() instance
    method you define in your subclass.
  */
  fieldValueForObject: function(object, form, field) {
    if (this.prototype && this.prototype.fieldValueForObject) {
      return this.prototype.fieldValueForObject(object,form,field) ;
    }
    else return null ;
  },
  
  /**
    Convenience class method to call the objectForFieldValue() instance
    method you define in your subclass.
  */
  objectForFieldValue: function(value, form, field) {
    if (this.prototype && this.prototype.objectForFieldValue) {
      return this.prototype.objectForFieldValue(value,form,field) ;
    }
    else return null ;
  }
  
});
