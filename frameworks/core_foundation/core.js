// ==========================================================================
// Project:   SproutCore - JavaScript Application Framework
// Copyright: ©2006-2011 Strobe Inc. and contributors.
//            Portions ©2008-2011 Apple Inc. All rights reserved.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

/**
  Indicates that the collection view expects to accept a drop ON the specified
  item.

  @type Number
*/
SC.DROP_ON = 0x01 ;

/**
  Indicates that the collection view expects to accept a drop BEFORE the
  specified item.

  @type Number
*/
SC.DROP_BEFORE = 0x02 ;

/**
  Indicates that the collection view expects to accept a drop AFTER the
  specified item.  This is treated just like SC.DROP_BEFORE is most views
  except for tree lists.

  @type Number
*/
SC.DROP_AFTER = 0x04 ;

/**
  Indicates that the collection view want's to know which operations would
  be allowed for either drop operation.

  @type Number
*/
SC.DROP_ANY = 0x07 ;

/**
  Indicates that the content should be aligned to the left.
*/
SC.ALIGN_LEFT = 'left';

/**
  Indicates that the content should be aligned to the right.
*/
SC.ALIGN_RIGHT = 'right';

/**
  Indicates that the content should be aligned to the center.
*/
SC.ALIGN_CENTER = 'center';

/**
  Indicates that the content should be aligned to the top.
*/
SC.ALIGN_TOP = 'top';

/**
  Indicates that the content should be aligned to the middle.
*/
SC.ALIGN_MIDDLE = 'middle';

/**
  Indicates that the content should be aligned to the bottom.
*/
SC.ALIGN_BOTTOM = 'bottom';

/**
  Indicates that the content should be aligned to the top and left.
*/
SC.ALIGN_TOP_LEFT = 'top-left';

/**
  Indicates that the content should be aligned to the top and right.
*/
SC.ALIGN_TOP_RIGHT = 'top-right';

/**
  Indicates that the content should be aligned to the bottom and left.
*/
SC.ALIGN_BOTTOM_LEFT = 'bottom-left';

/**
  Indicates that the content should be aligned to the bottom and right.
*/
SC.ALIGN_BOTTOM_RIGHT = 'bottom-right';


SC.mixin(/** @lends SC */ {

  /**
    Reads or writes data from a global cache.  You can use this facility to
    store information about an object without actually adding properties to
    the object itself.  This is needed especially when working with DOM,
    which can leak easily in IE.

    To read data, simply pass in the reference element (used as a key) and
    the name of the value to read.  To write, also include the data.

    You can also just pass an object to retrieve the entire cache.

    @param elem {Object} An object or Element to use as scope
    @param name {String} Optional name of the value to read/write
    @param data {Object} Optional data.  If passed, write.
    @returns {Object} the value of the named data
  */
  data: $.data,

  /**
    Removes data from the global cache.  This is used throughout the
    framework to hold data without creating memory leaks.

    You can remove either a single item on the cache or all of the cached
    data for an object.

    @param elem {Object} An object or Element to use as scope
    @param name {String} optional name to remove.
    @returns {Object} the value or cache that was removed
  */
  removeData: $.removeData,

  // ..........................................................
  // LOCALIZATION SUPPORT
  //

  /**
    Known loc strings

    @type Hash
  */
  STRINGS: {},

  /**
    This is a simplified handler for installing a bunch of strings.  This
    ignores the language name and simply applies the passed strings hash.

    @param {String} lang the language the strings are for
    @param {Hash} strings hash of strings
    @returns {SC} The receiver, useful for chaining calls to the same object.
  */
  stringsFor: function(lang, strings) {
    SC.mixin(SC.STRINGS, strings);
    return this ;
  }

}) ;
