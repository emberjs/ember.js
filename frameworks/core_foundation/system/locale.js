// ==========================================================================
// Project:   SproutCore - JavaScript Application Framework
// Copyright: ©2006-2011 Strobe Inc. and contributors.
//            Portions ©2008-2011 Apple Inc. All rights reserved.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

/**
  The Locale defined information about a specific locale, including date and
  number formatting conventions, and localization strings.  You can define
  various locales by adding them to the SC.locales hash, keyed by language
  and/or country code.

  On page load, the default locale will be chosen based on the current
  languages and saved at SC.Locale.current.  This locale is used for
  localization, etc.

  ## Creating a new locale

  You can create a locale by simply extending the SC.Locale class and adding
  it to the locales hash:

      SC.Locale.locales['en'] = SC.Locale.extend({ .. config .. }) ;

  Alternatively, you could choose to base your locale on another locale by
  extending that locale:

      SC.Locale.locales['en-US'] = SC.Locale.locales['en'].extend({ ... }) ;

  Note that if you do not define your own strings property, then your locale
  will inherit any strings added to the parent locale.  Otherwise you must
  implement your own strings instead.

  @extends SC.Object
  @since SproutCore 1.0
*/
SC.Locale = SC.Object.extend({

  init: function() {
    // make sure we know the name of our own locale.
    if (!this.language) SC.Locale._assignLocales();

    // Make sure we have strings that were set using the new API.  To do this
    // we check to a bool that is set by one of the string helpers.  This
    // indicates that the new API was used. If the new API was not used, we
    // check to see if the old API was used (which places strings on the
    // String class).
    if (!this.hasStrings) {
      var langs = this._deprecatedLanguageCodes || [] ;
      langs.push(this.language);
      var idx = langs.length ;
      var strings = null ;
      while(!strings && --idx >= 0) {
        strings = String[langs[idx]];
      }
      if (strings) {
        this.hasStrings = YES;
        this.strings = strings ;
      }
    }
  },

  /** Set to YES when strings have been added to this locale. */
  hasStrings: NO,

  /** The strings hash for this locale. */
  strings: {},

  /**
    The metrics for this locale.  A metric is a singular value that is usually
    used in a user interface layout, such as "width of the OK button".
  */
  metrics: {},

  toString: function() {
    if (!this.language) SC.Locale._assignLocales() ;
    return "SC.Locale["+this.language+"]"+SC.guidFor(this) ;
  },


  ordinalForNumber: function(number){
    var englishFunction = SC.Locale._numberOrdinalFunctions.en,
      currentFunction = SC.Locale._numberOrdinalFunctions[this.language] || englishFunction;
    return currentFunction(number);
  },

  /**
    Returns the localized version of the string or the string if no match
    was found.

    @param {String} string
    @param {String} optional default string to return instead
    @returns {String}
  */
  locWithDefault: function(string, def) {
    var ret = this.strings[string];

    // strings may be blank, so test with typeOf.
    if (SC.typeOf(ret) === SC.T_STRING) return ret;
    else if (SC.typeOf(def) === SC.T_STRING) return def;
    return string;
  },

  /**
    Returns the localized value of the metric for the specified key, or
    undefined if no match is found.

    @param {String} key
    @returns {Number} ret
  */
  locMetric: function(key) {
    var ret = this.metrics[key];
    if (SC.typeOf(ret) === SC.T_NUMBER) {
      return ret;
    }
    else if (ret === undefined) {
      SC.warn("No localized metric found for key \"" + key + "\"");
      return undefined;
    }
    else {
      SC.warn("Unexpected metric type for key \"" + key + "\"");
      return undefined;
    }
  },

  /**
    Creates and returns a new hash suitable for use as an SC.View’s 'layout'
    hash.  This hash will be created by looking for localized metrics following
    a pattern based on the “base key” you specify.

    For example, if you specify "Button.Confirm", the following metrics will be
    used if they are defined:

      Button.Confirm.left
      Button.Confirm.top
      Button.Confirm.right
      Button.Confirm.bottom
      Button.Confirm.width
      Button.Confirm.height
      Button.Confirm.midWidth
      Button.Confirm.minHeight
      Button.Confirm.centerX
      Button.Confirm.centerY

    Additionally, you can optionally specify a hash which will be merged on top
    of the returned hash.  For example, if you wish to allow a button’s width
    to be configurable per-locale, but always wish for it to be centered
    vertically and horizontally, you can call:

      locLayout("Button.Confirm", {centerX:0, centerY:0})

    …so that you can combine both localized and non-localized elements in the
    returned hash.  (An exception will be thrown if there is a locale-specific
    key that matches a key specific in this hash.)

    @param {String} baseKey
    @param {String} (optional) additionalHash
    @returns {Hash}
  */
  locLayout: function(baseKey, additionalHash) {
    // Note:  In this method we'll directly access this.metrics rather than
    //        going through locMetric() for performance and to avoid
    //        locMetric()'s sanity checks.

    var i, len, layoutKey, key, value,
        layoutKeys = SC.Locale.layoutKeys,
        metrics    = this.metrics,

        // Cache, to avoid repeated lookups
        typeOfFunc = SC.typeOf,
        numberType = SC.T_NUMBER,

        ret        = {};


    // Start off by mixing in the additionalHash; we'll look for collisions with
    // the localized values in the loop below.
    if (additionalHash) SC.mixin(ret, additionalHash);


    // For each possible key that can be included in a layout hash, see whether
    // we have a localized value.
    for (i = 0, len = layoutKeys.length;  i < len;  ++i) {
      layoutKey = layoutKeys[i];
      key       = baseKey + "." + layoutKey;
      value     = metrics[key];

      if (typeOfFunc(value) === numberType) {
        // We have a localized value!  As a sanity check, if the caller
        // specified an additional hash and it has the same key, we'll throw an
        // error.
        if (additionalHash  &&  additionalHash[layoutKey]) {
          throw new Error("locLayout():  There is a localized value for the key '" + key + "' but a value for '" + layoutKey + "' was also specified in the non-localized hash");
        }

        ret[layoutKey] = value;
      }
    }

    return ret;
  }

}) ;

SC.Locale.mixin(/** @scope SC.Locale */ {

  /**
    If YES, localization will favor the detected language instead of the
    preferred one.
  */
  useAutodetectedLanguage: NO,

  /**
    This property is set by the build tools to the current build language.
  */
  preferredLanguage: null,

  /**
    This property holds all attributes name which can be used for a layout hash
    (for an SC.View).  These are what we support inside the layoutFor() method.
  */
  layoutKeys: ['left', 'top', 'right', 'bottom', 'width', 'height',
               'minWidth', 'minHeight', 'centerX', 'centerY'],

  /**
    Invoked at the start of SproutCore's document onready handler to setup
    the currentLocale.  This will use the language properties you have set on
    the locale to make a decision.
  */
  createCurrentLocale: function() {
    // get values from String if defined for compatibility with < 1.0 build
    // tools.
    var autodetect = (String.useAutodetectedLanguage !== undefined) ? String.useAutodetectedLanguage : this.useAutodetectedLanguage;
    var preferred = (String.preferredLanguage !== undefined) ? String.preferredLanguage : this.preferredLanguage ;


    // determine the language
    var lang = ((autodetect) ? SC.browser.language : null) || preferred || SC.browser.language || 'en';
    lang = SC.Locale.normalizeLanguage(lang) ;
    // get the locale class.  If a class cannot be found, fall back to generic
    // language then to english.
    var klass = this.localeClassFor(lang) ;

    // if the detected language does not match the current language (or there
    // is none) then set it up.
    if (lang != this.currentLanguage) {
      this.currentLanguage = lang ; // save language
      this.currentLocale = klass.create(); // setup locale
    }
    return this.currentLocale ;
  },

  /**
    Finds the locale class for the names language code or creates on based on
    its most likely parent.
  */
  localeClassFor: function(lang) {
    lang = SC.Locale.normalizeLanguage(lang) ;
    var parent, klass = this.locales[lang];

    // if locale class was not found and there is a broader-based locale
    // present, create a new locale based on that.
    if (!klass && ((parent = lang.split('-')[0]) !== lang) && (klass = this.locales[parent])) {
      klass = this.locales[lang] = klass.extend() ;
    }

    // otherwise, try to create a new locale based on english.
    if (!klass) klass = this.locales[lang] = this.locales.en.extend();

    return klass;
  },

  /**
    Shorthand method to define the settings for a particular locale.
    The settings you pass here will be applied directly to the locale you
    designate.

    If you are already holding a reference to a locale definition, you can
    also use this method to operate on the receiver.

    If the locale you name does not exist yet, this method will create the
    locale for you, based on the most closely related locale or english.  For
    example, if you name the locale 'fr-CA', you will be creating a locale for
    French as it is used in Canada.  This will be based on the general French
    locale (fr), since that is more generic.  On the other hand, if you create
    a locale for mandarin (cn), it will be based on generic english (en)
    since there is no broader language code to match against.

    @param {String} localeName
    @param {Hash} options
    @returns {SC.Locale} the defined locale
  */
  define: function(localeName, options) {
    var locale ;
    if (options===undefined && (SC.typeOf(localeName) !== SC.T_STRING)) {
      locale = this; options = localeName ;
    } else locale = SC.Locale.localeClassFor(localeName) ;
    SC.mixin(locale.prototype, options) ;
    return locale ;
  },

  /**
    Gets the current options for the receiver locale.  This is useful for
    inspecting registered locales that have not been instantiated.

    @returns {Hash} options + instance methods
  */
  options: function() { return this.prototype; },

  /**
    Adds the passed hash of strings to the locale's strings table.  Note that
    if the receiver locale inherits its strings from its parent, then the
    strings table will be cloned first.

    @returns {Object} receiver
  */
  addStrings: function(stringsHash) {
    // make sure the target strings hash exists and belongs to the locale
    var strings = this.prototype.strings ;
    if (strings) {
      if (!this.prototype.hasOwnProperty('strings')) {
        strings = this.prototype.strings = SC.clone(strings) ;
      }
    } else strings = this.prototype.strings = {} ;

    // add strings hash
    if (stringsHash)  this.prototype.strings = SC.mixin(strings, stringsHash) ;
    this.prototype.hasStrings = YES ;
    return this;
  },

  /**
    Adds the passed hash of metrics to the locale's metrics table, much as
    addStrings() is used to add in strings.   Note that if the receiver locale
    inherits its metrics from its parent, then the metrics table will be cloned
    first.

    @returns {Object} receiver
  */
  addMetrics: function(metricsHash) {
    // make sure the target metrics hash exists and belongs to the locale
    var metrics = this.prototype.metrics;
    if (metrics) {
      if (!this.prototype.hasOwnProperty(metrics)) {
        metrics = this.prototype.metrics = SC.clone(metrics) ;
      }
    }
    else {
      metrics = this.prototype.metrics = {} ;
    }

    // add metrics hash
    if (metricsHash) this.prototype.metrics = SC.mixin(metrics, metricsHash);

    // Note:  We don't need the equivalent of this.hasStrings here, because we
    //        are not burdened by an older API to look for like the strings
    //        support is.

    return this;
  },

  _map: { english: 'en', french: 'fr', german: 'de', japanese: 'ja', jp: 'ja', spanish: 'es' },

  /**
    Normalizes the passed language into a two-character language code.
    This method allows you to specify common languages in their full english
    name (i.e. English, French, etc). and it will be treated like their two
    letter code equivalent.

    @param {String} languageCode
    @returns {String} normalized code
  */
  normalizeLanguage: function(languageCode) {
    if (!languageCode) return 'en' ;
    return SC.Locale._map[languageCode.toLowerCase()] || languageCode ;
  },

  // this method is called once during init to walk the installed locales
  // and make sure they know their own names.
  _assignLocales: function() {
    for(var key in this.locales) this.locales[key].prototype.language = key;
  },

  toString: function() {
    if (!this.prototype.language) SC.Locale._assignLocales() ;
    return "SC.Locale["+this.prototype.language+"]" ;
  },

  // make sure important properties are copied to new class.
  extend: function() {
    var ret= SC.Object.extend.apply(this, arguments) ;
    ret.addStrings= SC.Locale.addStrings;
    ret.define = SC.Locale.define ;
    ret.options = SC.Locale.options ;
    ret.toString = SC.Locale.toString ;
    return ret ;
  },

  /**
   * Contains the ordinal functions for each language, these functions are
   * expected to take a number as the type and return a string
   *
   *
   */
  _numberOrdinalFunctions: {

    en: function(number) {
      var d = number % 10;
      return (~~ (number % 100 / 10) === 1) ? 'th' :
             (d === 1) ? 'st' :
             (d === 2) ? 'nd' :
             (d === 3) ? 'rd' : 'th';
    }

  }

}) ;

/**
  This locales hash contains all of the locales defined by SproutCore and
  by your own application.  See the SC.Locale class definition for the
  various properties you can set on your own locales.

  @type Hash
*/
SC.Locale.locales = {
  en: SC.Locale.extend({ _deprecatedLanguageCodes: ['English'] }),
  fr: SC.Locale.extend({ _deprecatedLanguageCodes: ['French'] }),
  de: SC.Locale.extend({ _deprecatedLanguageCodes: ['German'] }),
  ja: SC.Locale.extend({ _deprecatedLanguageCodes: ['Japanese', 'jp'] }),
  es: SC.Locale.extend({ _deprecatedLanguageCodes: ['Spanish'] })
};


/**
  This special helper will store the strings you pass in the locale matching
  the language code.  If a locale is not defined from the language code you
  specify, then one will be created for you with the english locale as the
  parent.

  @param {String} languageCode
  @param {Hash} strings
  @returns {Object} receiver
*/
SC.stringsFor = function(languageCode, strings) {
  // get the locale, creating one if needed.
  var locale = SC.Locale.localeClassFor(languageCode);
  locale.addStrings(strings) ;
  return this ;
} ;

/**
  Just like SC.stringsFor, but for metrics.

  @param {String} languageCode
  @param {Hash} metrics
  @returns {Object} receiver
*/
SC.metricsFor = function(languageCode, metrics) {
  var locale = SC.Locale.localeClassFor(languageCode);
  locale.addMetrics(metrics);
  return this;
};
