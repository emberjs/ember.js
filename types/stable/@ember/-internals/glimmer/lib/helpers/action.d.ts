declare module '@ember/-internals/glimmer/lib/helpers/action' {
  export const ACTIONS: WeakSet<object>;
  /**
      The `{{action}}` helper provides a way to pass triggers for behavior (usually
      just a function) between components, and into components from controllers.

      ### Passing functions with the action helper

      There are three contexts an action helper can be used in. The first two
      contexts to discuss are attribute context, and Handlebars value context.

      ```handlebars
      {{! An example of attribute context }}
      <div onclick={{action "save"}}></div>
      {{! Examples of Handlebars value context }}
      {{input on-input=(action "save")}}
      {{yield (action "refreshData") andAnotherParam}}
      ```

      In these contexts,
      the helper is called a "closure action" helper. Its behavior is simple:
      If passed a function name, read that function off the `actions` property
      of the current context. Once that function is read, or immediately if a function was
      passed, create a closure over that function and any arguments.
      The resulting value of an action helper used this way is simply a function.

      For example, in the attribute context:

      ```handlebars
      {{! An example of attribute context }}
      <div onclick={{action "save"}}></div>
      ```

      The resulting template render logic would be:

      ```js
      var div = document.createElement('div');
      var actionFunction = (function(context){
        return function() {
          return context.actions.save.apply(context, arguments);
        };
      })(context);
      div.onclick = actionFunction;
      ```

      Thus when the div is clicked, the action on that context is called.
      Because the `actionFunction` is just a function, closure actions can be
      passed between components and still execute in the correct context.

      Here is an example action handler on a component:

      ```app/components/my-component.js
      import Component from '@glimmer/component';
      import { action } from '@ember/object';

      export default class extends Component {
        @action
        save() {
          this.model.save();
        }
      }
      ```

      Actions are always looked up on the `actions` property of the current context.
      This avoids collisions in the naming of common actions, such as `destroy`.
      Two options can be passed to the `action` helper when it is used in this way.

      * `target=someProperty` will look to `someProperty` instead of the current
        context for the `actions` hash. This can be useful when targeting a
        service for actions.
      * `value="target.value"` will read the path `target.value` off the first
        argument to the action when it is called and rewrite the first argument
        to be that value. This is useful when attaching actions to event listeners.

      ### Invoking an action

      Closure actions curry both their scope and any arguments. When invoked, any
      additional arguments are added to the already curried list.
      Actions are presented in JavaScript as callbacks, and are
      invoked like any other JavaScript function.

      For example

      ```app/components/update-name.js
      import Component from '@glimmer/component';
      import { action } from '@ember/object';

      export default class extends Component {
        @action
        setName(model, name) {
          model.set('name', name);
        }
      }
      ```

      ```app/components/update-name.hbs
      {{input on-input=(action (action 'setName' @model) value="target.value")}}
      ```

      The first argument (`@model`) was curried over, and the run-time argument (`event`)
      becomes a second argument. Action calls can be nested this way because each simply
      returns a function. Any function can be passed to the `{{action}}` helper, including
      other actions.

      Actions invoked with `sendAction` have the same currying behavior as demonstrated
      with `on-input` above. For example:

      ```app/components/my-input.js
      import Component from '@glimmer/component';
      import { action } from '@ember/object';

      export default class extends Component {
        @action
        setName(model, name) {
          model.set('name', name);
        }
      }
      ```

      ```handlebars
      <MyInput @submit={{action 'setName' @model}} />
      ```

      or

      ```handlebars
      {{my-input submit=(action 'setName' @model)}}
      ```

      ```app/components/my-component.js
      import Component from '@ember/component';

      export default Component.extend({
        click() {
          // Note that model is not passed, it was curried in the template
          this.submit('bob');
        }
      });
      ```

      ### Attaching actions to DOM elements

      The third context of the `{{action}}` helper can be called "element space".
      For example:

      ```handlebars
      {{! An example of element space }}
      <div {{action "save"}}></div>
      ```

      Used this way, the `{{action}}` helper provides a useful shortcut for
      registering an HTML element in a template for a single DOM event and
      forwarding that interaction to the template's context (controller or component).
      If the context of a template is a controller, actions used this way will
      bubble to routes when the controller does not implement the specified action.
      Once an action hits a route, it will bubble through the route hierarchy.

      ### Event Propagation

      `{{action}}` helpers called in element space can control event bubbling. Note
      that the closure style actions cannot.

      Events triggered through the action helper will automatically have
      `.preventDefault()` called on them. You do not need to do so in your event
      handlers. If you need to allow event propagation (to handle file inputs for
      example) you can supply the `preventDefault=false` option to the `{{action}}` helper:

      ```handlebars
      <div {{action "sayHello" preventDefault=false}}>
        <input type="file" />
        <input type="checkbox" />
      </div>
      ```

      To disable bubbling, pass `bubbles=false` to the helper:

      ```handlebars
      <button {{action 'edit' post bubbles=false}}>Edit</button>
      ```

      To disable bubbling with closure style actions you must create your own
      wrapper helper that makes use of `event.stopPropagation()`:

      ```handlebars
      <div onclick={{disable-bubbling (action "sayHello")}}>Hello</div>
      ```

      ```app/helpers/disable-bubbling.js
      import { helper } from '@ember/component/helper';

      export function disableBubbling([action]) {
        return function(event) {
          event.stopPropagation();
          return action(event);
        };
      }
      export default helper(disableBubbling);
      ```

      If you need the default handler to trigger you should either register your
      own event handler, or use event methods on your view class. See
      ["Responding to Browser Events"](/ember/release/classes/Component)
      in the documentation for `Component` for more information.

      ### Specifying DOM event type

      `{{action}}` helpers called in element space can specify an event type.
      By default the `{{action}}` helper registers for DOM `click` events. You can
      supply an `on` option to the helper to specify a different DOM event name:

      ```handlebars
      <div {{action "anActionName" on="doubleClick"}}>
        click me
      </div>
      ```

      See ["Event Names"](/ember/release/classes/Component) for a list of
      acceptable DOM event names.

      ### Specifying whitelisted modifier keys

      `{{action}}` helpers called in element space can specify modifier keys.
      By default the `{{action}}` helper will ignore click events with pressed modifier
      keys. You can supply an `allowedKeys` option to specify which keys should not be ignored.

      ```handlebars
      <div {{action "anActionName" allowedKeys="alt"}}>
        click me
      </div>
      ```

      This way the action will fire when clicking with the alt key pressed down.
      Alternatively, supply "any" to the `allowedKeys` option to accept any combination of modifier keys.

      ```handlebars
      <div {{action "anActionName" allowedKeys="any"}}>
        click me with any key pressed
      </div>
      ```

      ### Specifying a Target

      A `target` option can be provided to the helper to change
      which object will receive the method call. This option must be a path
      to an object, accessible in the current context:

      ```app/templates/application.hbs
      <div {{action "anActionName" target=someService}}>
        click me
      </div>
      ```

      ```app/controllers/application.js
      import Controller from '@ember/controller';
      import { service } from '@ember/service';

      export default class extends Controller {
        @service someService;
      }
      ```

      @method action
      @for Ember.Templates.helpers
      @public
    */
  const _default: object;
  export default _default;
}
