/**
@module ember
@submodule ember-htmlbars
*/

import isEnabled from "ember-metal/features";
import { keyword } from "htmlbars-runtime/hooks";
import closureAction from "ember-routing-htmlbars/keywords/closure-action";

/**
  The `{{action}}` helper provides a useful shortcut for registering an HTML
  element within a template for a single DOM event and forwarding that
  interaction to the template's controller or specified `target` option.

  If the controller does not implement the specified action, the event is sent
  to the current route, and it bubbles up the route hierarchy from there.

  For more advanced event handling see [Ember.Component](/api/classes/Ember.Component.html)


  ### Use
  Given the following application Handlebars template on the page

  ```handlebars
  <div {{action 'anActionName'}}>
    click me
  </div>
  ```

  And application code

  ```javascript
  App.ApplicationController = Ember.Controller.extend({
    actions: {
      anActionName: function() {
      }
    }
  });
  ```

  Will result in the following rendered HTML

  ```html
  <div class="ember-view">
    <div data-ember-action="1">
      click me
    </div>
  </div>
  ```

  Clicking "click me" will trigger the `anActionName` action of the
  `App.ApplicationController`. In this case, no additional parameters will be passed.

  If you provide additional parameters to the helper:

  ```handlebars
  <button {{action 'edit' post}}>Edit</button>
  ```

  Those parameters will be passed along as arguments to the JavaScript
  function implementing the action.

  ### Event Propagation

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

  By default the `{{action}}` helper registers for DOM `click` events. You can
  supply an `on` option to the helper to specify a different DOM event name:

  ```handlebars
  <div {{action "anActionName" on="doubleClick"}}>
    click me
  </div>
  ```

  See `Ember.View` 'Responding to Browser Events' for a list of
  acceptable DOM event names.

  ### Specifying whitelisted modifier keys

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

  There are several possible target objects for `{{action}}` helpers:

  In a typical Ember application, where templates are managed through use of the
  `{{outlet}}` helper, actions will bubble to the current controller, then
  to the current route, and then up the route hierarchy.

  Alternatively, a `target` option can be provided to the helper to change
  which object will receive the method call. This option must be a path
  to an object, accessible in the current context:

  ```handlebars
  {{! the application template }}
  <div {{action "anActionName" target=view}}>
    click me
  </div>
  ```

  ```javascript
  App.ApplicationView = Ember.View.extend({
    actions: {
      anActionName: function() {}
    }
  });

  ```

  ### Additional Parameters

  You may specify additional parameters to the `{{action}}` helper. These
  parameters are passed along as the arguments to the JavaScript function
  implementing the action.

  ```handlebars
  {{#each person in people}}
    <div {{action "edit" person}}>
      click me
    </div>
  {{/each}}
  ```

  Clicking "click me" will trigger the `edit` method on the current controller
  with the value of `person` as a parameter.

  @method action
  @for Ember.Handlebars.helpers
  @public
*/
export default function(morph, env, scope, params, hash, template, inverse, visitor) {
  if (isEnabled("ember-routing-htmlbars-improved-actions")) {
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
