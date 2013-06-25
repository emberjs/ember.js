var get = Ember.get, set = Ember.set;





/**
  `Ember.control` lets you instantiate a controller + view pair that is not part of your normal routing flow.
 
  This is very useful for programmatically creating views such as modals and popover menus that you want to use
  controller logic for, but don't represent a route.

  The `target` parameter should be a controller or a route. Ember uses this parameter to something...
  Normally you would call `Ember.control` from within a [route]{@link Ember.Route#control} or a
  [controller]{@link Ember.ControllerMixin#control}. To make that easier, you can just call `this.control` directly from
  within routes and controllers, and thereby omit the `target` parameter.
 
  Here is an example of using `this.control` from within a controller:
 
  ```javascript
  App.PostsShowController = Ember.ObjectController.extend({
    edit: function() {
      var controller = this.control('posts.edit', this.get('model'));
    }
  });
  ```
  
  Ember will, based on the `name` parameter, create a controller from the class `App.PostsEditController` (not a singleton),
  a view from the class `App.PostsEditView`, and use the template `posts.edit` (normalized to `posts/edit`).
  The naming convention works just like everything else in Ember, e.g. route names.
 
  The second argument to `Ember.control` is an optional `model`. This will be set as the `model` property on your controller. 
 
  `Ember.control` returns the created controller. You can access the view through the controller with
  `controller.get('view')`.
 
  In the above example the modal controller and view could be defined like this:
 
  ```javascript
  App.PostsEditController = Ember.ObjectController.extend({
    save: function() {
      //...commit model, and close when successful
      this.close();
    },
    cancel: function() {
      //...rollback any changes
      this.close();
    },
    close: function() {
      this.get('view').destroy(); //Or fade it out first, if you're really fancy
      this.destroy();
    }
  });
 
  App.PostsEditView = Ember.View.extend({
    classNames: ['modal']
  });
  ```
 
  And the `posts/edit` template:
 
  ```handlebars
  <h1>Edit post</h1>
  {{input valueBinding="title"}}<br>
  <button {{action save}}>Save</button> <button {{action cancel}}>Cancel</button>
  ```
 
  `Ember.control` also supports specifying an object with `controllerClass`, `viewClass`, `template` and `templateName`
  properties instead of a string in the `name` parameter. You can use this feature if your controller or view don't
  adhere to the naming conventions (which they should!). The following is equivalent to our example above:

  ```javascript
  App.PostsShowController = Ember.ObjectController.extend({
    edit: function() {
      var controller = this.control({
        controllerClass: App.PostsEditController,
        viewClass: App.PostsEditView,
        templateName: 'posts/edit',
        template: Ember.Handlebars.compile('...')
      }, this.get('model');
    }
  });
  ```
  
  `controllerClass` is required. Either `viewClass` or one of `templateName` and `template` is required. If `viewClass`
  is not set, a simple `Ember.View` will be used. You should only specify either `templateName` (the name of a template)
  or `template` (a compiled template). If you don't set a template, the `viewClass`' template will be used.
 
  From within the instantiated controller you can call `transitionToRoute`, use `needs` and anything else that a normal
  controller supports.
 
  @param {Ember.ControllerMixin|Ember.Route} target Will be set as the `target` on your controller, which makes it
    possible to use `transitionToRoute` and other normal controller behavior.
  @param {String|Object} name Either the name of your controller, view and/or template. Or an object with a
    `controllerClass` property, and at least one of the following properties: `viewClass`, `template`, `templateName`. 
  @param {Object} [model] An optional object to set as the `model` property on your controller.
  @param {Object} [properties] Optional extra properties that should be set on the controller.
  @returns Ember.Controller The instantiated controller. You can access the view via the controller through the
    controller's `view` property.
*/
Ember.control = function(target, name, model, properties) {
  var container = get(target, 'container'),
    normalizedName,
    childControllerClass,
    childController,
    childViewClass,
    childView,
    template,
    templateName;
  if (Ember.typeOf(name) === 'object') {
    //Setup controller
    childControllerClass = name.controllerClass;
    Ember.assert("No `controllerClass` supplied to Ember.control", childControllerClass);
    childController = childControllerClass.create();
    //Find view and template
    childViewClass = name.viewClass;
    template = name.template;
    templateName = name.templateName;
    Ember.assert("No `viewClass`, `template` or `templateName` supplied to Ember.control", childViewClass || template || templateName);
    Ember.assert("You can't set both `template` and `templateName` with Ember.control", !template || !templateName);
    if (templateName) {
      template = container.lookup('template:' + container.normalize(templateName));
    }
  } else {
    normalizedName = container.normalize(name);
    //Setup controller
    childController = container.lookup('controller:' + normalizedName, {singleton: false});
    Ember.assert("No controller for `" + name + "` found", childController);
    //Setup view and template
    childViewClass = container.resolve('view:' + normalizedName);
    template = container.lookup('template:' + normalizedName);
    Ember.assert("No view or template found for `" + name + "`", childViewClass || template);
  }
  //Set controller properties
  set(childController, 'target', target);
  if (model) {
    set(childController, 'model', model);
  }
  if (properties) {
    childController.setProperties(properties);
  }
  //Instantiate view
  childViewClass = childViewClass || container.resolve('view:default');
  childView = childViewClass.create();
  if (template && !get(childView, 'template')) {
    set(childView, 'template', template);
  }
  set(childView, 'controller', childController);
  set(childController, 'view', childView);
  return childController;
};