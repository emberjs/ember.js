// ==========================================================================
// Project:   Ember Handlebars Views
// Copyright: ©2011 Strobe Inc. and contributors.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================
/*globals Handlebars */

// TODO: Don't require the entire module
require("ember-handlebars");

var get = Ember.get, set = Ember.set;
var PARENT_VIEW_PATH = /^parentView\./;
var EmberHandlebars = Ember.Handlebars;
var VIEW_PRESERVES_CONTEXT = Ember.VIEW_PRESERVES_CONTEXT;

/** @private */
EmberHandlebars.ViewHelper = Ember.Object.create({

  propertiesFromHTMLOptions: function(options, thisContext) {
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
      if (extensions.classNameBindings === undefined) extensions.classNameBindings = [];
      extensions.classNameBindings = extensions.classNameBindings.concat(hash.classNameBindings.split(' '));
      dup = true;
    }

    if (hash.attributeBindings) {
      Ember.assert("Setting 'attributeBindings' via Handlebars is not allowed. Please subclass Ember.View and set it there instead.");
      extensions.attributeBindings = null;
      dup = true;
    }

    if (dup) {
      hash = Ember.$.extend({}, hash);
      delete hash.id;
      delete hash['class'];
      delete hash.classBinding;
    }

    // Set the proper context for all bindings passed to the helper. This applies to regular attribute bindings
    // as well as class name bindings. If the bindings are local, make them relative to the current context
    // instead of the view.
    var path;

    // Evaluate the context of regular attribute bindings:
    for (var prop in hash) {
      if (!hash.hasOwnProperty(prop)) { continue; }

      // Test if the property ends in "Binding"
      if (Ember.IS_BINDING.test(prop) && typeof hash[prop] === 'string') {
        path = this.contextualizeBindingPath(hash[prop], data);
        if (path) { hash[prop] = path; }
      }
    }

    // Evaluate the context of class name bindings:
    if (extensions.classNameBindings) {
      for (var b in extensions.classNameBindings) {
        var full = extensions.classNameBindings[b];
        if (typeof full === 'string') {
          // Contextualize the path of classNameBinding so this:
          //
          //     classNameBinding="isGreen:green"
          //
          // is converted to this:
          //
          //     classNameBinding="bindingContext.isGreen:green"
          var parsedPath = Ember.View._parsePropertyPath(full);
          path = this.contextualizeBindingPath(parsedPath.path, data);
          if (path) { extensions.classNameBindings[b] = path + parsedPath.classNames; }
        }
      }
    }

    // Make the current template context available to the view
    // for the bindings set up above.
    extensions.bindingContext = thisContext;

    return Ember.$.extend(hash, extensions);
  },

  // Transform bindings from the current context to a context that can be evaluated within the view.
  // Returns null if the path shouldn't be changed.
  //
  // TODO: consider the addition of a prefix that would allow this method to return `path`.
  contextualizeBindingPath: function(path, data) {
    var normalized = Ember.Handlebars.normalizePath(null, path, data);
    if (normalized.isKeyword) {
      return 'templateData.keywords.' + path;
    } else if (Ember.isGlobalPath(path)) {
      return null;
    } else if (path === 'this') {
      return 'bindingContext';
    } else {
      return 'bindingContext.' + path;
    }
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
      Ember.assert("Unable to find view at path '" + path + "'", !!newView);
    } else {
      newView = path;
    }

    Ember.assert(Ember.String.fmt('You must pass a view class to the #view helper, not %@ (%@)', [path, newView]), Ember.View.detect(newView));

    var viewOptions = this.propertiesFromHTMLOptions(options, thisContext);
    var currentView = data.view;
    viewOptions.templateData = options.data;

    if (fn) {
      Ember.assert("You cannot provide a template block if you also specified a templateName", !get(viewOptions, 'templateName') && !get(newView.proto(), 'templateName'));
      viewOptions.template = fn;
    }

    // We only want to override the `_context` computed property if there is
    // no specified controller. See View#_context for more information.
    if (VIEW_PRESERVES_CONTEXT && !newView.proto().controller && !newView.proto().controllerBinding && !viewOptions.controller && !viewOptions.controllerBinding) {
      viewOptions._context = thisContext;
    }

    currentView.appendChild(newView, viewOptions);
  }
});

/**
  `{{view}}` inserts a new instance of `Ember.View` into a template passing its options
  to the `Ember.View`'s `create` method and using the supplied block as the view's own template.

  An empty `<body>` and the following template:

      <script type="text/x-handlebars">
        A span:
        {{#view tagName="span"}}
          hello.
        {{/view}}
      </script>

  Will result in HTML structure:

      <body>
        <!-- Note: the handlebars template script 
             also results in a rendered Ember.View
             which is the outer <div> here -->

        <div class="ember-view">
          A span:
          <span id="ember1" class="ember-view">
            Hello.
          </span>
        </div>
      </body>

  ### parentView setting

  The `parentView` property of the new `Ember.View` instance created through `{{view}}`
  will be set to the `Ember.View` instance of the template where `{{view}}` was called.

      aView = Ember.View.create({
        template: Ember.Handlebars.compile("{{#view}} my parent: {{parentView.elementId}} {{/view}}")
      })

      aView.appendTo('body')
    
  Will result in HTML structure:

      <div id="ember1" class="ember-view">
        <div id="ember2" class="ember-view">
          my parent: ember1
        </div>
      </div>

  ### Setting CSS id and class attributes

  The HTML `id` attribute can be set on the `{{view}}`'s resulting element with the `id` option.
  This option will _not_ be passed to `Ember.View.create`.

      <script type="text/x-handlebars">
        {{#view tagName="span" id="a-custom-id"}}
          hello.
        {{/view}}
      </script>

  Results in the following HTML structure:

      <div class="ember-view">
        <span id="a-custom-id" class="ember-view">
          hello.
        </span>
      </div>

  The HTML `class` attribute can be set on the `{{view}}`'s resulting element with
  the `class` or `classNameBindings` options. The `class` option
  will directly set the CSS `class` attribute and will not be passed to
  `Ember.View.create`. `classNameBindings` will be passed to `create` and use
  `Ember.View`'s class name binding functionality:

      <script type="text/x-handlebars">
        {{#view tagName="span" class="a-custom-class"}}
          hello.
        {{/view}}
      </script>

  Results in the following HTML structure:

      <div class="ember-view">
        <span id="ember2" class="ember-view a-custom-class">
          hello.
        </span>
      </div>

  ### Supplying a different view class
  `{{view}}` can take an optional first argument before its supplied options to specify a
  path to a custom view class.

      <script type="text/x-handlebars">
        {{#view "MyApp.CustomView"}}
          hello.
        {{/view}}
      </script>

  The first argument can also be a relative path. Ember will search for the view class
  starting at the `Ember.View` of the template where `{{view}}` was used as the root object:

      MyApp = Ember.Application.create({})
      MyApp.OuterView = Ember.View.extend({
        innerViewClass: Ember.View.extend({
          classNames: ['a-custom-view-class-as-property']
        }),
        template: Ember.Handlebars.compile('{{#view "innerViewClass"}} hi {{/view}}')
      })

      MyApp.OuterView.create().appendTo('body')

Will result in the following HTML:

      <div id="ember1" class="ember-view">
        <div id="ember2" class="ember-view a-custom-view-class-as-property"> 
          hi
        </div>
      </div>

  ### Blockless use

  If you supply a custom `Ember.View` subclass that specifies its own template
  or provide a `templateName` option to `{{view}}` it can be used without supplying a block.
  Attempts to use both a `templateName` option and supply a block will throw an error.

      <script type="text/x-handlebars">
        {{view "MyApp.ViewWithATemplateDefined"}}
      </script>

  ### viewName property

  You can supply a `viewName` option to `{{view}}`. The `Ember.View` instance will
  be referenced as a property of its parent view by this name.

      aView = Ember.View.create({
        template: Ember.Handlebars.compile('{{#view viewName="aChildByName"}} hi {{/view}}')
      })

      aView.appendTo('body')
      aView.get('aChildByName') // the instance of Ember.View created by {{view}} helper

  @name Handlebars.helpers.view
  @param {String} path
  @param {Hash} options
  @returns {String} HTML string
*/
EmberHandlebars.registerHelper('view', function(path, options) {
  Ember.assert("The view helper only takes a single argument", arguments.length <= 2);

  // If no path is provided, treat path param as options.
  if (path && path.data && path.data.isRenderData) {
    options = path;
    path = "Ember.View";
  }

  return EmberHandlebars.ViewHelper.helper(this, path, options);
});

