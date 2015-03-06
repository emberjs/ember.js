/*jshint debug:true*/

/**
@module ember
@submodule ember-htmlbars
*/
import Logger from "ember-metal/logger";

/**
  Execute the `debugger` statement in the current template's context.

  ```handlebars
  {{debugger}}
  ```

  When using the debugger helper you will have access to a `get` function. This
  function retrieves values available in the context of the template.

  For example, if you're wondering why a value `{{foo}}` isn't rendering as
  expected within a template, you could place a `{{debugger}}` statement and,
  when the `debugger;` breakpoint is hit, you can attempt to retrieve this value:

  ```
  > get('foo')
  ```

  `get` is also aware of keywords. So in this situation

  ```handlebars
  {{#each items as |item|}}
    {{debugger}}
  {{/each}}
  ```

  you'll be able to get values from the current item:

  ```
  > get('item.name')
  ```

  You can also access the context of the view to make sure it is the object that
  you expect:

  ```
  > context
  ```

  @method debugger
  @for Ember.Handlebars.helpers
  @param {String} property
*/
export function debuggerHelper(params, hash, options, env) {

  /* jshint unused: false */
  var view = env.data.view;

  /* jshint unused: false */
  var context = view.get('context');

  /* jshint unused: false */
  function get(path) {
    return view.getStream(path).value();
  }

  Logger.info('Use `view`, `context`, and `get(<path>)` to debug this template.');

  debugger;
}
