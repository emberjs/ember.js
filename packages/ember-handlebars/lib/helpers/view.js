// ==========================================================================
// Project:   Ember Handlebar Views
// Copyright: ©2011 Strobe Inc. and contributors.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================
/*globals Handlebars ember_assert */

// TODO: Don't require the entire module
require("ember-handlebars");

var get = Ember.get, set = Ember.set;
var indexOf = Ember.ArrayUtils.indexOf;
var PARENT_VIEW_PATH = /^parentView\./;
var EmberHandlebars = Ember.Handlebars;

/** @private */
EmberHandlebars.ViewHelper = Ember.Object.create({

  viewClassFromHTMLOptions: function(viewClass, options, thisContext) {
    var hash = options.hash, data = options.data;
    var extensions = {},
        classes = hash['class'],
        dup = false;

    if (hash.id) {
      extensions.elementId = hash.id;
      dup = true;
    }

    if (classes) {
      classes = classes.split(' ');
      extensions.classNames = classes;
      dup = true;
    }

    if (hash.classBinding) {
      extensions.classNameBindings = hash.classBinding.split(' ');
      dup = true;
    }

    if (hash.classNameBindings) {
      extensions.classNameBindings = hash.classNameBindings.split(' ');
      dup = true;
    }

    if (hash.attributeBindings) {
      ember_assert("Setting 'attributeBindings' via Handlebars is not allowed. Please subclass Ember.View and set it there instead.");
      extensions.attributeBindings = null;
      dup = true;
    }

    if (dup) {
      hash = Ember.$.extend({}, hash);
      delete hash.id;
      delete hash['class'];
      delete hash.classBinding;
    }

    // Look for bindings passed to the helper and, if they are
    // local, make them relative to the current context instead of the
    // view.
    var path, normalized;

    for (var prop in hash) {
      if (!hash.hasOwnProperty(prop)) { continue; }

      // Test if the property ends in "Binding"
      if (Ember.IS_BINDING.test(prop)) {
        path = hash[prop];

        normalized = Ember.Handlebars.normalizePath(null, path, data);
        if (normalized.isKeyword) {
          hash[prop] = 'templateData.keywords.'+path;
        } else if (!Ember.isGlobalPath(path)) {
          if (path === 'this') {
            hash[prop] = 'bindingContext';
          } else {
            hash[prop] = 'bindingContext.'+path;
          }
        }
      }
    }

    // Make the current template context available to the view
    // for the bindings set up above.
    extensions.bindingContext = thisContext;

    return viewClass.extend(hash, extensions);
  },

  helper: function(thisContext, path, options) {
    var inverse = options.inverse,
        data = options.data,
        view = data.view,
        fn = options.fn,
        hash = options.hash,
        newView;

    if ('string' === typeof path) {
      newView = EmberHandlebars.getPath(thisContext, path, options);
      ember_assert("Unable to find view at path '" + path + "'", !!newView);
    } else {
      newView = path;
    }

    ember_assert(Ember.String.fmt('You must pass a view class to the #view helper, not %@ (%@)', [path, newView]), Ember.View.detect(newView));

    newView = this.viewClassFromHTMLOptions(newView, options, thisContext);
    var currentView = data.view;
    var viewOptions = {
      templateData: options.data
    };

    if (fn) {
      ember_assert("You cannot provide a template block if you also specified a templateName", !get(viewOptions, 'templateName') && !get(newView.proto(), 'templateName'));
      viewOptions.template = fn;
    }

    currentView.appendChild(newView, viewOptions);
  }
});

/**
  @name Handlebars.helpers.view
  @param {String} path
  @param {Hash} options
  @returns {String} HTML string
*/
EmberHandlebars.registerHelper('view', function(path, options) {
  ember_assert("The view helper only takes a single argument", arguments.length <= 2);

  // If no path is provided, treat path param as options.
  if (path && path.data && path.data.isRenderData) {
    options = path;
    path = "Ember.View";
  }

  return EmberHandlebars.ViewHelper.helper(this, path, options);
});

