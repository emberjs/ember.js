import {
  generateControllerFactory,
  default as generateController
} from "ember-routing/system/generate_controller";
import { camelize } from "ember-runtime/system/string";
import EmberError from "ember-metal/error";

/**
@module ember
@submodule ember-routing
*/

/**
  Calling ``{{render}}`` from within a template will insert another
  template that matches the provided name. The inserted template will
  access its properties on its own controller (rather than the controller
  of the parent template).

  If a view class with the same name exists, the view class also will be used.

  Note: A given controller may only be used *once* in your app in this manner.
  A singleton instance of the controller will be created for you.

  Example:

  ```javascript
  App.NavigationController = Ember.Controller.extend({
    who: "world"
  });
  ```

  ```handlebars
  <!-- navigation.hbs -->
  Hello, {{who}}.
  ```

  ```handlebars
  <!-- application.hbs -->
  <h1>My great app</h1>
  {{render "navigation"}}
  ```

  ```html
  <h1>My great app</h1>
  <div class='ember-view'>
    Hello, world.
  </div>
  ```

  Optionally you may provide a second argument: a property path
  that will be bound to the `model` property of the controller.

  If a `model` property path is specified, then a new instance of the
  controller will be created and `{{render}}` can be used multiple times
  with the same name.

 For example if you had this `author` template.

 ```handlebars
<div class="author">
Written by {{firstName}} {{lastName}}.
Total Posts: {{postCount}}
</div>
```

You could render it inside the `post` template using the `render` helper.

```handlebars
<div class="post">
<h1>{{title}}</h1>
<div>{{body}}</div>
{{render "author" author}}
</div>
 ```

  @method render
  @for Ember.Handlebars.helpers
  @param {String} name
  @param {Object?} contextString
  @param {Hash} options
  @return {String} HTML string
*/
export function renderHelper(params, options, env) {
  var length = params.length;
  var name = params[0];
  var passedContext = params[1];
  var passedController = options.hash.controller;

  var container          = this._keywords.controller.value().container;
  var parentController   = this._keywords.controller.value();
  var controllerName     = passedController || name;
  var controllerFullName = 'controller:' + controllerName;
  var router             = container.lookup('router:main');

  var initialContext, view;

  if (passedController) {
    Ember.assert("The controller name you supplied '" + controllerName +
                 "' did not resolve to a controller.", container.has(controllerFullName));
  }

  Ember.deprecate('Using a quoteless parameter with {{render}} is deprecated. Please update to' +
                  " quoted usage '{{render \"" + name + "\"}}.", options.types[0] !== 'id');

  if (!name) {
    throw new EmberError('You must pass a templateName to render');
  }

  // controller = lookupController(params);
  if (length === 2) {
    // template name + context
  } else if (length === 3) {
    // ?
  }

  // legacy slash as namespace support
  name = name.replace(/\//g, '.');

  view = container.lookup('view:' + name) || container.lookup('view:default');

  connectActiveView(router, name, view);

  render(view, name, container, options, env);
}

function connectActiveView(router, name, view) {
  if (router) {
    router._connectActiveView(name, view);
  }
}

function render(view, name, container, options, env) {
  var templateName = 'template:' + name;
  Ember.assert("You used `{{render '" + name + "'}}`, but '" + name + "' can not be found as either" +
               " a template or a view.", container.has("view:" + name) || container.has(templateName) || !!options.fn);

  var template = container.lookup(templateName);
  var fragment = template(view, env, options.morph.contextualElement);
  options.morph.update(fragment);
}
