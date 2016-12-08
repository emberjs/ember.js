/*jshint debug:true*/

/**
@module ember
@submodule ember-htmlbars
*/

import { info } from 'ember-metal/debug';
import {
  UNDEFINED_REFERENCE,
  GetSyntax,
  CompileIntoList
} from 'glimmer-runtime';

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

  `get` is also aware of block variables. So in this situation

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
function defaultCallback(context, get) {
  /* jshint debug: true */

  info('Use `context`, and `get(<path>)` to debug this template.');

  debugger;
}

let callback = defaultCallback;

export default function debuggerHelper(vm, args, symbolTable) {
  let context = vm.getSelf().value();

  // Note: this is totally an overkill since we are only compiling
  // expressions, but this is the only kind of SymbolLookup we can
  // construct. The symbol table itself should really be sufficient
  // here – we should refactor the Glimmer code to make that possible.
  let symbolLookup = new CompileIntoList(vm.env, symbolTable);

  function get(path) {
    // Problem: technically, we are getting a `PublicVM` here, but to
    // evaluate an expression it requires the full VM. We happen to know
    // that they are the same thing, so this would work for now. However
    // this might break in the future.
    return GetSyntax.build(path).compile(symbolLookup).evaluate(vm).value();
  }

  callback(context, get);

  return UNDEFINED_REFERENCE;
}

// These are exported for testing
export function setDebuggerCallback(newCallback) {
  callback = newCallback;
}

export function resetDebuggerCallback() {
  callback = defaultCallback;
}
