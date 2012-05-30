var get = Ember.get, set = Ember.set;

Ember.ControllerMixin.reopen({

  target: null,
  controllers: null,
  view: null,

  /**
    `connectOutlet` creates a new instance of a provided view
    class, wires it up to its associated controller, and
    assigns the new view to a property on the current controller.

    The purpose of this method is to enable views that use
    outlets to quickly assign new views for a given outlet.

    For example, an application view's template may look like
    this:

        <h1>My Blog</h1>
        {{outlet}}

    The view for this outlet is specified by assigning a
    `view` property to the application's controller. The
    following code will assign a new `App.PostsView` to
    that outlet:

        applicationController.connectOutlet(App.PostsView);

    You can specify a particular outlet to use as the first
    parameter to `connectOutlet`. For example, if your
    main template looks like:

        <h1>My Blog</h1>
        {{outlet master}}
        {{outlet detail}}

    You can assign an `App.PostsView` to the master outlet:

        applicationController.connectOutlet('master', App.PostsView);

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

        applicationController.connectOutlet(App.PostsView, App.Post.find());

    The only required argument is `viewClass`. You can optionally
    specify an `outletName` before `viewClass` and/or a `context`
    after `viewClass` in any combination.

    @param {String} outletName the name of the outlet to assign
      the newly created view to (optional)
    @param {Class} viewClass a view class to instantiate
    @param {Object} context a context object to assign to the
      controller's `content` property, if a controller can be
      found.
  */
  connectOutlet: function(outletName, viewClass, context) {
    // Normalize arguments. Supported arguments:
    //
    // viewClass
    // outletName, viewClass
    // viewClass, context
    // outletName, viewClass, context
    if (arguments.length === 2) {
      if (Ember.Object.detect(outletName)) {
        context = viewClass;
        viewClass = outletName;
        outletName = 'view';
      }
    } else if (arguments.length === 1) {
      viewClass = outletName;
      outletName = 'view';
    }

    var parts = viewClass.toString().split("."),
        last = parts[parts.length - 1],
        match = last.match(/^(.*)View$/);

    Ember.assert("The parameter you pass to connectOutlet must be a class ending with View", !!match);

    var bareName = match[1], controllerName;
    bareName = bareName.charAt(0).toLowerCase() + bareName.substr(1);

    controllerName = bareName + "Controller";

    var controller = get(get(this, 'controllers'), controllerName);

    Ember.assert("You specified a context, but no " + controllerName + " was found", !context || !!controller);
    if (context) { controller.set('content', context); }

    var view = viewClass.create({ controller: controller });
    set(this, outletName, view);

    return view;
  }
});

