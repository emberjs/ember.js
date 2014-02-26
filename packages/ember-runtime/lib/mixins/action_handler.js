/**
@module ember
@submodule ember-runtime
*/

var get = Ember.get, typeOf = Ember.typeOf;

/**
  The `Ember.ActionHandler` mixin implements support for moving an `actions`
  property to an `_actions` property at extend time, and adding `_actions`
  to the object's mergedProperties list.

  `Ember.ActionHandler` is used internally by Ember in  `Ember.View`,
  `Ember.Controller`, and `Ember.Route`.

  @class ActionHandler
  @namespace Ember
*/
Ember.ActionHandler = Ember.Mixin.create({
  mergedProperties: ['_actions'],

  /**
    The collection of functions, keyed by name, available on this
    `ActionHandler` as action targets.

    These functions will be invoked when a matching `{{action}}` is triggered
    from within a template and the application's current route is this route.

    Actions can also be invoked from other parts of your application
    via `ActionHandler#send`.

    The `actions` hash will inherit action handlers from
    the `actions` hash defined on extended parent classes
    or mixins rather than just replace the entire hash, e.g.:

    ```js
    App.CanDisplayBanner = Ember.Mixin.create({
      actions: {
        displayBanner: function(msg) {
          // ...
        }
      }
    });

    App.WelcomeRoute = Ember.Route.extend(App.CanDisplayBanner, {
      actions: {
        playMusic: function() {
          // ...
        }
      }
    });

    // `WelcomeRoute`, when active, will be able to respond
    // to both actions, since the actions hash is merged rather
    // then replaced when extending mixins / parent classes.
    this.send('displayBanner');
    this.send('playMusic');
    ```

    Within a Controller, Route, View or Component's action handler,
    the value of the `this` context is the Controller, Route, View or
    Component object:

    ```js
    App.SongRoute = Ember.Route.extend({
      actions: {
        myAction: function() {
          this.controllerFor("song");
          this.transitionTo("other.route");
          ...
        }
      }
    });
    ```

    It is also possible to call `this._super()` from within an
    action handler if it overrides a handler defined on a parent
    class or mixin:

    Take for example the following routes:

    ```js
    App.DebugRoute = Ember.Mixin.create({
      actions: {
        debugRouteInformation: function() {
          console.debug("trololo");
        }
      }
    });

    App.AnnoyingDebugRoute = Ember.Route.extend(App.DebugRoute, {
      actions: {
        debugRouteInformation: function() {
          // also call the debugRouteInformation of mixed in App.DebugRoute
          this._super();

          // show additional annoyance
          window.alert(...);
        }
      }
    });
    ```

    ## Bubbling

    By default, an action will stop bubbling once a handler defined
    on the `actions` hash handles it. To continue bubbling the action,
    you must return `true` from the handler:

    ```js
    App.Router.map(function() {
      this.resource("album", function() {
        this.route("song");
      });
    });

    App.AlbumRoute = Ember.Route.extend({
      actions: {
        startPlaying: function() {
        }
      }
    });

    App.AlbumSongRoute = Ember.Route.extend({
      actions: {
        startPlaying: function() {
          // ...

          if (actionShouldAlsoBeTriggeredOnParentRoute) {
            return true;
          }
        }
      }
    });
    ```

    @property actions
    @type Hash
    @default null
  */

  /**
    Moves `actions` to `_actions` at extend time. Note that this currently
    modifies the mixin themselves, which is technically dubious but
    is practically of little consequence. This may change in the future.

    @private
    @method willMergeMixin
  */
  willMergeMixin: function(props) {
    var hashName;

    if (!props._actions) {
      Ember.assert("'actions' should not be a function", typeof(props.actions) !== 'function');

      if (typeOf(props.actions) === 'object') {
        hashName = 'actions';
      } else if (typeOf(props.events) === 'object') {
        Ember.deprecate('Action handlers contained in an `events` object are deprecated in favor of putting them in an `actions` object', false);
        hashName = 'events';
      }

      if (hashName) {
        props._actions = Ember.merge(props._actions || {}, props[hashName]);
      }

      delete props[hashName];
    }
  },

  /**
    Triggers a named action on the `ActionHandler`. Any parameters
    supplied after the `actionName` string will be passed as arguments
    to the action target function.

    If the `ActionHandler` has its `target` property set, actions may
    bubble to the `target`. Bubbling happens when an `actionName` can
    not be found in the `ActionHandler`'s `actions` hash or if the
    action target function returns `true`.

    Example

    ```js
    App.WelcomeRoute = Ember.Route.extend({
      actions: {
        playTheme: function() {
           this.send('playMusic', 'theme.mp3');
        },
        playMusic: function(track) {
          // ...
        }
      }
    });
    ```

    @method send
    @param {String} actionName The action to trigger
    @param {*} context a context to send with the action
  */
  send: function(actionName) {
    var args = [].slice.call(arguments, 1), target;

    if (this._actions && this._actions[actionName]) {
      if (this._actions[actionName].apply(this, args) === true) {
        // handler returned true, so this action will bubble
      } else {
        return;
      }
    } else if (!Ember.FEATURES.isEnabled('ember-routing-drop-deprecated-action-style') && this.deprecatedSend && this.deprecatedSendHandles && this.deprecatedSendHandles(actionName)) {
      Ember.warn("The current default is deprecated but will prefer to handle actions directly on the controller instead of a similarly named action in the actions hash. To turn off this deprecated feature set: Ember.FEATURES['ember-routing-drop-deprecated-action-style'] = true");
      if (this.deprecatedSend.apply(this, [].slice.call(arguments)) === true) {
        // handler return true, so this action will bubble
      } else {
        return;
      }
    }

    if (target = get(this, 'target') || get(this, 'targetObject')) {
      Ember.assert("The `target` for " + this + " (" + target + ") does not have a `send` method", typeof target.send === 'function');
      target.send.apply(target, arguments);
    }
  }

});
