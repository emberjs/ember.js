/**
@module ember
*/
import Mixin from '@ember/object/mixin';
import { get } from '@ember/-internals/metal';
import { assert } from '@ember/debug';
const ActionHandler = Mixin.create({
  mergedProperties: ['actions'],
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
       ```app/mixins/can-display-banner.js
    import Mixin from '@ember/object/mixin';
       export default Mixin.create({
      actions: {
        displayBanner(msg) {
          // ...
        }
      }
    });
    ```
       ```app/routes/welcome.js
    import Route from '@ember/routing/route';
    import CanDisplayBanner from '../mixins/can-display-banner';
       export default Route.extend(CanDisplayBanner, {
      actions: {
        playMusic() {
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
       Within a Controller, Route or Component's action handler,
    the value of the `this` context is the Controller, Route or
    Component object:
       ```app/routes/song.js
    import Route from '@ember/routing/route';
       export default Route.extend({
      actions: {
        myAction() {
          this.controllerFor("song");
          this.transitionTo("other.route");
          ...
        }
      }
    });
    ```
       It is also possible to call `this._super(...arguments)` from within an
    action handler if it overrides a handler defined on a parent
    class or mixin:
       Take for example the following routes:
       ```app/mixins/debug-route.js
    import Mixin from '@ember/object/mixin';
       export default Mixin.create({
      actions: {
        debugRouteInformation() {
          console.debug("It's a-me, console.debug!");
        }
      }
    });
    ```
       ```app/routes/annoying-debug.js
    import Route from '@ember/routing/route';
    import DebugRoute from '../mixins/debug-route';
       export default Route.extend(DebugRoute, {
      actions: {
        debugRouteInformation() {
          // also call the debugRouteInformation of mixed in DebugRoute
          this._super(...arguments);
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
       ```app/router.js
    Router.map(function() {
      this.route("album", function() {
        this.route("song");
      });
    });
    ```
       ```app/routes/album.js
    import Route from '@ember/routing/route';
       export default Route.extend({
      actions: {
        startPlaying: function() {
        }
      }
    });
    ```
       ```app/routes/album-song.js
    import Route from '@ember/routing/route';
       export default Route.extend({
      actions: {
        startPlaying() {
          // ...
             if (actionShouldAlsoBeTriggeredOnParentRoute) {
            return true;
          }
        }
      }
    });
    ```
       @property actions
    @type Object
    @default null
    @public
  */
  /**
    Triggers a named action on the `ActionHandler`. Any parameters
    supplied after the `actionName` string will be passed as arguments
    to the action target function.
       If the `ActionHandler` has its `target` property set, actions may
    bubble to the `target`. Bubbling happens when an `actionName` can
    not be found in the `ActionHandler`'s `actions` hash or if the
    action target function returns `true`.
       Example
       ```app/routes/welcome.js
    import Route from '@ember/routing/route';
       export default Route.extend({
      actions: {
        playTheme() {
          this.send('playMusic', 'theme.mp3');
        },
        playMusic(track) {
          // ...
        }
      }
    });
    ```
       @method send
    @param {String} actionName The action to trigger
    @param {*} context a context to send with the action
    @public
  */
  send(actionName, ...args) {
    assert(`Attempted to call .send() with the action '${actionName}' on the destroyed object '${this}'.`, !this.isDestroying && !this.isDestroyed);
    if (this.actions && this.actions[actionName]) {
      let shouldBubble = this.actions[actionName].apply(this, args) === true;
      if (!shouldBubble) {
        return;
      }
    }
    let target = get(this, 'target');
    if (target) {
      assert(`The \`target\` for ${this} (${target}) does not have a \`send\` method`, typeof target.send === 'function');
      target.send(...arguments);
    }
  }
});
export default ActionHandler;