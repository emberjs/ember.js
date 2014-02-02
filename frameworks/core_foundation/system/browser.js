// ==========================================================================
// Project:   SproutCore - JavaScript Application Framework
// Copyright: ©2006-2011 Strobe Inc. and contributors.
//            Portions ©2008-2011 Apple Inc. All rights reserved.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================


SC.mixin(SC.browser,
/** @scope SC.browser */ {

  /* @private Internal property for the cache of pre-determined experimental names. */
  _cachedNames: null,

  /* @private Internal property for the test element used for style testing. */
  _testEl: null,

  /** @private */
  _testSupportFor: function (target, propertyName, testValue) {
    /*jshint eqnull:true*/
    var ret = target[propertyName] != null,
      originalValue;

    if (testValue != null) {
      originalValue = target[propertyName];
      target[propertyName] = testValue;
      ret = target[propertyName] === testValue;
      target[propertyName] = originalValue;
    }

    return ret;
  },

  /**
    Version Strings should not be compared against Numbers.  For example,
    the version "1.20" is greater than "1.2" and less than "1.200", but as
    Numbers, they are all 1.2.

    Pass in one of the browser versions: SC.browser.version,
    SC.browser.engineVersion or SC.browser.osVersion and a String to compare
    against.  The function will split each version on the decimals and compare
    the parts numerically.

    Examples:

      SC.browser.compare('1.20', '1.2') == 18
      SC.browser.compare('1.08', '1.8') == 0
      SC.browser.compare('1.1.1', '1.1.004') == -3

    @param {String} version One of SC.browser.version, SC.browser.engineVersion or SC.browser.osVersion
    @param {String} other The version to compare against.
    @returns {Number} The difference between the versions at the first difference.
  */
  compare: function (version, other) {
    var coerce,
        parts,
        tests;

    // Ensure that the versions are Strings.
    if (typeof version === 'number' || typeof other === 'number') {
      //@if(debug)
      SC.warn('Developer Warning: SC.browser.compare(): Versions compared against Numbers may not provide accurate results.  Use a String of decimal separated Numbers instead.');
      //@endif
      version = String(version);
      other = String(other);
    }

    // This function transforms the String to a Number or NaN
    coerce = function (part) {
      return Number(part.match(/^[0-9]+/));
    };

    parts = SC.A(version.split('.')).map(coerce);
    tests = SC.A(other.split('.')).map(coerce);

    // Test each part stopping when there is a difference.
    for (var i = 0; i < tests.length; i++) {
      var check = parts[i] - tests[i];
      if (isNaN(check)) return 0;
      if (check !== 0) return check;
    }

    return 0;
  },

  /**
    @deprecated Since 1.7. Use SC.browser.compare(version, otherVersion) instead.

    Pass any number of arguments, and this will check them against the browser
    version split on ".".  If any of them are not equal, return the inequality.
    If as many arguments as were passed in are equal, return 0.  If something
    is NaN, return 0.
  */

  // Deprecation Note:
  //
  // This function forces the comparison against the value of
  // SC.browser.version, but the old value of SC.browser.version would
  // occasionally be the browser's version or the layout engine's version,
  // which could cause unexpected results.  As well, there was no way to
  // compare the actual browser version or OS version.
  compareVersion: function () {
    //@if(debug)
    SC.warn('Developer Warning: SC.browser.compareVersion() has been deprecated.  Please ' +
        'use SC.browser.compare() instead.  Example: ' +
        'SC.browser.compareVersion(16,0,912) < 0 becomes ' +
        'SC.browser.compare(SC.browser.engineVersion, \'16.0.912\').');
    //@endif

    if (this._versionSplit === undefined) {
      var coerce = function (part) {
        return Number(part.match(/^[0-9]+/));
      };
      this._versionSplit = SC.A(this.version.split('.')).map(coerce);
    }

    var tests = SC.A(arguments).map(Number);
    for (var i = 0; i < tests.length; i++) {
      var check = this._versionSplit[i] - tests[i];
      if (isNaN(check)) return 0;
      if (check !== 0) return check;
    }

    return 0;
  },


  /**
    This simple method allows you to more safely use experimental properties and
    methods in current and future browsers.

    Using browser specific methods and properties is a risky coding practice.
    With sufficient testing, you may be able to match prefixes to today's
    browsers, but this is prone to error and not future proof.  For instance,
    if a property becomes standard and the browser drops the prefix, your code
    could suddenly stop working.

    Instead, use SC.browser.experimentalNameFor(target, standardName), which
    will check the existence of the standard name on the target and if not found
    will try different camel-cased versions of the name with the current
    browser's prefix appended.

    If it is still not found, SC.UNSUPPORTED will be returned, allowing
    you a chance to recover from the lack of browser support.

    Note that `experimentalNameFor` is not really meant for determining browser
    support, only to ensure that using browser prefixed properties and methods
    is safe.  Instead, SC.platform provides several properties that can be used
    to determine support for a certain platform feature, which should be
    used before calling `experimentalNameFor` to safely use the feature.

    For example,

        // Checks for IndexedDB support first on the current platform.
        if (SC.platform.supportsIndexedDB) {
          var db = window.indexedDB,
            // Example return values: 'getDatabaseNames', 'webkitGetDatabaseNames', 'MozGetDatabaseNames', SC.UNSUPPORTED.
            getNamesMethod = SC.browser.experimentalNameFor(db, 'getDatabaseNames'),
            names;

            if (getNamesMethod === SC.UNSUPPORTED) {
              // Work without it.
            } else {
              names = db[getNamesMethod](...);
            }
        } else {
          // Work without it.
        }

    ## Improving deduction
    Occasionally a target will appear to support a property, but will fail to
    actually accept a value.  In order to ensure that the property doesn't just
    exist but is also usable, you can provide an optional `testValue` that will
    be temporarily assigned to the target to verify that the detected property
    is usable.

    @param {Object} target The target for the method.
    @param {String} standardName The standard name of the property or method we wish to check on the target.
    @param {String} [testValue] A value to temporarily assign to the property.
    @returns {string} The name of the property or method on the target or SC.UNSUPPORTED if no method found.
  */
  experimentalNameFor: function (target, standardName, testValue) {
    var cachedNames = this._cachedNames,
      targetGuid = SC.guidFor(target);

    // Fast path & cache initialization.
    if (!cachedNames) {
      cachedNames = this._cachedNames = {};
      cachedNames[targetGuid] = {};
    } else if (!cachedNames[targetGuid]) {
      cachedNames[targetGuid] = {};
    } else if (cachedNames[targetGuid][standardName]) {
      return cachedNames[targetGuid][standardName];
    }

    // Test the property name.
    var ret = standardName;

    // ex. window.indexedDB.getDatabaseNames
    if (!this._testSupportFor(target, ret, testValue)) {
      // ex. window.WebKitCSSMatrix
      ret = SC.browser.classPrefix + standardName.capitalize();
      if (!this._testSupportFor(target, ret, testValue)) {
        // No need to check if the prefix is the same for properties and classes
        if (SC.browser.domPrefix === SC.browser.classPrefix) {
          // Always show a warning so that production usage information has a
          // better chance of filtering back to the developer(s).
          SC.warn("SC.browser.experimentalNameFor(): target, %@, does not have property `%@` or `%@`.".fmt(target, standardName, ret));
          ret = SC.UNSUPPORTED;
        } else {
          // ex. window.indexedDB.webkitGetDatabaseNames
          ret = SC.browser.domPrefix + standardName.capitalize();
          if (!this._testSupportFor(target, ret, testValue)) {
            // Always show a warning so that production usage information has a
            // better chance of filtering back to the developer(s).
            SC.warn("SC.browser.experimentalNameFor(): target, %@, does not have property `%@`, '%@' or `%@`.".fmt(target, standardName, SC.browser.classPrefix + standardName.capitalize(), ret));
            ret = SC.UNSUPPORTED;
          }
        }
      }
    }

    // Cache the experimental property name (even SC.UNSUPPORTED) for quick repeat access.
    cachedNames[targetGuid][standardName] = ret;

    return ret;
  },

  /**
    This method returns safe style names for current and future browsers.

    Using browser specific style prefixes is a risky coding practice.  With
    sufficient testing, you may be able to match styles across today's most
    popular browsers, but this is a lot of work and not future proof.  For
    instance, if a browser drops the prefix and supports the standard style
    name, your code will suddenly stop working.  This happens ALL the time!

    Instead, use SC.browser.experimentalStyleNameFor(standardStyleName), which
    will test support for the standard style name and if not found will try the
    prefixed version with the current browser's prefix appended.

    Note: the proper style name is only determined once per standard style
    name tested and then cached.  Therefore, calling experimentalStyleNameFor
    repeatedly has no performance detriment.

    For example,

        var boxShadowName = SC.browser.experimentalStyleNameFor('boxShadow'),
          el = document.createElement('div');

        // `boxShadowName` may be "boxShadow", "WebkitBoxShadow", "msBoxShadow", etc. depending on the browser support.
        el.style[boxShadowName] = "rgb(0,0,0) 0px 3px 5px";

    ## Improving deduction
    Occasionally a browser will appear to support a style, but will fail to
    actually accept a value.  In order to ensure that the style doesn't just
    exist but is also usable, you can provide an optional `testValue` that will
    be used to verify that the detected style is usable.

    @param {string} standardStyleName The standard name of the experimental style as it should be un-prefixed.  This is the DOM property name, which is camel-cased (ex. boxShadow)
    @param {String} [testValue] A value to temporarily assign to the style to ensure support.
    @returns {string} Future-proof style name for use in the current browser or SC.UNSUPPORTED if no style support found.
  */
  experimentalStyleNameFor: function (standardStyleName, testValue) {
    // Test the style name.
    var el = this._testEl;

    // Create a test element and cache it for repeated use.
    if (!el) { el = this._testEl = document.createElement("div"); }

    return this.experimentalNameFor(el.style, standardStyleName, testValue);
  },

  /**
    This method returns safe CSS attribute names for current and future browsers.

    Using browser specific CSS prefixes is a risky coding practice.  With
    sufficient testing, you may be able to match attributes across today's most
    popular browsers, but this is a lot of work and not future proof.  For
    instance, if a browser drops the prefix and supports the standard CSS
    name, your code will suddenly stop working.  This happens ALL the time!

    Instead, use SC.browser.experimentalCSSNameFor(standardCSSName), which
    will test support for the standard CSS name and if not found will try the
    prefixed version with the current browser's prefix appended.

    Note: the proper CSS name is only determined once per standard CSS
    name tested and then cached.  Therefore, calling experimentalCSSNameFor
    repeatedly has no performance detriment.

    For example,

        var boxShadowCSS = SC.browser.experimentalCSSNameFor('box-shadow'),
          el = document.createElement('div');

        // `boxShadowCSS` may be "box-shadow", "-webkit-box-shadow", "-ms-box-shadow", etc. depending on the current browser.
        el.style.cssText = boxShadowCSS + " rgb(0,0,0) 0px 3px 5px";

    ## Improving deduction
    Occasionally a browser will appear to support a style, but will fail to
    actually accept a value.  In order to ensure that the style doesn't just
    exist but is also usable, you can provide an optional `testValue` that will
    be used to verify that the detected style is usable.

    @param {string} standardCSSName The standard name of the experimental CSS attribute as it should be un-prefixed (ex. box-shadow).
    @param {String} [testValue] A value to temporarily assign to the style to ensure support.
    @returns {string} Future-proof CSS name for use in the current browser or SC.UNSUPPORTED if no style support found.
  */
  experimentalCSSNameFor: function (standardCSSName, testValue) {
    var ret = standardCSSName,
      standardStyleName = standardCSSName.camelize(),
      styleName = this.experimentalStyleNameFor(standardStyleName, testValue);

    if (styleName === SC.UNSUPPORTED) {
      ret = SC.UNSUPPORTED;
    } else if (styleName !== standardStyleName) {
      // If the DOM property is prefixed, then the CSS name should be prefixed.
      ret = SC.browser.cssPrefix + standardCSSName;
    }

    return ret;
  }

});
