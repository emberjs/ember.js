import {
  generateControllerFactory,
  default as generateController
} from "ember-routing/system/generate_controller";
import { camelize } from "ember-runtime/system/string";
import EmberError from "ember-metal/error";
import { ViewHelper } from "ember-htmlbars/helpers/view";

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
  var name          = params[0];
  var parentView    = this;
  var container     = this._keywords.controller.value().container;
  var controller    = options.hash.controller;
  var passedContext = params[1];

  var controllerName     = controller || name;
  var controllerFullName = 'controller:' + controllerName;

  var view;

  Ember.deprecate('Using a quoteless parameter with {{render}} is deprecated. Please update to' +
                  ' quoted usage "{{render "' + name + '"}}.', options.types[0] !== 'id');

  if (!name) {
    throw new EmberError('You must pass a templateName to render');
  }

  if (controller) {
    Ember.assert("The controller name you supplied '" + controllerName +
                 "' did not resolve to a controller.", container.has(controllerFullName));
  } else {
    controller = lookupController(container, parentView, params);
  }

  sanitizeName(name);

  var templateName = 'template:' + name;
  Ember.assert("You used `{{render '" + name + "'}}`, but '" + name + "' can not be found as either" +
               " a template or a view.", container.has("view:" + name) || container.has(templateName) || !!options.render);

  options.helperName      = options.helperName || ('render "' + name + '"');
  options.hash.controller = controller;
  options.hash.template   = container.lookup(templateName);

  view = container.lookup('view:' + name) || container.lookup('view:default');

  ViewHelper.instanceHelper(view, options, env);
}

function lookupController(container, view, params) {
  var name               = params[0];
  var controllerFullName = 'controller:' + name;
  var parentController   = view._keywords.controller.value();

  var controller = container.lookup(controllerFullName) || generateController(container, name);

  controller.setProperties({
    target:           parentController,
    parentController: parentController
  });

  return controller;
}

function sanitizeName(name) {
  // # legacy namespace
  name = name.replace(/\//g, '.');
}
