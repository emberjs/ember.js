var set = Ember.set,
    get = Ember.get;

if (Ember.FEATURES.isEnabled("computed-controller")) {
  /**
    A computed property that creates a controller. This computed property should
    only be used on a controller. The controller class is specified by
    `controllerName` and must be explicitly defined. The content of the
    controller must be specified by the `contentPath` parameter. The generated
    controller has access to the parent controller through its `parentController`
    property. Any actions emitted from the generated controller will pass through
    the parent controller.

    ```javascript
    App.PostController = Ember.ObjectController.extend({
      comments: Ember.computed.controller('comments', 'model.comments');
    });

    // Must be defined
    App.CommentsController = Ember.ArrayController.extend();
    ```

    @method computed.controller
    @for Ember
    @param {String} controllerName
    @param {String} contentPath
    @return {Ember.ComputedProperty} computed property which creates a
    controller with content from `contentPath`.
  */
  Ember.computed.controller = function(controllerName, contentPath) {
    return Ember.computed(contentPath, function() {
      var fullName = 'controller:' + controllerName;
      var controller = this.container.lookup(fullName, {singleton: false});

      set(controller, 'content', get(this, contentPath));
      set(controller, 'parentController', this);
      set(controller, 'target', this);
      return controller;
    });
  };
}