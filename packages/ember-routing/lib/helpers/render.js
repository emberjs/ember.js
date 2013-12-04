/**
@module ember
@submodule ember-routing
*/

var get = Ember.get, set = Ember.set;

require('ember-handlebars/helpers/view');

Ember.onLoad('Ember.Handlebars', function(Handlebars) {

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
    {{render navigation}}
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
  Ember.Handlebars.registerHelper('render', function(name, contextString, options) {
    Ember.assert("You must pass a template to render", arguments.length >= 2);
    var contextProvided = arguments.length === 3,
        container, router, controller, view, context, lookupOptions;

    if (arguments.length === 2) {
      options = contextString;
      contextString = undefined;
    }

    if (typeof contextString === 'string') {
      context = Ember.Handlebars.get(options.contexts[1], contextString, options);
      lookupOptions = { singleton: false };
    }

    if (Ember.ENV['EMBER_SLASH_AS_NAMESPACE_SEPARATOR'] !== false) {
      name = name.replace(/\//g, '.');
    }

    container = options.data.keywords.controller.container;
    router = container.lookup('router:main');

    Ember.assert("You can only use the {{render}} helper once without a model object as its second argument, as in {{render \"post\" post}}.", contextProvided || !router || !router._lookupActiveView(name));

    view = container.lookup('view:' + name) || container.lookup('view:default');

    var controllerName = options.hash.controller;

    // Look up the controller by name, if provided.
    if (controllerName) {
      controller = container.lookup('controller:' + controllerName, lookupOptions);
      Ember.assert("The controller name you supplied '" + controllerName + "' did not resolve to a controller.", !!controller);
    } else {
      controller = container.lookup('controller:' + name, lookupOptions) ||
                      Ember.generateController(container, name, context);
    }

    if (controller && contextProvided) {
      controller.set('model', context);
    }

    var root = options.contexts[1];

    if (root) {
      view.registerObserver(root, contextString, function() {
        controller.set('model', Ember.Handlebars.get(root, contextString, options));
      });
    }

    controller.set('target', options.data.keywords.controller);

    options.hash.viewName = Ember.String.camelize(name);
    options.hash.template = container.lookup('template:' + name);
    options.hash.controller = controller;

    if (router && !context) {
      router._connectActiveView(name, view);
    }

    Ember.Handlebars.helpers.view.call(this, view, options);
  });

});
