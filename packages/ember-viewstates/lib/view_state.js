require('ember-states/state');

var get = Ember.get, set = Ember.set;
/**
  @class

  Ember.ViewState extends Ember.State to control the presence of a childView within a
  container based on the current state of the ViewState's StateManager.

  ## Interactions with Ember's View System.
  When combined with instances of `Ember.StateManager`, ViewState is designed to
  interact with Ember's view system to control which views are added to
  and removed from the DOM based on the manager's current state.

  By default, a StateManager will manage views inside the 'body' element. This can be
  customized by setting the `rootElement` property to a CSS selector of an existing
  HTML element you would prefer to receive view rendering.


      viewStates = Ember.StateManager.create({
        rootElement: '#some-other-element'
      })

  You can also specify a particular instance of `Ember.ContainerView` you would like to receive
  view rendering by setting the `rootView` property. You will be responsible for placing
  this element into the DOM yourself.

      aLayoutView = Ember.ContainerView.create()

      // make sure this view instance is added to the browser
      aLayoutView.appendTo('body')

      App.viewStates = Ember.StateManager.create({
        rootView: aLayoutView
      })


  Once you have an instance of StateManager controlling a view, you can provide states
  that are instances of `Ember.ViewState`.  When the StateManager enters a state
  that is an instance of `Ember.ViewState` that `ViewState`'s `view` property will be
  instantiated and inserted into the StateManager's `rootView` or `rootElement`.
  When a state is exited, the `ViewState`'s view will be removed from the StateManager's
  view.

      ContactListView = Ember.View.extend({
        classNames: ['my-contacts-css-class'],
        template: Ember.Handlebars.compile('<h2>People</h2>')
      })

      PhotoListView = Ember.View.extend({
        classNames: ['my-photos-css-class'],
        template: Ember.Handlebars.compile('<h2>Photos</h2>')
      })

      viewStates = Ember.StateManager.create({
        showingPeople: Ember.ViewState.create({
          view: ContactListView
        }),
        showingPhotos: Ember.ViewState.create({
          view: PhotoListView
        })
      })

      viewStates.transitionTo('showingPeople')

  The above code will change the rendered HTML from

      <body></body>

  to

      <body>
        <div id="ember1" class="ember-view my-contacts-css-class">
          <h2>People</h2>
        </div>
      </body>

  Changing the current state via `transitionTo` from `showingPeople` to
  `showingPhotos` will remove the `showingPeople` view and add the `showingPhotos` view:

      viewStates.transitionTo('showingPhotos')

  will change the rendered HTML to

      <body>
        <div id="ember2" class="ember-view my-photos-css-class">
          <h2>Photos</h2>
        </div>
      </body>


  When entering nested `ViewState`s, each state's view will be draw into the the StateManager's
  `rootView` or `rootElement` as siblings.


      ContactListView = Ember.View.extend({
        classNames: ['my-contacts-css-class'],
        template: Ember.Handlebars.compile('<h2>People</h2>')
      })

      EditAContactView = Ember.View.extend({
        classNames: ['editing-a-contact-css-class'],
        template: Ember.Handlebars.compile('Editing...')
      })

      viewStates = Ember.StateManager.create({
        showingPeople: Ember.ViewState.create({
          view: ContactListView,

          withEditingPanel: Ember.ViewState.create({
            view: EditAContactView
          })
        })
      })


      viewStates.transitionTo('showingPeople.withEditingPanel')


  Will result in the following rendered HTML:

      <body>
        <div id="ember2" class="ember-view my-contacts-css-class">
          <h2>People</h2>
        </div>

        <div id="ember2" class="ember-view editing-a-contact-css-class">
          Editing...
        </div>
      </body>


  ViewState views are added and removed from their StateManager's view via their
  `enter` and `exit` methods. If you need to override these methods, be sure to call
  `_super` to maintain the adding and removing behavior:

      viewStates = Ember.StateManager.create({
        aState: Ember.ViewState.create({
          view: Ember.View.extend({}),
          enter: function(manager){
            // calling _super ensures this view will be
            // properly inserted
            this._super(manager);

            // now you can do other things
          }
        })
      })

  ## Managing Multiple Sections of A Page With States
  Multiple StateManagers can be combined to control multiple areas of an application's rendered views.
  Given the following HTML body:

      <body>
        <div id='sidebar-nav'>
        </div>
        <div id='content-area'>
        </div>
      </body>

  You could separately manage view state for each section with two StateManagers

      navigationStates = Ember.StateManager.create({
        rootElement: '#sidebar-nav',
        userAuthenticated: Em.ViewState.create({
          view: Ember.View.extend({})
        }),
        userNotAuthenticated: Em.ViewState.create({
          view: Ember.View.extend({})
        })
      })

      contentStates = Ember.StateManager.create({
        rootElement: '#content-area',
        books: Em.ViewState.create({
          view: Ember.View.extend({})
        }),
        music: Em.ViewState.create({
          view: Ember.View.extend({})
        })
      })


  If you prefer to start with an empty body and manage state programmatically you
  can also take advantage of StateManager's `rootView` property and the ability of
  `Ember.ContainerView`s to manually manage their child views.


      dashboard = Ember.ContainerView.create({
        childViews: ['navigationAreaView', 'contentAreaView'],
        navigationAreaView: Ember.ContainerView.create({}),
        contentAreaView: Ember.ContainerView.create({})
      })

      navigationStates = Ember.StateManager.create({
        rootView: dashboard.get('navigationAreaView'),
        userAuthenticated: Em.ViewState.create({
          view: Ember.View.extend({})
        }),
        userNotAuthenticated: Em.ViewState.create({
          view: Ember.View.extend({})
        })
      })

      contentStates = Ember.StateManager.create({
        rootView: dashboard.get('contentAreaView'),
        books: Em.ViewState.create({
          view: Ember.View.extend({})
        }),
        music: Em.ViewState.create({
          view: Ember.View.extend({})
        })
      })

      dashboard.appendTo('body')

  ## User Manipulation of State via `{{action}}` Helpers
  The Handlebars `{{action}}` helper is StateManager-aware and will use StateManager action sending
  to connect user interaction to action-based state transitions.

  Given the following body and handlebars template

      <body>
        <script type='text/x-handlebars'>
          <a href="#" {{action "anAction" target="App.appStates"}}> Go </a>
        </script>
      </body>

  And application code

      App = Ember.Application.create()
      App.appStates = Ember.StateManager.create({
        initialState: 'aState',
        aState: Ember.State.create({
          anAction: function(manager, context){}
        }),
        bState: Ember.State.create({})
      })

  A user initiated click or touch event on "Go" will trigger the 'anAction' method of
  `App.appStates.aState` with `App.appStates` as the first argument and a
  `jQuery.Event` object as the second object. The `jQuery.Event` will include a property
  `view` that references the `Ember.View` object that was interacted with.

**/
Ember.ViewState = Ember.State.extend(
/** @scope Ember.ViewState.prototype */ {
  isViewState: true,

  init: function() {
    Ember.deprecate("Ember.ViewState is deprecated and will be removed from future releases. Consider using the outlet pattern to display nested views instead. For more information, see http://emberjs.com/guides/outlets/.");
    return this._super();
  },

  enter: function(stateManager) {
    var view = get(this, 'view'), root, childViews;

    if (view) {
      if (Ember.View.detect(view)) {
        view = view.create();
        set(this, 'view', view);
      }

      Ember.assert('view must be an Ember.View', view instanceof Ember.View);

      root = stateManager.get('rootView');

      if (root) {
        childViews = get(root, 'childViews');
        childViews.pushObject(view);
      } else {
        root = stateManager.get('rootElement') || 'body';
        view.appendTo(root);
      }
    }
  },

  exit: function(stateManager) {
    var view = get(this, 'view');

    if (view) {
      // If the view has a parent view, then it is
      // part of a view hierarchy and should be removed
      // from its parent.
      if (get(view, 'parentView')) {
        view.removeFromParent();
      } else {

        // Otherwise, the view is a "root view" and
        // was appended directly to the DOM.
        view.remove();
      }
    }
  }
});
