// ==========================================================================
// Project:   SproutCore - JavaScript Application Framework
// Copyright: ©2006-2011 Strobe Inc. and contributors.
//            Portions ©2008-2011 Apple Inc. All rights reserved.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

sc_require('css/css_rule') ;

/**
  @class SC.CSSStyleSheet

  A style sheet object wraps a document style sheet object. `C.CSSStyleSheet`
  will re-use stylesheet objects as needed.

  @extends SC.Object
*/
SC.CSSStyleSheet = SC.Object.extend(
/** @scope SC.CSSStyleSheet.prototype */ {

  init: function() {
    sc_super() ;

    var ss = this.styleSheet ;
    if (!ss) {
      // create the stylesheet object the hard way (works everywhere)
      ss = this.styleSheet = document.createElement('style') ;
      ss.type = 'text/css' ;
      var head = document.getElementsByTagName('head')[0] ;
      if (!head) head = document.documentElement ; // fix for Opera
      head.appendChild(ss) ;
    }

    // cache this object for later
    var ssObjects = this.constructor.styleSheets ;
    if (!ssObjects) ssObjects = this.constructor.styleSheets = {} ;
    ssObjects[SC.guidFor(ss)] ;

    // create rules array
    var rules = ss.rules || SC.EMPTY_ARRAY ;
    var array = SC.SparseArray.create(rules.length) ;
    array.delegate = this ;
    this.rules = array ;

    return this ;
  },

  /**
    @type Boolean YES if the stylesheet is enabled.
  */
  isEnabled: function(key, val) {
    if (val !== undefined) {
      this.styleSheet.disabled = !val ;
    }
    return !this.styleSheet.disabled ;
  }.property(),
  isEnabledBindingDefault: SC.Binding.bool(),

  /**
    **DO NOT MODIFY THIS OBJECT DIRECTLY!!!!** Use the methods defined on this
    object to update properties of the style sheet; otherwise, your changes
    will not be reflected.

    @type CSSStyleSheet RO
  */
  styleSheet: null,

  /**
    @type String
  */
  href: function(key, val) {
    if (val !== undefined) {
      this.styleSheet.href = val ;
    }
    else return this.styleSheet.href ;
  }.property(),

  /**
    @type String
  */
  title: function(key, val) {
    if (val !== undefined) {
      this.styleSheet.title = val ;
    }
    else return this.styleSheet.title ;
  }.property(),

  /**
    @type SC.Array contains SC.CSSRule objects
  */
  rules: null,

  /**
    You can also insert and remove rules on the rules property array.
  */
  insertRule: function(rule) {
    var rules = this.get('rules') ;
  },

  /**
    You can also insert and remove rules on the rules property array.
  */
  deleteRule: function(rule) {
    var rules = this.get('rules') ;
    rules.removeObject(rule) ;
  },

  // TODO: implement a destroy method

  /**
    @private

    Invoked by the sparse array whenever it needs a particular index
    provided.  Provide the content for the index.
  */
  sparseArrayDidRequestIndex: function(array, idx) {
    // sc_assert(this.rules === array) ;
    var rules = this.styleSheet.rules || SC.EMPTY_ARRAY ;
    var rule = rules[idx] ;
    if (rule) {
      array.provideContentAtIndex(idx, SC.CSSRule.create({
        rule: rule,
        styleSheet: this
      }));
    }
  },

  /** @private synchronize the browser's rules array with our own */
  sparseArrayDidReplace: function(array, idx, amt, objects) {
    var cssRules = objects.collect(function(obj) { return obj.rule; }) ;
    this.styleSheet.rules.replace(idx, amt, cssRules) ;
  }

});

SC.mixin(SC.CSSStyleSheet,
/** SC.CSSStyleSheet */{

  /**
    Find a stylesheet object by name or href. If by name, `.css` will be
    appended automatically.

        var ss = SC.CSSStyleSheet.find('style.css') ;
        var ss2 = SC.CSSStyleSheet.find('style') ; // same thing
        sc_assert(ss === ss2) ; // SC.CSSStyleSheet objects are stable

    @param {String} nameOrUrl a stylesheet name or href to find
    @returns {SC.CSSStyleSheet} null if not found
  */
  find: function(nameOrUrl) {
    var isUrl = nameOrUrl ? nameOrUrl.indexOf('/') >= 0 : NO ;

    if (!nameOrUrl) return null ; // no name or url? fail!

    if (!isUrl && nameOrUrl.indexOf('.css') == -1) {
      nameOrUrl = nameOrUrl + '.css' ;
    }

    // initialize styleSheet cache
    var ssObjects = this.styleSheets ;
    if (!ssObjects) ssObjects = this.styleSheets = {} ;

    var styleSheets = document.styleSheets ;
    var ss, ssName, ssObject, guid ;
    for (var idx=0, len=styleSheets.length; idx < len; ++idx) {
      ss = styleSheets[idx] ;
      if (isUrl) {
        if (ss.href === nameOrUrl) {
          guid = SC.guidFor(ss) ;
          ssObject = ssObjects[guid] ;
          if (!ssObject) {
            // cache for later
            ssObject = ssObjects[guid] = this.create({ styleSheet: ss }) ;
          }
          return ssObject ;
        }
      }
      else {
        if (ssName = ss.href) {
          ssName = ssName.split('/') ; // break up URL
          ssName = ssName[ssName.length-1] ; // get last component
          if (ssName == nameOrUrl) {
            guid = SC.guidFor(ss) ;
            ssObject = ssObjects[guid] ;
            if (!ssObject) {
              // cache for later
              ssObject = ssObjects[guid] = this.create({ styleSheet: ss }) ;
            }
            return ssObject ;
          }
        }
      }
    }
    return null ; // stylesheet not found
  },

  styleSheets: null

});
