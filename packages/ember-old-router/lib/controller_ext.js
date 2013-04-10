/**
@module ember
@submodule ember-old-router
*/

var get = Ember.get, set = Ember.set;

/**
Additional methods for the ControllerMixin

@class ControllerMixin
@namespace Ember
*/
Ember.ControllerMixin.reopen(Ember.Filters, {
  controllers: null,

  /**
    `connectOutlet` creates a new instance of a provided view
    class, wires it up to its associated controller, and
    assigns the new view to a property on the current controller.

    The purpose of this method is to enable views that use
    outlets to quickly assign new views for a given outlet.

    For example, an application view's template may look like
    this:

    ``` handlebars
    <h1>My Blog</h1>
    {{outlet}}
    ```

    The view for this outlet is specified by assigning a
    `view` property to the application's controller. The
    following code will assign a new `App.PostsView` to
    that outlet:

    ``` javascript
    applicationController.connectOutlet('posts');
    ```

    In general, you will also want to assign a controller
    to the newly created view. By convention, a controller
    named `postsController` will be assigned as the view's
    controller.

    In an application initialized using `app.initialize(router)`,
    `connectOutlet` will look for `postsController` on the
    router. The initialization process will automatically
    create an instance of `App.PostsController` called
    `postsController`, so you don't need to do anything
    beyond `connectOutlet` to assign your view and wire it
    up to its associated controller.

    You can supply a `content` for the controller by supplying
    a final argument after the view class:

    ``` javascript
    applicationController.connectOutlet('posts', App.Post.find());
    ```

    You can specify a particular outlet to use. For example, if your main
    template looks like:

    ``` handlebars
    <h1>My Blog</h1>
    {{outlet masterView}}
    {{outlet detailView}}
    ```

    You can assign an `App.PostsView` to the masterView outlet:

    ``` javascript
    applicationController.connectOutlet({
      outletName: 'masterView',
      name: 'posts',
      context: App.Post.find()
    });
    ```

    You can write this as:

    ``` javascript
    applicationController.connectOutlet('masterView', 'posts', App.Post.find());
    ```


    @method connectOutlet
    @param {String} outletName a name for the outlet to set
    @param {String} name a view/controller pair name
    @param {Object} context a context object to assign to the
      controller's `content` property, if a controller can be
      found (optional)
  */
  connectOutlet: function(name, context) {
    // Normalize arguments. Supported arguments:
    //
    // name
    // name, context
    // outletName, name
    // outletName, name, context
    // options
    //
    // The options hash has the following keys:
    //
    //   name: the name of the controller and view
    //     to use. If this is passed, the name
    //     determines the view and controller.
    //   outletName: the name of the outlet to
    //     fill in. default: 'view'
    //   viewClass: the class of the view to instantiate
    //   controller: the controller instance to pass
    //     to the view
    //   context: an object that should become the
    //     controller's `content` and thus the
    //     template's context.

    this.fbefore('connectOutlet', arguments);

    var outletName, viewClass, view, controller, options;

    if (Ember.typeOf(context) === 'string') {
      outletName = name;
      name = context;
      context = arguments[2];
    }

    if (arguments.length === 1) {
      if (Ember.typeOf(name) === 'object') {
        options = name;
        outletName = options.outletName;
        name = options.name;
        viewClass = options.viewClass;
        controller = options.controller;
        context = options.context;
      }
    } else {
      options = {};
    }

    outletName = outletName || 'view';

    Ember.assert("The viewClass is either missing or the one provided did not resolve to a view", !!name || (!name && !!viewClass));

    Ember.assert("You must supply a name or a viewClass to connectOutlet, but not both", (!!name && !viewClass && !controller) || (!name && !!viewClass));

    if (name) {
      var namespace = get(this, 'namespace'),
          controllers = get(this, 'controllers');

      var viewClassName = name.charAt(0).toUpperCase() + name.substr(1) + "View";
      viewClass = get(namespace, viewClassName);
      controller = get(controllers, name + 'Controller');

      Ember.assert("The name you supplied '" + name + "' did not resolve to a view " + viewClassName, !!viewClass);
      Ember.assert("The name you supplied '" + name + "' did not resolve to a controller " + name + 'Controller', (!!controller && !!context) || !context);
    }

    if (controller && context) { set(controller, 'content', context); }

    view = this.createOutletView(outletName, viewClass);

    if (controller) { set(view, 'controller', controller); }
    set(this, outletName, view);

    return view;
  },

  /**
    Convenience method to connect controllers. This method makes other controllers
    available on the controller the method was invoked on.

    For example, to make the `personController` and the `postController` available
    on the `overviewController`, you would call:

    ```javascript
    overviewController.connectControllers('person', 'post');
    ```

    @method connectControllers
    @param {String...} controllerNames the controllers to make available
  */
  connectControllers: function() {
    this.fbefore('connectControllers', this, arguments);

    var controllers = get(this, 'controllers'),
        controllerNames = Array.prototype.slice.apply(arguments),
        controllerName;

    for (var i=0, l=controllerNames.length; i<l; i++) {
      controllerName = controllerNames[i] + 'Controller';
      set(this, controllerName, get(controllers, controllerName));
    }
  },

  /**
    `disconnectOutlet` removes previously attached view from given outlet.

    @method disconnectOutlet
    @param  {String} outletName the outlet name. (optional)
   */
  disconnectOutlet: function(outletName) {
    this.fbefore('disconnectOutlet', this, arguments);
    
    outletName = outletName || 'view';

    set(this, outletName, null);
  },

  /**
    `createOutletView` is a hook you may want to override if you need to do
    something special with the view created for the outlet. For example
    you may want to implement views sharing across outlets.

    @method createOutletView
    @param outletName {String}
    @param viewClass {Ember.View}
  */
  createOutletView: function(outletName, viewClass) {
    return viewClass.create();
  },

  urlForEvent: function(event, context) {
    var target = get(this, 'target');

    if (target) {
      return target.urlForEvent(event, context);
    }
  }
});

