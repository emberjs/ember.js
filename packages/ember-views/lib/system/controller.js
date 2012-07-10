var get = Ember.get, set = Ember.set;

Ember.ControllerMixin.reopen({

  target: null,
  controllers: null,
  namespace: null,
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

        applicationController.connectOutlet('posts');

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

        applicationController.connectOutlet('posts', App.Post.find());

    You can specify a particular outlet to use. For example, if your main
    template looks like:

        <h1>My Blog</h1>
        {{outlet master}}
        {{outlet detail}}

    You can assign an `App.PostsView` to the master outlet:

        applicationController.connectOutlet({
          name: 'posts',
          outletName: 'master',
          context: App.Post.find()
        });

    In effort to allow typing ease without having to provide yet another
    confguration object, the following sugar invocation is provided which
    utilizes the conventions.  This invocation also provides a means to
    summarize this methods arguments

         applicationController.connectOutelet('hoot:owlet', { name: 'Woodsy' });

    The first argument is split() into the value for 'name' and the value for
    'outletName'.  The second argument, the object, is assigned to 'context'.

   As such, this shortened format expresses:
     * Assume that the Application defines HootView
     * Assume that the Application defines HootController
     * Application.ApplicationView uses a template that contains
       and {{outlet}} called 'owlet' i.e. {{outlet owlet}}
     * HootController's content should be set to the second argument
     * Ergo, in HootView, a {{ content.name }} call should print 'Woodsy'

    @param {String} name a view class to instantiate or a 'quickstring' containing the ':' character.  Alternatively it could be an object that defines they necessary pairs to which the argument list is a proxy.
    @param {Object} context a context object to assign to the
      controller's `content` property, if a controller can be
      found (optional)
  */
  connectOutlet: function(name, context) {
    var outletName, viewClass, view, controller, options,

      variableizeOptionsObject = function(options){
        options = name;
        outletName = options.outletName;
        name = options.name;
        viewClass = options.viewClass;
        controller = options.controller;
        context = options.context;
      };

    if ( arguments.length === 1 ){
      if ( Ember.typeOf(name) === "string" ){
        options = {};
      } else if ( Ember.typeOf( name ) === "object" ){
        variableizeOptionsObject( name );
      }
    }

    if ( arguments.length === 2 ){
      if (  /:/.test(name) ){  // String "short" syntax
        var tokens = name.split(/:/);
        name       = tokens[0];
        outletName = tokens[1];
        var mfgdObject = {
              name: name,
              outletName: outletName,
              context: context
            };
        view = this.connectOutlet( mfgdObject );
        set(this, 'view', view);
      }
    }

    outletName = outletName || 'view';

    Ember.assert("You must supply a name or a view class to connectOutlets, but not both", (!!name && !viewClass && !controller) || (!name && !!viewClass));

    if (name) {
      var namespace     = get(this, 'namespace'),
          controllers   = get(this, 'controllers');

      var viewClassName       = name.charAt(0).toUpperCase() + name.substr(1) + "View",
          controllerClassName = name + 'Controller';

      viewClass         = get(namespace, viewClassName);
      controller        = get(controllers, controllerClassName);

      Ember.assert("The name you supplied " + name + " did not resolve to a view " + viewClassName, !!viewClass);
      Ember.assert("The name you supplied " + name + " did not resolve to a controller " + controllerClassName, (!!controller && !!context) || !context);
    }

    if (controller && context) { controller.set('content', context); }
    view = view || viewClass.create();
    if (controller) { set(view, 'controller', controller); }
    set(this, outletName, view);

    return view;
  }
});

