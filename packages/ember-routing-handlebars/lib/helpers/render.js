import Ember from "ember-metal/core"; // assert, deprecate
import EmberError from "ember-metal/error";
import { camelize } from "ember-runtime/system/string";
import {
  generateControllerFactory
} from "ember-routing/system/generate_controller";
import generateController from "ember-routing/system/generate_controller";
import { handlebarsGet } from "ember-handlebars/ext";
import { ViewHelper } from "ember-handlebars/helpers/view";

import "ember-handlebars/helpers/view";

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

  ```handelbars
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
export default function renderHelper(name, contextString, options) {
  var length = arguments.length;
  var container, router, controller, view, context;

  container = (options || contextString).data.keywords.controller.container;
  router = container.lookup('router:main');

  if (length === 2) {
    // use the singleton controller
    options = contextString;
    contextString = undefined;
    Ember.assert("You can only use the {{render}} helper once without a model object as its second argument, as in {{render \"post\" post}}.", !router || !router._lookupActiveView(name));
  } else if (length === 3) {
    // create a new controller
    context = handlebarsGet(options.contexts[1], contextString, options);
  } else {
    throw new EmberError("You must pass a templateName to render");
  }

  Ember.deprecate("Using a quoteless parameter with {{render}} is deprecated. Please update to quoted usage '{{render \"" + name + "\"}}.", options.types[0] !== 'ID');

  // # legacy namespace
  name = name.replace(/\//g, '.');
  // \ legacy slash as namespace support


  view = container.lookup('view:' + name) || container.lookup('view:default');

  // provide controller override
  var controllerName = options.hash.controller || name;
  var controllerFullName = 'controller:' + controllerName;

  if (options.hash.controller) {
    Ember.assert("The controller name you supplied '" + controllerName + "' did not resolve to a controller.", container.has(controllerFullName));
  }

  var parentController = options.data.keywords.controller;

  // choose name
  if (length > 2) {
    var factory = container.lookupFactory(controllerFullName) ||
                  generateControllerFactory(container, controllerName, context);

    controller = factory.create({
      model: context,
      parentController: parentController,
      target: parentController
    });

    view.one('willDestroyElement', function() {
      controller.destroy();
    });
  } else {
    controller = container.lookup(controllerFullName) ||
                 generateController(container, controllerName);

    controller.setProperties({
      target: parentController,
      parentController: parentController
    });
  }

  var root = options.contexts[1];

  if (root) {
    view.registerObserver(root, contextString, function() {
      controller.set('model', handlebarsGet(root, contextString, options));
    });
  }

  options.hash.viewName = camelize(name);

  var templateName = 'template:' + name;
  Ember.assert("You used `{{render '" + name + "'}}`, but '" + name + "' can not be found as either a template or a view.", container.has("view:" + name) || container.has(templateName) || options.fn);
  options.hash.template = container.lookup(templateName);

  options.hash.controller = controller;

  if (router && !context) {
    router._connectActiveView(name, view);
  }

  options.helperName = options.helperName || ('render "' + name + '"');

  ViewHelper.instanceHelper(this, view, options);
}
