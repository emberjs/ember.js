/**
@module ember
@submodule ember-glimmer
*/
import { symbol } from 'ember-utils';
import { CachedReference } from '../utils/references';
import {
  Error as EmberError,
  run,
  get,
  flaggedInstrument,
  isNone
} from 'ember-metal';

export const INVOKE = symbol('INVOKE');
export const ACTION = symbol('ACTION');

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
  of the current context. Once that function is read (or if a function was
  passed), create a closure over that function and any arguments.
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

  ```js
  export default Ember.Component.extend({
    actions: {
      save() {
        this.get('model').save();
      }
    }
  });
  ```

  Actions are always looked up on the `actions` property of the current context.
  This avoids collisions in the naming of common actions, such as `destroy`.
  Two options can be passed to the `action` helper when it is used in this way.

  * `target=someProperty` will look to `someProperty` instead of the current
    context for the `actions` hash. This can be useful when targetting a
    service for actions.
  * `value="target.value"` will read the path `target.value` off the first
    argument to the action when it is called and rewrite the first argument
    to be that value. This is useful when attaching actions to event listeners.

  ### Invoking an action

  Closure actions curry both their scope and any arguments. When invoked, any
  additional arguments are added to the already curried list.
  Actions should be invoked using the [sendAction](/api/classes/Ember.Component.html#method_sendAction)
  method. The first argument to `sendAction` is the action to be called, and
  additional arguments are passed to the action function. This has interesting
  properties combined with currying of arguments. For example:

  ```js
  export default Ember.Component.extend({
    actions: {
      // Usage {{input on-input=(action (action 'setName' model) value="target.value")}}
      setName(model, name) {
        model.set('name', name);
      }
    }
  });
  ```

  The first argument (`model`) was curried over, and the run-time argument (`event`)
  becomes a second argument. Action calls can be nested this way because each simply
  returns a function. Any function can be passed to the `{{action}}` helper, including
  other actions.

  Actions invoked with `sendAction` have the same currying behavior as demonstrated
  with `on-input` above. For example:

  ```js
  export default Ember.Component.extend({
    actions: {
      setName(model, name) {
        model.set('name', name);
      }
    }
  });
  ```

  ```handlebars
  {{my-input submit=(action 'setName' model)}}
  ```

  ```js
  // app/components/my-component.js
  export default Ember.Component.extend({
    click() {
      // Note that model is not passed, it was curried in the template
      this.sendAction('submit', 'bob');
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

  ```js
  // app/helpers/disable-bubbling.js
  import Ember from 'ember';
  export function disableBubbling([action]) {
    return function(event) {
      event.stopPropagation();
      return action(event);
    };
  }
  export default Ember.Helper.helper(disableBubbling);
  ```

  If you need the default handler to trigger you should either register your
  own event handler, or use event methods on your view class. See
  ["Responding to Browser Events"](/api/classes/Ember.View.html#toc_responding-to-browser-events)
  in the documentation for Ember.View for more information.

  ### Specifying DOM event type

  `{{action}}` helpers called in element space can specify an event type.
  By default the `{{action}}` helper registers for DOM `click` events. You can
  supply an `on` option to the helper to specify a different DOM event name:

  ```handlebars
  <div {{action "anActionName" on="doubleClick"}}>
    click me
  </div>
  ```

  See ["Event Names"](/api/classes/Ember.View.html#toc_event-names) for a list of
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

  ```handlebars
  {{! app/templates/application.hbs }}
  <div {{action "anActionName" target=someService}}>
    click me
  </div>
  ```

  ```javascript
  // app/controllers/application.js
  export default Ember.Controller.extend({
    someService: Ember.inject.service()
  });
  ```

  @method action
  @for Ember.Templates.helpers
  @public
*/
export class ClosureActionReference extends CachedReference {
  static create(args) {
    // TODO: Const reference optimization.
    return new ClosureActionReference(args);
  }

  constructor(args) {
    super();

    this.args = args;
    this.tag = args.tag;
  }

  compute() {
    let { named, positional } = this.args;
    let positionalValues = positional.value();

    let target = named.get('target').value();
    let rawActionRef = positional.at(0);
    let rawAction = positionalValues[0];

    // The first argument slot is reserved.
    // pos[0] is the action name or function
    // Anything else is an action argument.
    let actionArgs = positionalValues.slice(1);

    // on-change={{action setName}}
    // element-space actions look to "controller" then target. Here we only
    // look to "target".
    let actionType = typeof rawAction;
    let action = rawAction;

    if (rawActionRef[INVOKE]) {
      target = rawActionRef;
      action = rawActionRef[INVOKE];
    } else if (isNone(rawAction)) {
      throw new EmberError(`Action passed is null or undefined in (action) from ${target}.`);
    } else if (actionType === 'string') {
      // on-change={{action 'setName'}}
      let actionName = rawAction;

      action = null;

      if (target['actions']) {
        action = target.actions[actionName];
      }

      if (!action) {
        throw new EmberError(`An action named '${actionName}' was not found in ${target}`);
      }
    } else if (action && typeof action[INVOKE] === 'function') {
      target = action;
      action = action[INVOKE];
    } else if (actionType !== 'function') {
      // TODO: Is there a better way of doing this?
      let rawActionLabel = rawActionRef._propertyKey || rawAction;
      throw new EmberError(`An action could not be made for \`${rawActionLabel}\` in ${target}. Please confirm that you are using either a quoted action name (i.e. \`(action '${rawActionLabel}')\`) or a function available in ${target}.`);
    }

    let valuePath = named.get('value').value();

    return createClosureAction(target, action, valuePath, actionArgs);
  }
}

export default function(vm, args) {
  return ClosureActionReference.create(args);
}

export function createClosureAction(target, action, valuePath, actionArgs) {
  let closureAction;
  let actionArgLength = actionArgs.length;

  if (actionArgLength > 0) {
    closureAction = function(...passedArguments) {
      let args = new Array(actionArgLength + passedArguments.length);

      for (let i = 0; i < actionArgLength; i++) {
        args[i] = actionArgs[i];
      }

      for (let i = 0; i < passedArguments.length; i++) {
        args[i + actionArgLength] = passedArguments[i];
      }

      if (valuePath && args.length > 0) {
        args[0] = get(args[0], valuePath);
      }

      let payload = { target, args, label: 'glimmer-closure-action' };
      return flaggedInstrument('interaction.ember-action', payload, () => {
        return run.join(target, action, ...args);
      });
    };
  } else {
    closureAction = function(...args) {
      if (valuePath && args.length > 0) {
        args[0] = get(args[0], valuePath);
      }

      let payload = { target, args, label: 'glimmer-closure-action' };
      return flaggedInstrument('interaction.ember-action', payload, () => {
        return run.join(target, action, ...args);
      });
    };
  }

  closureAction[ACTION] = true;
  return closureAction;
}
