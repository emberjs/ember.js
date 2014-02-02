// ==========================================================================
// Project:   SproutCore - JavaScript Application Framework
// Copyright: ©2006-2009 Sprout Systems, Inc. and contributors.
//            Portions ©2008-2011 Apple Inc. All rights reserved.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

sc_require('render_delegates/render_delegate');

SC.RenderDelegate.reopen({
  /**
    A list of size names to look for when automatically determining
    control size. By default, this has all of the SproutCore control sizes.
  */
  sizes: [
    SC.TINY_CONTROL_SIZE, SC.SMALL_CONTROL_SIZE,
    SC.REGULAR_CONTROL_SIZE, SC.LARGE_CONTROL_SIZE,
    SC.HUGE_CONTROL_SIZE, SC.JUMBO_CONTROL_SIZE
  ],

  /**
    Determines the correct size for the given data source, and returns the
    hash, if any, representing it.
   
    The hashes to choose from are properties on the render delegate. You define
    them with the same name as you would use for styling. For example,
    SC.REGULAR_CONTROL_SIZE uses a property name 'sc-regular-size':
   
        SC.RenderDelegate.create({
          'sc-regular-size': {
            // my properties here
          }
   
    If no matching size is found, the hash (if any) for SC.REGULAR_CONTROL_SIZE
    will be returned.
   
    @param {DataSource} dataSource The data source in which to find `controlSize`
    or `frame` and to determine the size for.
   
    @returns {Hash undefined}
  */
  sizeFor: function(dataSource) {
    var controlSize = dataSource.get('controlSize'), size, idx, len;

    // if there is a control size set on the control
    // then we need to use it, and give an error if we
    // don't have it.
    if (controlSize) {
      if (!this[controlSize]) {
        // create a hash for the control size
        this[controlSize] = {};
      }

      size = this[controlSize];

      // make sure there's a name on the size for use as class name
      if (!size.name) {
        size.name = controlSize;
      }

      return size;
    }

    // try to determine control size for the supplied frame
    // TODO: cache this in dataSource.renderState
    var frame = dataSource.get('frame');
    if (!frame) {
      size = this['sc-regular-size'];

      // create the size hash if needed
      if (!size) { size = this['sc-regular-size'] = {}; }
      if (!size.name) { size.name = 'sc-regular-size'; }
      return size;
    }

    // loop to automatically find size
    for (idx = 0; idx < len; idx++) {
      key = sizes[idx];
      size = this[key];

      // when the size is not defined, skip it.
      if (!size) {
        continue;
      }

      if (
        // if no auto-size-selection params are supplied, then we cannot
        // automatically select a size...
        (
          size.width === undefined && size.height === undefined && 
          size.minHeight === undefined && size.minWidth === undefined &&
          size.maxHeight === undefined && size.maxWidth === undefined
        ) ||

        // otherwise, if any are defined and are non-equal
        (size.width !== undefined && frame.width !== size.width) ||
        (size.minWidth !== undefined && frame.width < size.minWidth) ||
        (size.maxWidth !== undefined && frame.width > size.maxWidth) ||

        (size.height !== undefined && frame.height !== size.height) ||
        (size.minHeight !== undefined && frame.height < size.minHeight) ||
        (size.maxHeight !== undefined && frame.height < size.maxHeight)
      ) {
        continue;
      }

      // the size needs a name to use as a class name. If one is not already
      // present, set it to the key.
      if (!size.name) {
        size.name = key;
      }

      return size;
    }

    // hardcoded to return regular size if defined
    size = this['sc-regular-size'];

    // create the size hash if needed
    if (!size) { size = this['sc-regular-size'] = {}; }
    if (!size.name) { size.name = 'sc-regular-size'; }


    return size;
  },

  /**
    Determines the proper size for the dataSource, and then renders the class
    name corresponding to that size.
  */
  addSizeClassName: function(dataSource, context) {
    var size = this.sizeFor(dataSource);
    if (size) {
      context.addClass(size.name);
    }
  },

  /**
    Determines the proper size for the dataSource, and then updates
    the DOM to include that size's class name.
  */
  updateSizeClassName: function(dataSource, jquery) {
    var size = this.sizeFor(dataSource);
    if (size) {
      jquery.addClass(size.name);
    }
  },

  /**
    Retrieves the given property for the specified data source. This property
    may be static, or may be computed specifically for this data source. This
    version fo `getPropertyFor` will check in your size hashes to see if any
    properties have been overridden.
    
    @param {DataSource} dataSource The data source to get the property
    for. Some properties may differ based on the data source; for instance,
    some may have different values depending on size.
    @param {String} propertyName The name of the property to retrieve.
  */
  getPropertyFor: function(dataSource, propertyName) {
    var size = this.sizeFor(dataSource);
    if (size) {
      if (size[propertyName + 'For']) {
        return size[propertyName + 'For'](dataSource, propertyName);
      } else if (size[propertyName] !== undefined) {
        return size[propertyName];
      }
    }

    if (this[propertyName + 'For']) {
      return this[propertyName + 'For'];
    }

    return this[propertyName];
  }
});
