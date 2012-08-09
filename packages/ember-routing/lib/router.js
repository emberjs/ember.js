require('ember-routing/route_matcher');
require('ember-routing/routable');
require('ember-routing/location');

var get = Ember.get, set = Ember.set;

var merge = function(original, hash) {
  for (var prop in hash) {
    if (!hash.hasOwnProperty(prop)) { continue; }
    if (original.hasOwnProperty(prop)) { continue; }

    original[prop] = hash[prop];
  }
};

/**
  @class

  `Ember.Router` is the subclass of `Ember.StateManager` responsible for providing URL-based
  application state detection. The `Ember.Router` instance of an application detects the browser URL
  at application load time and attempts to match it to a specific application state. Additionally
  the router will update the URL to reflect an application's state changes over time.

  ## Adding a Router Instance to Your Application
  An instance of Ember.Router can be associated with an instance of Ember.Application in one of two ways:

  You can provide a subclass of Ember.Router as the `Router` property of your application. An instance
  of this Router class will be instantiated and route detection will be enabled when the application's
  `initialize` method is called. The Router instance will be available as the `router` property
  of the application:

      App = Ember.Application.create({
        Router: Ember.Router.extend({ ... })
      });

      App.initialize();
      App.get('router') // an instance of App.Router

  If you want to define a Router instance elsewhere, you can pass the instance to the application's
  `initialize` method:

      App = Ember.Application.create();
      aRouter = Ember.Router.create({ ... });

      App.initialize(aRouter);
      App.get('router') // aRouter

  ## Adding Routes to a Router
  The `initialState` property of Ember.Router instances is named `root`. The state stored in this
  property must be a subclass of Ember.Route. The `root` route acts as the container for the
  set of routable states but is not routable itself. It should have states that are also subclasses
  of Ember.Route which each have a `route` property describing the URL pattern you would like to detect.

      App = Ember.Application.create({
        Router: Ember.Router.extend({
          root: Ember.Route.extend({
            index: Ember.Route.extend({
              route: '/'
            }),
            ... additional Ember.Routes ...
          })
        })
      });
      App.initialize();


  When an application loads, Ember will parse the URL and attempt to find an Ember.Route within
  the application's states that matches. (The example URL-matching below will use the default
  'hash syntax' provided by `Ember.HashLocation`.)

  In the following route structure:

      App = Ember.Application.create({
        Router: Ember.Router.extend({
          root: Ember.Route.extend({
            aRoute: Ember.Route.extend({
              route: '/'
            }),
            bRoute: Ember.Route.extend({
              route: '/alphabeta'
            })
          })
        })
      });
      App.initialize();

  Loading the page at the URL '#/' will detect the route property of 'root.aRoute' ('/') and
  transition the router first to the state named 'root' and then to the substate 'aRoute'.

  Respectively, loading the page at the URL '#/alphabeta' would detect the route property of
  'root.bRoute' ('/alphabeta') and transition the router first to the state named 'root' and
  then to the substate 'bRoute'.

  ## Adding Nested Routes to a Router
  Routes can contain nested subroutes each with their own `route` property describing the nested
  portion of the URL they would like to detect and handle. Router, like all instances of StateManager,
  cannot call `transitonTo` with an intermediary state. To avoid transitioning the Router into an
  intermediary state when detecting URLs, a Route with nested routes must define both a base `route`
  property for itself and a child Route with a `route` property of `'/'` which will be transitioned
  to when the base route is detected in the URL:

  Given the following application code:

      App = Ember.Application.create({
        Router: Ember.Router.extend({
          root: Ember.Route.extend({
            aRoute: Ember.Route.extend({
              route: '/theBaseRouteForThisSet',

              indexSubRoute: Ember.Route.extend({
                route: '/'
              }),

              subRouteOne: Ember.Route.extend({
                route: '/subroute1'
              }),

              subRouteTwo: Ember.Route.extend({
                route: '/subRoute2'
              })

            })
          })
        })
      });
      App.initialize();

  When the application is loaded at '/theBaseRouteForThisSet' the Router will transition to the route
  at path 'root.aRoute' and then transition to state 'indexSubRoute'.

  When the application is loaded at '/theBaseRouteForThisSet/subRoute1' the Router will transition to
  the route at path 'root.aRoute' and then transition to state 'subRouteOne'.

  ## Route Transition Events
  Transitioning between Ember.Route instances (including the transition into the detected
  route when loading the application)  triggers the same transition events as state transitions for
  base `Ember.State`s. However, the default `setup` transition event is named `connectOutlets` on
  Ember.Router instances (see 'Changing View Hierarchy in Response To State Change').

  The following route structure when loaded with the URL "#/"

      App = Ember.Application.create({
        Router: Ember.Router.extend({
          root: Ember.Route.extend({
            aRoute: Ember.Route.extend({
              route: '/',
              enter: function(router) {
                console.log("entering root.aRoute from", router.get('currentState.name'));
              },
              connectOutlets: function(router) {
                console.log("entered root.aRoute, fully transitioned to", router.get('currentState.path'));
              }
            })
          })
        })
      });
      App.initialize();

  Will result in console output of:

      'entering root.aRoute from root'
      'entered root.aRoute, fully transitioned to root.aRoute '

  Ember.Route has two additional callbacks for handling URL serialization and deserialization. See
  'Serializing/Deserializing URLs'

  ## Routes With Dynamic Segments
  An Ember.Route's `route` property can reference dynamic sections of the URL by prefacing a URL segment
  with the ':' character.  The values of these dynamic segments will be passed as a hash to the
  `deserialize` method of the matching Route (see 'Serializing/Deserializing URLs').

  ## Serializing/Deserializing URLs
  Ember.Route has two callbacks for associating a particular object context with a URL: `serialize`
  for converting an object into a parameters hash to fill dynamic segments of a URL and `deserialize`
  for converting a hash of dynamic segments from the URL into the appropriate object.

  ### Deserializing A URL's Dynamic Segments
  When an application is first loaded or the URL is changed manually (e.g. through the browser's
  back button) the `deserialize` method of the URL's matching Ember.Route will be called with
  the application's router as its first argument and a hash of the URLs dynamic segments and values
  as its second argument.

  The following route structure when loaded with the URL "#/fixed/thefirstvalue/anotherFixed/thesecondvalue":

      App = Ember.Application.create({
        Router: Ember.Router.extend({
          root: Ember.Route.extend({
            aRoute: Ember.Route.extend({
              route: '/fixed/:dynamicSectionA/anotherFixed/:dynamicSectionB',
              deserialize: function(router, params) {}
            })
          })
        })
      });
      App.initialize();

  Will call the 'deserialize' method of the Route instance at the path 'root.aRoute' with the
  following hash as its second argument:

      {
        dynamicSectionA: 'thefirstvalue',
        dynamicSectionB: 'thesecondvalue'
      }

  Within `deserialize` you should use this information to retrieve or create an appropriate context
  object for the given URL (e.g. by loading from a remote API or accessing the browser's
  `localStorage`). This object must be the `return` value of `deserialize` and will be
  passed to the Route's `connectOutlets` and `serialize` methods.

  When an application's state is changed from within the application itself, the context provided for
  the transition will be passed and `deserialize` is not called (see 'Transitions Between States').

  ### Serializing An Object For URLs with Dynamic Segments
  When transitioning into a Route whose `route` property contains dynamic segments the Route's
  `serialize` method is called with the Route's router as the first argument and the Route's
  context as the second argument.  The return value of `serialize` will be use to populate the
  dynamic segments and should be a object with keys that match the names of the dynamic sections.

  Given the following route structure:

      App = Ember.Application.create({
        Router: Ember.Router.extend({
          root: Ember.Route.extend({
            aRoute: Ember.Route.extend({
              route: '/'
            }),
            bRoute: Ember.Route.extend({
              route: '/staticSection/:someDynamicSegment',
              serialize: function(router, context) {
                return {
                  someDynamicSegment: context.get('name')
                }
              }
            })
          })
        })
      });
      App.initialize();


  Transitioning to "root.bRoute" with a context of `Object.create({name: 'Yehuda'})` will call
  the Route's `serialize` method with the context as its second argument and update the URL to
  '#/staticSection/Yehuda'.

  ## Transitions Between States
  Once a routed application has initialized its state based on the entry URL, subsequent transitions to other
  states will update the URL if the entered Route has a `route` property. Given the following route structure
  loaded at the URL '#/':

      App = Ember.Application.create({
        Router: Ember.Router.extend({
          root: Ember.Route.extend({
            aRoute: Ember.Route.extend({
              route: '/',
              moveElsewhere: Ember.Route.transitionTo('bRoute')
            }),
            bRoute: Ember.Route.extend({
              route: '/someOtherLocation'
            })
          })
        })
      });
      App.initialize();

  And application code:

      App.get('router').send('moveElsewhere');

  Will transition the application's state to 'root.bRoute' and trigger an update of the URL to
  '#/someOtherLocation'.

  For URL patterns with dynamic segments a context can be supplied as the second argument to `send`.
  The router will match dynamic segments names to keys on this object and fill in the URL with the
  supplied values. Given the following state structure loaded at the URL '#/':

      App = Ember.Application.create({
        Router: Ember.Router.extend({
          root: Ember.Route.extend({
            aRoute: Ember.Route.extend({
              route: '/',
              moveElsewhere: Ember.Route.transitionTo('bRoute')
            }),
            bRoute: Ember.Route.extend({
              route: '/a/route/:dynamicSection/:anotherDynamicSection',
              connectOutlets: function(router, context) {},
            })
          })
        })
      });
      App.initialize();

  And application code:

      App.get('router').send('moveElsewhere', {
        dynamicSection: '42',
        anotherDynamicSection: 'Life'
      });

  Will transition the application's state to 'root.bRoute' and trigger an update of the URL to
  '#/a/route/42/Life'.

  The context argument will also be passed as the second argument to the `serialize` method call.

  ## Injection of Controller Singletons
  During application initialization Ember will detect properties of the application ending in 'Controller',
  create singleton instances of each class, and assign them as a properties on the router.  The property name
  will be the UpperCamel name converted to lowerCamel format. These controller classes should be subclasses
  of Ember.ObjectController, Ember.ArrayController, Ember.Controller, or a custom Ember.Object that includes the
  Ember.ControllerMixin mixin.

      App = Ember.Application.create({
        FooController: Ember.Object.create(Ember.ControllerMixin),
        Router: Ember.Router.extend({ ... })
      });

      App.get('router.fooController'); // instance of App.FooController

  The controller singletons will have their `namespace` property set to the application and their `target`
  property set to the application's router singleton for easy integration with Ember's user event system.
  See 'Changing View Hierarchy in Response To State Change' and 'Responding to User-initiated Events'

  ## Responding to User-initiated Events
  Controller instances injected into the router at application initialization have their `target` property
  set to the application's router instance. These controllers will also be the default `context` for their
  associated views.  Uses of the `{{action}}` helper will automatically target the application's router.

  Given the following application entered at the URL '#/':

      App = Ember.Application.create({
        Router: Ember.Router.extend({
          root: Ember.Route.extend({
            aRoute: Ember.Route.extend({
              route: '/',
              anActionOnTheRouter: function(router, context) {
                router.transitionTo('anotherState', context);
              }
            })
            anotherState: Ember.Route.extend({
              route: '/differentUrl',
              connectOutlets: function(router, context) {

              }
            })
          })
        })
      });
      App.initialize();

  The following template:

      <script type="text/x-handlebars" data-template-name="aView">
          <h1><a {{action anActionOnTheRouter}}>{{title}}</a></h1>
      </script>

  Will delegate `click` events on the rendered `h1` to the application's router instance. In this case the
  `anActionOnTheRouter` method of the state at 'root.aRoute' will be called with the view's controller
  as the context argument. This context will be passed to the `connectOutlets` as its second argument.

  Different `context` can be supplied from within the `{{action}}` helper, allowing specific context passing
  between application states:

      <script type="text/x-handlebars" data-template-name="photos">
        {{#each photo in controller}}
          <h1><a {{action showPhoto photo}}>{{title}}</a></h1>
        {{/each}}
      </script>

  See Handlebars.helpers.action for additional usage examples.


  ## Changing View Hierarchy in Response To State Change
  Changes in application state that change the URL should be accompanied by associated changes in view
  hierarchy.  This can be accomplished by calling 'connectOutlet' on the injected controller singletons from
  within the 'connectOutlets' event of an Ember.Route:

      App = Ember.Application.create({
        OneController: Ember.ObjectController.extend(),
        OneView: Ember.View.extend(),

        AnotherController: Ember.ObjectController.extend(),
        AnotherView: Ember.View.extend(),

        Router: Ember.Router.extend({
          root: Ember.Route.extend({
            aRoute: Ember.Route.extend({
              route: '/',
              connectOutlets: function(router, context) {
                router.get('oneController').connectOutlet('another');
              },
            })
          })
        })
      });
      App.initialize();


  This will detect the '{{outlet}}' portion of `oneController`'s view (an instance of `App.OneView`) and
  fill it with a rendered instance of `App.AnotherView` whose `context` will be the single instance of
  `App.AnotherController` stored on the router in the `anotherController` property.

  For more information about Outlets, see `Ember.Handlebars.helpers.outlet`. For additional information on
  the `connectOutlet` method, see `Ember.Controller.connectOutlet`. For more information on
  controller injections, see `Ember.Application#initialize()`. For additional information about view context,
  see `Ember.View`.

  @extends Ember.StateManager
*/
Ember.Router = Ember.StateManager.extend(
/** @scope Ember.Router.prototype */ {

  /**
    @property {String}
    @default 'root'
  */
  initialState: 'root',

  /**
    The `Ember.Location` implementation to be used to manage the application
    URL state. The following values are supported:

    * 'hash': Uses URL fragment identifiers (like #/blog/1) for routing.
    * 'none': Does not read or set the browser URL, but still allows for
      routing to happen. Useful for testing.

    @type String
    @default 'hash'
  */
  location: 'hash',

  /**
    This is only used when a history location is used so that applications that
    don't live at the root of the domain can append paths to their root.

    @type String
    @default '/'
  */

  rootURL: '/',

  /**
    On router, transitionEvent should be called connectOutlets

    @property {String}
    @default 'connectOutlets'
  */
  transitionEvent: 'connectOutlets',

  transitionTo: function() {
    this.abortRoutingPromises();
    this._super.apply(this, arguments);
  },

  route: function(path) {
    this.abortRoutingPromises();

    set(this, 'isRouting', true);

    var routableState;

    try {
      path = path.replace(/^(?=[^\/])/, "/");

      this.send('navigateAway');
      this.send('unroutePath', path);

      routableState = get(this, 'currentState');
      while (routableState && !routableState.get('isRoutable')) {
        routableState = get(routableState, 'parentState');
      }
      var currentURL = routableState ? routableState.absoluteRoute(this) : '';
      var rest = path.substr(currentURL.length);

      this.send('routePath', rest);
    } finally {
      set(this, 'isRouting', false);
    }

    routableState = get(this, 'currentState');
    while (routableState && !routableState.get('isRoutable')) {
      routableState = get(routableState, 'parentState');
    }

    if (routableState) {
      routableState.updateRoute(this, get(this, 'location'));
    }
  },

  urlFor: function(path, hash) {
    var currentState = get(this, 'currentState') || this,
        state = this.findStateByPath(currentState, path);

    Ember.assert(Ember.String.fmt("Could not find route with path '%@'", [path]), !!state);
    Ember.assert("To get a URL for a state, it must have a `route` property.", !!get(state, 'routeMatcher'));

    var location = get(this, 'location'),
        absoluteRoute = state.absoluteRoute(this, hash);

    return location.formatURL(absoluteRoute);
  },

  urlForEvent: function(eventName) {
    var contexts = Array.prototype.slice.call(arguments, 1);
    var currentState = get(this, 'currentState');
    var targetStateName = currentState.lookupEventTransition(eventName);

    Ember.assert(Ember.String.fmt("You must specify a target state for event '%@' in order to link to it in the current state '%@'.", [eventName, get(currentState, 'path')]), !!targetStateName);

    var targetState = this.findStateByPath(currentState, targetStateName);

    Ember.assert("Your target state name " + targetStateName + " for event " + eventName + " did not resolve to a state", !!targetState);

    var hash = this.serializeRecursively(targetState, contexts, {});

    return this.urlFor(targetStateName, hash);
  },

  /** @private */
  serializeRecursively: function(state, contexts, hash) {
    var parentState,
        context = get(state, 'hasContext') ? contexts.pop() : null;
    merge(hash, state.serialize(this, context));
    parentState = state.get("parentState");
    if (parentState && parentState instanceof Ember.Route) {
      return this.serializeRecursively(parentState, contexts, hash);
    } else {
      return hash;
    }
  },

  abortRoutingPromises: function() {
    if (this._routingPromises) {
      this._routingPromises.abort();
      this._routingPromises = null;
    }
  },

  /**
    @private
  */
  handleStatePromises: function(states, complete) {
    this.abortRoutingPromises();

    this.set('isLocked', true);

    var manager = this;

    this._routingPromises = Ember._PromiseChain.create({
      promises: states.slice(),

      successCallback: function() {
        manager.set('isLocked', false);
        complete();
      },

      failureCallback: function() {
        throw "Unable to load object";
      },

      promiseSuccessCallback: function(item, args) {
        set(item, 'object', args[0]);
      },

      abortCallback: function() {
        manager.set('isLocked', false);
      }
    }).start();
  },

  /** @private */
  init: function() {
    this._super();

    var location = get(this, 'location'),
        rootURL = get(this, 'rootURL');

    if ('string' === typeof location) {
      set(this, 'location', Ember.Location.create({
        implementation: location,
        rootURL: rootURL
      }));
    }
  },

  /** @private */
  willDestroy: function() {
    get(this, 'location').destroy();
  }
});
