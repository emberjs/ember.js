// ==========================================================================
// Project:   SproutCore - JavaScript Application Framework
// Copyright: ©2006-2011 Strobe Inc. and contributors.
//            Portions ©2008-2011 Apple Inc. All rights reserved.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================
/*globals Handlebars */

// TODO: Don't require all of this module
require('sproutcore-handlebars');
require('sproutcore-handlebars/helpers/view');

/**
  @static

  A map of parent tags to their default child tags. You can add
  additional parent tags if you want collection views that use
  a particular parent tag to default to a child tag.

  @type Hash
  @constant
*/
SC.Handlebars.CONTAINER_MAP = {
  ul: 'li',
  ol: 'li',
  table: 'tr',
  thead: 'tr',
  tbody: 'tr',
  tfoot: 'tr',
  tr: 'td'
};

/**
  @name Handlebars.helpers.collection
  @param {String} path
  @param {Hash} options
  @returns {String} HTML string
*/
Handlebars.registerHelper('collection', function(path, options) {
  // If no path is provided, treat path param as options.
  if (path && path.data && path.data.isRenderData) {
    options = path;
    path = undefined;
  }

  var fn = options.fn;
  var data = options.data;
  var inverse = options.inverse;

  // If passed a path string, convert that into an object.
  // Otherwise, just default to the standard class.
  var collectionClass;
  collectionClass = path ? SC.objectForPropertyPath(path) : SC.CollectionView;

  if (!collectionClass) {
    throw new SC.Error("%@ #collection: Could not find %@".fmt(data.view, path));
  }

  var hash = options.hash, itemHash = {}, match;

  // Go through options passed to the {{collection}} helper and extract options
  // that configure item views instead of the collection itself.
  for (var prop in hash) {
    if (hash.hasOwnProperty(prop)) {
      match = prop.match(/^item(.)(.*)$/);

      if(match) {
        // Convert itemShouldFoo -> shouldFoo
        itemHash[match[1].toLowerCase() + match[2]] = hash[prop];
        // Delete from hash as this will end up getting passed to the
        // {{view}} helper method.
        delete hash[prop];
      }
    }
  }

  var tagName = collectionClass.prototype.tagName;
  var childTag = SC.Handlebars.CONTAINER_MAP[tagName];

  if (childTag) {
    itemHash.tagName = itemHash.tagName || childTag;
  }

  if (fn) {
    itemHash.template = fn;
    delete options.fn;
  }

  if (inverse) {
    hash.emptyView = SC.View.extend({
      template: inverse
    });
  }

  if (hash.preserveContext) {
    itemHash.templateContext = function() {
      return this.get('content');
    }.property('content');
    delete hash.preserveContext;
  }

  var itemViewClass = collectionClass.prototype.itemViewClass;
  hash.itemViewClass = SC.Handlebars.ViewHelper.viewClassFromHTMLOptions(itemViewClass, itemHash);

  return Handlebars.helpers.view.call(this, collectionClass, options);
});

/**
  @name Handlebars.helpers.each
  @param {String} path
  @param {Hash} options
  @returns {String} HTML string
*/
Handlebars.registerHelper('each', function(path, options) {
  options.hash.contentBinding = SC.Binding.from('*'+path, this);
  options.hash.contentBinding = SC.Binding.from('*'+path, this).oneWay();
  options.hash.preserveContext = true;
  return Handlebars.helpers.collection.call(this, null, options);
});


