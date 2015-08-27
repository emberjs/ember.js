/*jshint debug:true*/

/**
@module ember
@submodule ember-htmlbars
*/

import { info } from 'ember-metal/debug';

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

  You'll be able to get values from the current item:

  ```
  > get('item.name')
  ```

  You can also access the context of the view to make sure it is the object that
  you expect:

  ```
  > context
  ```

  @method debugger
  @for Ember.Templates.helpers
  @public
*/
export default function debuggerKeyword(morph, env, scope) {
  /* jshint unused: false, debug: true */

  var view = env.hooks.getValue(scope.locals.view);
  var context = env.hooks.getValue(scope.self);

  function get(path) {
    return env.hooks.getValue(env.hooks.get(env, scope, path));
  }

  info('Use `view`, `context`, and `get(<path>)` to debug this template.');

  debugger;

  return true;
}
