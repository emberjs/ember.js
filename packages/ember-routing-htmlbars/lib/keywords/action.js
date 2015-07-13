/**
@module ember
@submodule ember-templates
*/

import { keyword } from "htmlbars-runtime/hooks";
import closureAction from "ember-routing-htmlbars/keywords/closure-action";

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
  the helper is called a "closure action" helper. It's behavior is simple:
  If passed a function name, read that function off the `actions` property
  of the current context. Once that function is read (or if a function was
  passed), create a closure over that function and any arguments.

  The resulting value of an action helper used this way is simply a function.
  For example with this attribute context example:

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
  passed between components the still execute in the correct context.

  Here is an example action handler on a component:

  ```js
  export default Ember.Component.extend({
    actions: {
      save(/* event *\/) {
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
  becomes a second argument. Action calls be nested this way because each simply
  returns a function. Any function can be passed to the `{{action` helper, including
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

  ### Attaching actions to DOM

  The third context the `{{action` helper can be used in we call "element space".
  For example:

  ```handlebars
  {{! An example of element space }}
  <div {{action "save"}}></div>
  ```

  Used this way, the `{{action}}` helper provides a useful shortcut for
  registering an HTML element within a template for a single DOM event and
  forwarding that interaction to the template's context (controller or component).

  If the context of a template is a controller, actions used this way will
  bubble to routes when the controller does not implement the specified action.
  Once an action hits a route, it will bubble through the route hierarchy.

  ### Event Propagation

  `{{action` helpers called in element space can control event bubbling.

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

  If you need the default handler to trigger you should either register your
  own event handler, or use event methods on your view class. See [Ember.View](/api/classes/Ember.View.html)
  'Responding to Browser Events' for more information.

  ### Specifying DOM event type

  `{{action` helpers called in element space can specify an event type.

  By default the `{{action}}` helper registers for DOM `click` events. You can
  supply an `on` option to the helper to specify a different DOM event name:

  ```handlebars
  <div {{action "anActionName" on="double-click"}}>
    click me
  </div>
  ```

  See [Event Names](/api/classes/Ember.View.html#toc_event-names) for a list of
  acceptable DOM event names.

  ### Specifying whitelisted modifier keys

  `{{action` helpers called in element space can specify modifier keys.

  By default the `{{action}}` helper will ignore click event with pressed modifier
  keys. You can supply an `allowedKeys` option to specify which keys should not be ignored.

  ```handlebars
  <div {{action "anActionName" allowedKeys="alt"}}>
    click me
  </div>
  ```

  This way the `{{action}}` will fire when clicking with the alt key pressed down.

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
export default function(morph, env, scope, params, hash, template, inverse, visitor) {
  if (Ember.FEATURES.isEnabled("ember-routing-htmlbars-improved-actions")) {
    if (morph) {
      keyword('@element_action', morph, env, scope, params, hash, template, inverse, visitor);
      return true;
    }

    return closureAction(morph, env, scope, params, hash, template, inverse, visitor);
  } else {
    keyword('@element_action', morph, env, scope, params, hash, template, inverse, visitor);
    return true;
  }
}
