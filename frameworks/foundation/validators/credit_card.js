// ==========================================================================
// Project:   SproutCore - JavaScript Application Framework
// Copyright: ©2006-2011 Strobe Inc. and contributors.
//            Portions ©2008-2011 Apple Inc. All rights reserved.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

sc_require('validators/validator') ;

/** @class
  Validate a field value as a credit card number. 
  
  This validator will perform a basic check to ensure the credit card number
  is mathematically valid.  It will also accept numbers with spaces, dashes
  or other punctuation.  
  
  Converted credit card numbers are broken into units of 4.
  
  Basic credit card validation courtesy David Leppek 
  (https://www.azcode.com/Mod10)

  @extends SC.Validator
  @since SproutCore 1.0
*/
SC.Validator.CreditCard = SC.Validator.extend(
/** @scope SC.Validator.CreditCard.prototype */ {

  /**
    Expects a string of 16 digits.  Will split into groups of 4 for display.
  */
  fieldValueForObject: function(object, form, field) {
    if (typeof(object) == "string" && object.length == 16) {
      object = [object.slice(0,4),object.slice(4,8),object.slice(8,12),object.slice(12,16)].join(' ') ;
    }
    return object ;
  },

  /**
    Removes all whitespace or dashes to make a single string.
  */
  objectForFieldValue: function(value, form, field) {
    return value.replace(/[\s-\.\:]/g,'') ;
  },
  
  validate: function(form, field) { 
    return this.checkNumber(field.get('fieldValue')) ; 
  },
  
  validateError: function(form, field) {
    var label = field.get('errorLabel') || 'Field' ;
    return SC.$error(SC.String.loc("Invalid.CreditCard(%@)", label), label);
  },
  
  /** 
    Allow only numbers, dashes, and spaces 
  */
  validateKeyDown: function(form, field, charStr) {
    return !!charStr.match(/[0-9\- ]/);
  },
  
  checkNumber: function(ccNumb) {
    
    if (!ccNumb || ccNumb.length===0) return YES; // do not validate empty
    
    // remove any spaces or dashes
    ccNumb = ccNumb.replace(/[^0-9]/g,'');
    
    var valid = "0123456789";  // Valid digits in a credit card number
    var len = ccNumb.length;  // The length of the submitted cc number
    var iCCN = parseInt(ccNumb,0);  // integer of ccNumb
    var sCCN = ccNumb.toString();  // string of ccNumb
    sCCN = sCCN.replace (/^\s+|\s+$/g,'');  // strip spaces
    var iTotal = 0;  // integer total set at zero
    var bNum = true;  // by default assume it is a number
    var bResult = false;  // by default assume it is NOT a valid cc
    var temp;  // temp variable for parsing string
    var calc;  // used for calculation of each digit

    // Determine if the ccNumb is in fact all numbers
    for (var j=0; j<len; j++) {
      temp = "" + sCCN.substring(j, j+1);
      if (valid.indexOf(temp) == "-1"){bNum = false;}
    }

    // if it is NOT a number, you can either alert to the fact, 
    // or just pass a failure
    if(!bNum) bResult = false;

    // Determine if it is the proper length 
    if((len === 0)&&(bResult)){  // nothing, field is blank AND passed above # check
      bResult = false;
    } else{  // ccNumb is a number and the proper length - let's see if it is a valid card number
      if(len >= 15){  // 15 or 16 for Amex or V/MC
        for(var i=len;i>0;i--){  // LOOP through the digits of the card
          calc = parseInt(iCCN,0) % 10;  // right most digit
          calc = parseInt(calc,0);  // assure it is an integer
          iTotal += calc;  // running total of the card number as we loop - Do Nothing to first digit
          i--;  // decrement the count - move to the next digit in the card
          iCCN = iCCN / 10;                               // subtracts right most digit from ccNumb
          calc = parseInt(iCCN,0) % 10 ;    // NEXT right most digit
          calc = calc *2;                                 // multiply the digit by two
          // Instead of some screwy method of converting 16 to a string and then parsing 1 and 6 and then adding them to make 7,
          // I use a simple switch statement to change the value of calc2 to 7 if 16 is the multiple.
          switch(calc){
            case 10: calc = 1; break;       //5*2=10 & 1+0 = 1
            case 12: calc = 3; break;       //6*2=12 & 1+2 = 3
            case 14: calc = 5; break;       //7*2=14 & 1+4 = 5
            case 16: calc = 7; break;       //8*2=16 & 1+6 = 7
            case 18: calc = 9; break;       //9*2=18 & 1+8 = 9
            default: calc = calc;           //4*2= 8 &   8 = 8  -same for all lower numbers
          }                                               
        iCCN = iCCN / 10;  // subtracts right most digit from ccNum
        iTotal += calc;  // running total of the card number as we loop
      }  // END OF LOOP
      if ((iTotal%10)===0){  // check to see if the sum Mod 10 is zero
        bResult = true;  // This IS (or could be) a valid credit card number.
      } else {
        bResult = false;  // This could NOT be a valid credit card number
        }
      }
    }
    return bResult; // Return the results
  }
    
}) ;
