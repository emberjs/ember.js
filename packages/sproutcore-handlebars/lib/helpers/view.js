// ==========================================================================
// Project:   SproutCore Handlebar Views
// Copyright: ©2011 Strobe Inc. and contributors.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================
/*globals Handlebars sc_assert */

// TODO: Don't require the entire module
require("sproutcore-handlebars");

var get = SC.get, set = SC.set;

/** @private */
SC.Handlebars.ViewHelper = SC.Object.create({
  
  viewClassFromHTMLOptions: function(viewClass, options) {
    var extensions = {},
        classes = options['class'],
        dup = false;

    if (options.id) {
      extensions.elementId = options.id;
      dup = true;
    }

    if (classes) {
      classes = classes.split(' ');
      extensions.classNames = classes;
      dup = true;
    }

    if (options.classBinding) {
      extensions.classNameBindings = options.classBinding.split(' ');
      dup = true;
    }

    if (dup) {
      options = jQuery.extend({}, options);
      delete options.id;
      delete options['class'];
      delete options.classBinding;
    }

    return viewClass.extend(options, extensions);
  },

  helper: function(thisContext, path, options) {
    var inverse = options.inverse,
        data = options.data,
        view = data.view,
        fn = options.fn,
        hash = options.hash,
        newView;

    if ('string' === typeof path) {
      newView = SC.getPath(thisContext, path);
      if (!newView) { 
        throw new SC.Error("Unable to find view at path '" + path + "'"); 
      }
    } else {
      sc_assert('You must pass a string or a view class to the #view helper', SC.View.detect(path));
      newView = path;
    }

    sc_assert("Null or undefined object was passed to the #view helper. Did you mean to pass a property path string?", !!newView);

    newView = this.viewClassFromHTMLOptions(newView, hash);
    var currentView = data.view;
    var viewOptions = {};
    if (fn) { viewOptions.template = fn; }

    currentView.appendChild(newView, viewOptions);
  }
});

/**
  @name Handlebars.helpers.view
  @param {String} path
  @param {Hash} options
  @returns {String} HTML string
*/
Handlebars.registerHelper('view', function(path, options) {
  // If no path is provided, treat path param as options.
  if (path && path.data && path.data.isRenderData) {
    options = path;
    path = "SC.View";
  }

  return SC.Handlebars.ViewHelper.helper(this, path, options);
});

