/**
@module ember
@submodule ember-templates
*/

import { readViewFactory } from 'ember-views/streams/utils';
import EmberView from 'ember-views/views/view';
import ViewNodeManager from 'ember-htmlbars/node-managers/view-node-manager';

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
  @for Ember.Templates.helpers
  @public
  @deprecated
*/

export default {
  setupState(state, env, scope, params, hash) {
    var read = env.hooks.getValue;
    var targetObject = read(scope.getSelf());
    var viewClassOrInstance = state.viewClassOrInstance;
    if (!viewClassOrInstance) {
      viewClassOrInstance = getView(read(params[0]), env.container);
    }

    // if parentView exists, use its controller (the default
    // behavior), otherwise use `scope.self` as the controller
    var controller = scope.hasLocal('view') ? null : read(scope.getSelf());

    return {
      manager: state.manager,
      parentView: env.view,
      controller,
      targetObject,
      viewClassOrInstance
    };
  },

  rerender(morph, env, scope, params, hash, template, inverse, visitor) {
    // If the hash is empty, the component cannot have extracted a part
    // of a mutable param and used it in its layout, because there are
    // no params at all.
    if (Object.keys(hash).length) {
      return morph.getState().manager.rerender(env, hash, visitor, true);
    }
  },

  render(node, env, scope, params, hash, template, inverse, visitor) {
    if (hash.tag) {
      hash = swapKey(hash, 'tag', 'tagName');
    }

    if (hash.classNameBindings) {
      hash.classNameBindings = hash.classNameBindings.split(' ');
    }

    var state = node.getState();
    var parentView = state.parentView;

    var options = {
      component: state.viewClassOrInstance,
      layout: null
    };

    options.createOptions = {};
    if (state.controller) {
      // Use `_controller` to avoid stomping on a CP
      // that exists in the target view/component
      options.createOptions._controller = state.controller;
    }

    if (state.targetObject) {
      // Use `_targetObject` to avoid stomping on a CP
      // that exists in the target view/component
      options.createOptions._targetObject = state.targetObject;
    }

    if (state.manager) {
      state.manager.destroy();
      state.manager = null;
    }

    var nodeManager = ViewNodeManager.create(node, env, hash, options, parentView, null, scope, template);
    state.manager = nodeManager;

    nodeManager.render(env, hash, visitor);
  }
};

function getView(viewPath, container) {
  var viewClassOrInstance;

  if (!viewPath) {
    if (container) {
      viewClassOrInstance = container.lookupFactory('view:toplevel');
    } else {
      viewClassOrInstance = EmberView;
    }
  } else {
    viewClassOrInstance = readViewFactory(viewPath, container);
  }

  return viewClassOrInstance;
}

function swapKey(hash, original, update) {
  var newHash = {};

  for (var prop in hash) {
    if (prop === original) {
      newHash[update] = hash[prop];
    } else {
      newHash[prop] = hash[prop];
    }
  }

  return newHash;
}
