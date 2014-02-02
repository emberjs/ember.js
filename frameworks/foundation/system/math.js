// ==========================================================================
// Project:   SproutCore - JavaScript Application Framework
// Copyright: ©2006-2011 Strobe Inc. and contributors.
//            Portions ©2008-2011 Apple Inc. All rights reserved.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

/**
  @class
  
  Implements some enhancements to the built-in Number object that makes it
  easier to handle rounding and display of numbers.
  
  @since SproutCore 1.0
  @author Colin Campbell
*/
SC.Math = SC.Object.create(
/** @lends SC.Math.prototype */ {
  
  /**
    Checks to see if the number is near the supplied parameter to a certain lambda.
    
    @param {Number} n1 First number in comparison.
    @param {Number} n2 Number to compare against the first.
    @param {Number} lambda The closeness sufficient for a positive result. Default 0.00001
    @returns {Boolean}
  */
  near: function(n1, n2, lambda) {
    if (!lambda) lambda = 0.00001;
    return Math.abs(n1 - n2) <= lambda;
  },
  
  /**
    Rounds a number to a given decimal place. If a negative decimalPlace
    parameter is provided, the number will be rounded outward (ie. providing
    -3 will round to the thousands).
    
    Function is insufficient for high negative values of decimalPlace parameter.
    For example, (123456.789).round(-5) should evaluate to 100000 but instead
    evaluates to 99999.999... 
    
    @param {Number} n The number to round
    @param {Integer} decimalPlace
    @returns {Number}
  */
  round: function(n, decimalPlace) {
    if (!decimalPlace) decimalPlace = 0;
    var factor = Math.pow(10, decimalPlace);
    if (decimalPlace < 0) {
       // stop rounding errors from hurting the factor...
      var s = factor.toString();
      factor = s.substring(0, s.indexOf("1")+1);
    }
    n = n.valueOf();
    return Math.round(n * factor) / factor;
  }
  
}) ;
