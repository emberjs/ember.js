/**
@module ember
@submodule ember-handlebars
*/

import Ember from "ember-metal/core"; // Ember.warn, Ember.assert

import EmberObject from "ember-runtime/system/object";
import { get } from "ember-metal/property_get";
import keys from "ember-metal/keys";
import { IS_BINDING } from "ember-metal/mixin";
import { readViewFactory } from "ember-views/streams/utils";
import View from "ember-views/views/view";
import SimpleStream from "ember-metal/streams/simple";

function makeBindings(options) {
  var hash = options.hash;
  var hashTypes = options.hashTypes;
  var view = options.data.view;

  for (var prop in hash) {
    var hashType = hashTypes[prop];
    var value = hash[prop];

    if (IS_BINDING.test(prop)) {
      // classBinding is processed separately
      if (prop === 'classBinding') {
        continue;
      }

      if (hashType === 'ID') {
        Ember.warn("You're attempting to render a view by passing " +
                   prop + "=" + value +
                   " to a view helper, but this syntax is ambiguous. You should either surround " +
                   value + " in quotes or remove `Binding` from " + prop + ".");
        hash[prop] = view._getBindingForStream(value);
      } else if (typeof value === 'string') {
        hash[prop] = view._getBindingForStream(value);
      }
    } else {
      if (hashType === 'ID') {
        if (prop === 'class') {
          hash.classBinding = value;
        } else {
          hash[prop + 'Binding'] = view._getBindingForStream(value);
        }
        delete hash[prop];
        delete hashTypes[prop];
      }
    }
  }

  if (hash.idBinding) {
    // id can't be bound, so just perform one-time lookup.
    hash.id = hash.idBinding.value();
    hashTypes.id = 'STRING';
    delete hash.idBinding;
    delete hashTypes.idBinding;
  }
}

export var ViewHelper = EmberObject.create({
  propertiesFromHTMLOptions: function(options) {
    var view    = options.data.view;
    var hash    = options.hash;
    var classes = hash['class'];

    var extensions = {
      helperName: options.helperName || ''
    };

    if (hash.id) {
      extensions.elementId = hash.id;
    }

    if (hash.tag) {
      extensions.tagName = hash.tag;
    }

    if (classes) {
      classes = classes.split(' ');
      extensions.classNames = classes;
    }

    if (hash.classBinding) {
      extensions.classNameBindings = hash.classBinding.split(' ');
    }

    if (hash.classNameBindings) {
      if (extensions.classNameBindings === undefined) {
        extensions.classNameBindings = [];
      }
      extensions.classNameBindings = extensions.classNameBindings.concat(hash.classNameBindings.split(' '));
    }

    if (hash.attributeBindings) {
      Ember.assert("Setting 'attributeBindings' via template helpers is not allowed." +
                   " Please subclass Ember.View and set it there instead.");
      extensions.attributeBindings = null;
    }

    // Set the proper context for all bindings passed to the helper. This applies to regular attribute bindings
    // as well as class name bindings. If the bindings are local, make them relative to the current context
    // instead of the view.

    var hashKeys = keys(hash);

    for (var i = 0, l = hashKeys.length; i < l; i++) {
      var prop = hashKeys[i];

      if (prop !== 'classNameBindings') {
        extensions[prop] = hash[prop];
      }
    }

    var classNameBindings = extensions.classNameBindings;
    if (classNameBindings) {
      for (var j = 0; j < classNameBindings.length; j++) {
        var parsedPath = View._parsePropertyPath(classNameBindings[j]);
        if (parsedPath.path === '') {
          parsedPath.stream = new SimpleStream(true);
        } else {
          parsedPath.stream = view.getStream(parsedPath.path);
        }
        classNameBindings[j] = parsedPath;
      }
    }

    return extensions;
  },

  helper: function(thisContext, newView, options) {
    var data = options.data;
    var fn   = options.fn;

    makeBindings(options);

    var viewOptions = this.propertiesFromHTMLOptions(options, thisContext);
    var currentView = data.view;
    var newViewProto = newView.proto();

    if (fn) {
      Ember.assert("You cannot provide a template block if you also specified a templateName",
                   !get(viewOptions, 'templateName') && !get(newViewProto, 'templateName'));
      viewOptions.template = fn;
    }

    // We only want to override the `_context` computed property if there is
    // no specified controller. See View#_context for more information.
    if (!newViewProto.controller && !newViewProto.controllerBinding && !viewOptions.controller && !viewOptions.controllerBinding) {
      viewOptions._context = thisContext;
    }

    currentView.appendChild(newView, viewOptions);
  },

  instanceHelper: function(thisContext, newView, options) {
    var data = options.data;
    var fn   = options.fn;

    makeBindings(options);

    Ember.assert(
      'Only a instance of a view may be passed to the ViewHelper.instanceHelper',
      View.detectInstance(newView)
    );

    var viewOptions = this.propertiesFromHTMLOptions(options, thisContext);
    var currentView = data.view;

    if (fn) {
      Ember.assert("You cannot provide a template block if you also specified a templateName",
                   !get(viewOptions, 'templateName') && !get(newView, 'templateName'));
      viewOptions.template = fn;
    }

    // We only want to override the `_context` computed property if there is
    // no specified controller. See View#_context for more information.
    if (!newView.controller && !newView.controllerBinding &&
        !viewOptions.controller && !viewOptions.controllerBinding) {
      viewOptions._context = thisContext;
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
export function viewHelper(path) {
  Ember.assert("The view helper only takes a single argument", arguments.length <= 2);

  var options = arguments[arguments.length - 1];
  var types = options.types;
  var view = options.data.view;
  var container = view.container || view._keywords.view.value().container;
  var viewClass;

  // If no path is provided, treat path param as options
  // and get an instance of the registered `view:toplevel`
  if (arguments.length === 1) {
    if (container) {
      viewClass = container.lookupFactory('view:toplevel');
    } else {
      viewClass = View;
    }
  } else {
    var pathStream;
    if (typeof path === 'string' && types[0] === 'ID') {
      pathStream = view.getStream(path);
      Ember.deprecate('Resolved the view "'+path+'" on the global context. Pass a view name to be looked up on the container instead, such as {{view "select"}}. http://emberjs.com/guides/deprecations#toc_global-lookup-of-views', !pathStream.isGlobal());
    } else {
      pathStream = path;
    }

    viewClass = readViewFactory(pathStream, container);
  }

  options.helperName = options.helperName || 'view';

  return ViewHelper.helper(this, viewClass, options);
}
