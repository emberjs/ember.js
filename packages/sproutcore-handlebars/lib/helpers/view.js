// ==========================================================================
// Project:   SproutCore Handlebar Views
// Copyright: ©2011 Strobe Inc. and contributors.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================
/*globals Handlebars sc_assert */

// TODO: Don't require the entire module
require("sproutcore-handlebars");

var get = SC.get, set = SC.set;
var PARENT_VIEW_PATH = /^parentView\./;

/** @private */
SC.Handlebars.ViewHelper = SC.Object.create({

  viewClassFromHTMLOptions: function(viewClass, options, thisContext) {
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

    // Look for bindings passed to the helper and, if they are
    // local, make them relative to the current context instead of the
    // view.
    var path;

    for (var prop in options) {
      if (!options.hasOwnProperty(prop)) { continue; }

      // Test if the property ends in "Binding"
      if (SC.IS_BINDING.test(prop)) {
        path = options[prop];
        if (!SC.isGlobalPath(path)) {

          // Deprecation warning for users of beta 2 and lower, where
          // this facility was not available. The workaround was to bind
          // to parentViews; since this is no longer necessary, issue
          // a notice.
          if (PARENT_VIEW_PATH.test(path)) {
            SC.Logger.warn("As of SproutCore 2.0 beta 3, it is no longer necessary to bind to parentViews. Instead, please provide binding paths relative to the current Handlebars context.");
          } else {
            if (path === 'this') {
              options[prop] = 'bindingContext';
            } else {
              options[prop] = 'bindingContext.'+path;
            }
          }
        }
      }
    }

    // Make the current template context available to the view
    // for the bindings set up above.
    extensions.bindingContext = thisContext;

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
      sc_assert("Unable to find view at path '" + path + "'", !!newView);
    } else {
      newView = path;
    }

    sc_assert(SC.String.fmt('You must pass a view class to the #view helper, not %@ (%@)', [path, newView]), SC.View.detect(newView));

    newView = this.viewClassFromHTMLOptions(newView, hash, thisContext);
    var currentView = data.view;
    var viewOptions = {};

    if (fn) {
      sc_assert("You cannot provide a template block if you also specified a templateName", !get(viewOptions, 'templateName') && !newView.PrototypeMixin.keys().indexOf('templateName') >= 0);
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
SC.Handlebars.registerHelper('view', function(path, options) {
  sc_assert("The view helper only takes a single argument", arguments.length <= 2);

  // If no path is provided, treat path param as options.
  if (path && path.data && path.data.isRenderData) {
    options = path;
    path = "SC.View";
  }

  return SC.Handlebars.ViewHelper.helper(this, path, options);
});

