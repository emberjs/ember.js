/**
@module ember
@submodule ember-routing
*/

if (Ember.ENV.EXPERIMENTAL_CONTROL_HELPER) {
  var get = Ember.get, set = Ember.set;

  /**
   `{{control}}` works like render, except it uses a new controller instance for every call, instead of reusing the singleton controller.

    The control helper is currently under development and is considered experimental.
    To enable it, set `ENV.EXPERIMENTAL_CONTROL_HELPER = true` before requiring Ember.

   For example if you had this `author` template.

   ```handlebars
<div class="author">
  Written by {{firstName}} {{lastName}}.
  Total Posts: {{postCount}}
</div>
   ```

   You could render it inside the `post` template using the `control` helper.

   ```handlebars
<div class="post">
  <h1>{{title}}</h1>
  <div>{{body}}</div>
     {{control "author" author}}
</div>
   ```

    @method control
    @for Ember.Handlebars.helpers
    @param {String} path
    @param {String} modelPath
    @param {Hash} options
    @return {String} HTML string
  */
  Ember.Handlebars.registerHelper('control', function(path, modelPath, options) {
    if (arguments.length === 2) {
      options = modelPath;
      modelPath = undefined;
    }

    var model;

    if (modelPath) {
      model = Ember.Handlebars.get(this, modelPath, options);
    }

    var controller = options.data.keywords.controller,
        view = options.data.keywords.view,
        children = get(controller, '_childContainers'),
        controlID = options.hash.controlID,
        container, subContainer;

    if (children.hasOwnProperty(controlID)) {
      subContainer = children[controlID];
    } else {
      container = get(controller, 'container'),
      subContainer = container.child();
      children[controlID] = subContainer;
    }

    var normalizedPath = path.replace(/\//g, '.');

    var childView = subContainer.lookup('view:' + normalizedPath) || subContainer.lookup('view:default'),
        childController = subContainer.lookup('controller:' + normalizedPath),
        childTemplate = subContainer.lookup('template:' + path);

    Ember.assert("Could not find controller for path: " + normalizedPath, childController);
    Ember.assert("Could not find view for path: " + normalizedPath, childView);

    set(childController, 'target', controller);
    set(childController, 'model', model);

    options.hash.template = childTemplate;
    options.hash.controller = childController;

    function observer() {
      var model = Ember.Handlebars.get(this, modelPath, options);
      set(childController, 'model', model);
      childView.rerender();
    }

    if (modelPath) {
      Ember.addObserver(this, modelPath, observer);
      childView.one('willDestroyElement', this, function() {
        Ember.removeObserver(this, modelPath, observer);
      });
    }

    Ember.Handlebars.helpers.view.call(this, childView, options);
  });
}
