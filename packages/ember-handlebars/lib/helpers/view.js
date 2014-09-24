/**
@module ember
@submodule ember-handlebars
*/

import Ember from "ember-metal/core"; // Ember.warn, Ember.assert
// var emberWarn = Ember.warn, emberAssert = Ember.assert;

import EmberObject from "ember-runtime/system/object";
import { get } from "ember-metal/property_get";
import { IS_BINDING } from "ember-metal/mixin";
import View from "ember-views/views/view";
import { isGlobalPath } from "ember-metal/binding";
import merge from "ember-metal/merge";
import {
  normalizePath,
  handlebarsGet,
  handlebarsGetView
} from "ember-handlebars/ext";
import { iterateObject } from "ember-metal/utils";

var SELF_BINDING = /^_view\./;

function makeBindings(thisContext, options) {
  var hash = options.hash;
  var hashType = options.hashTypes;

  iterateObject(hash, function(prop, _){
    if (hashType[prop] === 'ID') {

      var value = hash[prop];

      if (IS_BINDING.test(prop)) {
        Ember.warn("You're attempting to render a view by passing " + prop + "=" + value + " to a view helper, but this syntax is ambiguous. You should either surround " + value + " in quotes or remove `Binding` from " + prop + ".");
      } else {
        hash[prop + 'Binding'] = value;
        hashType[prop + 'Binding'] = 'STRING';
        delete hash[prop];
        delete hashType[prop];
      }
    }
  });

  if (Object.hasOwnProperty.call(hash, 'idBinding')) {
    // id can't be bound, so just perform one-time lookup.
    hash.id = handlebarsGet(thisContext, hash.idBinding, options);
    hashType.id = 'STRING';
    delete hash.idBinding;
    delete hashType.idBinding;
  }
}

export var ViewHelper = EmberObject.create({

  propertiesFromHTMLOptions: function(options) {
    var hash = options.hash;
    var data = options.data;
    var extensions = {};
    var classes = hash['class'];
    var dup = false;

    if (hash.id) {
      extensions.elementId = hash.id;
      dup = true;
    }

    if (hash.tag) {
      extensions.tagName = hash.tag;
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
      hash = merge({}, hash);
      delete hash.id;
      delete hash.tag;
      delete hash['class'];
      delete hash.classBinding;
    }

    // Set the proper context for all bindings passed to the helper. This applies to regular attribute bindings
    // as well as class name bindings. If the bindings are local, make them relative to the current context
    // instead of the view.
    var path;

    // Evaluate the context of regular attribute bindings:
    var self = this;
    iterateObject(hash, function(prop, value){
      // Test if the property ends in "Binding"
      if (IS_BINDING.test(prop) && typeof hash[prop] === 'string') {
        path = self.contextualizeBindingPath(hash[prop], data);
        if (path) { hash[prop] = path; }
      }
    });

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
          //     classNameBinding="_parentView.context.isGreen:green"
          var parsedPath = View._parsePropertyPath(full);
          if(parsedPath.path !== '') {
            path = this.contextualizeBindingPath(parsedPath.path, data);
            if (path) { extensions.classNameBindings[b] = path + parsedPath.classNames; }
          }
        }
      }
    }

    return merge(hash, extensions);
  },

  // Transform bindings from the current context to a context that can be evaluated within the view.
  // Returns null if the path shouldn't be changed.
  contextualizeBindingPath: function(path, data) {
    if (SELF_BINDING.test(path)) {
      return path.slice(6); // Lop off "_view."
    }
    var normalized = normalizePath(null, path, data);
    if (normalized.isKeyword) {
      return 'templateData.keywords.' + path;
    } else if (isGlobalPath(path)) {
      return null;
    } else if (path === 'this' || path === '') {
      return '_parentView.context';
    } else {
      return '_parentView.context.' + path;
    }
  },

  helper: function(thisContext, path, options) {
    var data = options.data;
    var fn = options.fn;
    var newView;

    makeBindings(thisContext, options);

    var container = this.container || (data && data.view && data.view.container);
    newView = handlebarsGetView(thisContext, path, container, options.data);

    var viewOptions = this.propertiesFromHTMLOptions(options, thisContext);
    var currentView = data.view;
    viewOptions.templateData = data;
    var newViewProto = newView.proto();

    if (fn) {
      Ember.assert("You cannot provide a template block if you also specified a templateName", !get(viewOptions, 'templateName') && !get(newViewProto, 'templateName'));
      viewOptions.template = fn;
    }

    // We only want to override the `_context` computed property if there is
    // no specified controller. See View#_context for more information.
    if (!newViewProto.controller && !newViewProto.controllerBinding && !viewOptions.controller && !viewOptions.controllerBinding) {
      viewOptions._context = thisContext;
    }

    // for instrumentation
    if (options.helperName) {
      viewOptions.helperName = options.helperName;
    }

    currentView.appendChild(newView, viewOptions);
  },

  instanceHelper: function(thisContext, newView, options) {
    var data = options.data,
        fn = options.fn;

    makeBindings(thisContext, options);

    Ember.assert(
      'Only a instance of a view may be passed to the ViewHelper.instanceHelper',
      View.detectInstance(newView)
    );

    var viewOptions = this.propertiesFromHTMLOptions(options, thisContext);
    var currentView = data.view;
    viewOptions.templateData = data;

    if (fn) {
      Ember.assert("You cannot provide a template block if you also specified a templateName", !get(viewOptions, 'templateName') && !get(newView, 'templateName'));
      viewOptions.template = fn;
    }

    // We only want to override the `_context` computed property if there is
    // no specified controller. See View#_context for more information.
    if (!newView.controller && !newView.controllerBinding && !viewOptions.controller && !viewOptions.controllerBinding) {
      viewOptions._context = thisContext;
    }

    // for instrumentation
    if (options.helperName) {
      viewOptions.helperName = options.helperName;
    }

    currentView.appendChild(newView, viewOptions);
  }
});

/**
  `{{view}}` inserts a new instance of an `Ember.View` into a template passing its
  options to the `Ember.View`'s `create` method and using the supplied block as
  the view's own template.

  An empty `<body>` and the following template:

  ```handlebars
  A span:
  {{#view tagName="span"}}
    hello.
  {{/view}}
  ```

  Will result in HTML structure:

  ```html
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
  ```

  ### `parentView` setting

  The `parentView` property of the new `Ember.View` instance created through
  `{{view}}` will be set to the `Ember.View` instance of the template where
  `{{view}}` was called.

  ```javascript
  aView = Ember.View.create({
    template: Ember.Handlebars.compile("{{#view}} my parent: {{parentView.elementId}} {{/view}}")
  });

  aView.appendTo('body');
  ```

  Will result in HTML structure:

  ```html
  <div id="ember1" class="ember-view">
    <div id="ember2" class="ember-view">
      my parent: ember1
    </div>
  </div>
  ```

  ### Setting CSS id and class attributes

  The HTML `id` attribute can be set on the `{{view}}`'s resulting element with
  the `id` option. This option will _not_ be passed to `Ember.View.create`.

  ```handlebars
  {{#view tagName="span" id="a-custom-id"}}
    hello.
  {{/view}}
  ```

  Results in the following HTML structure:

  ```html
  <div class="ember-view">
    <span id="a-custom-id" class="ember-view">
      hello.
    </span>
  </div>
  ```

  The HTML `class` attribute can be set on the `{{view}}`'s resulting element
  with the `class` or `classNameBindings` options. The `class` option will
  directly set the CSS `class` attribute and will not be passed to
  `Ember.View.create`. `classNameBindings` will be passed to `create` and use
  `Ember.View`'s class name binding functionality:

  ```handlebars
  {{#view tagName="span" class="a-custom-class"}}
    hello.
  {{/view}}
  ```

  Results in the following HTML structure:

  ```html
  <div class="ember-view">
    <span id="ember2" class="ember-view a-custom-class">
      hello.
    </span>
  </div>
  ```

  ### Supplying a different view class

  `{{view}}` can take an optional first argument before its supplied options to
  specify a path to a custom view class.

  ```handlebars
  {{#view "custom"}}{{! will look up App.CustomView }}
    hello.
  {{/view}}
  ```

  The first argument can also be a relative path accessible from the current
  context.

  ```javascript
  MyApp = Ember.Application.create({});
  MyApp.OuterView = Ember.View.extend({
    innerViewClass: Ember.View.extend({
      classNames: ['a-custom-view-class-as-property']
    }),
    template: Ember.Handlebars.compile('{{#view view.innerViewClass}} hi {{/view}}')
  });

  MyApp.OuterView.create().appendTo('body');
  ```

  Will result in the following HTML:

  ```html
  <div id="ember1" class="ember-view">
    <div id="ember2" class="ember-view a-custom-view-class-as-property">
      hi
    </div>
  </div>
  ```

  ### Blockless use

  If you supply a custom `Ember.View` subclass that specifies its own template
  or provide a `templateName` option to `{{view}}` it can be used without
  supplying a block. Attempts to use both a `templateName` option and supply a
  block will throw an error.

  ```javascript
  var App = Ember.Application.create();
  App.WithTemplateDefinedView = Ember.View.extend({
    templateName: 'defined-template'
  });
  ```

  ```handlebars
  {{! application.hbs }}
  {{view 'with-template-defined'}}
  ```

  ```handlebars
  {{! defined-template.hbs }}
  Some content for the defined template view.
  ```

  ### `viewName` property

  You can supply a `viewName` option to `{{view}}`. The `Ember.View` instance
  will be referenced as a property of its parent view by this name.

  ```javascript
  aView = Ember.View.create({
    template: Ember.Handlebars.compile('{{#view viewName="aChildByName"}} hi {{/view}}')
  });

  aView.appendTo('body');
  aView.get('aChildByName') // the instance of Ember.View created by {{view}} helper
  ```

  @method view
  @for Ember.Handlebars.helpers
  @param {String} path
  @param {Hash} options
  @return {String} HTML string
*/
export function viewHelper(path, options) {
  Ember.assert("The view helper only takes a single argument", arguments.length <= 2);

  // If no path is provided, treat path param as options
  // and get an instance of the registered `view:toplevel`
  if (path && path.data && path.data.isRenderData) {
    options = path;
    if (options.data && options.data.view && options.data.view.container) {
      path = options.data.view.container.lookupFactory('view:toplevel');
    } else {
      path = View;
    }
  }

  options.helperName = options.helperName || 'view';

  return ViewHelper.helper(this, path, options);
}
