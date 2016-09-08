/*jshint debug:true*/

/**
@module ember
@submodule ember-htmlbars
*/

import { info } from 'ember-metal/debug';
import { GetSyntax, CompileIntoList } from 'glimmer-runtime';
import { UNDEFINED_REFERENCE, CONSTANT_TAG } from 'glimmer-reference';

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

export default function debuggerHelper(vm, args, symbolTable) {
  return DebuggerReference.create(vm, args, symbolTable);
}

let callback = defaultCallback;

class DebuggerReference {
  static create(vm, args, symbolTable) {
    let selfRef = vm.getSelf();

    // Note: this is totally an overkill since we are only compiling
    // expressions, but this is the only kind of SymbolLookup we can
    // construct. The symbol table itself should really be sufficient
    // here – we should refactor the Glimmer code to make that possible.
    let symbolLookup = new CompileIntoList(vm.env, symbolTable);

    return new this(selfRef, vm, symbolLookup);
  }

  constructor(selfRef, vm, symbolLookup) {
    // Note: this makes the helper only run once when it was first
    // appended. Ideally, we would want to run this whenever the
    // surrounding component's hooks are run, but we don't really
    // have a good way to express it. Another alternative is that
    // we make this a CURRENT_TAG, but that would causes the hooks
    // on the surrounding component to fire all the time.
    this.tag = CONSTANT_TAG;

    this.selfRef = selfRef;
    this.vm = vm;
    this.symbolLookup = symbolLookup;
  }

  value() {
    let { selfRef, vm, symbolLookup } = this;

    let context = selfRef.value();

    function get(path) {
      // Problem: technically, we are getting a `PublicVM` here, but to
      // evaluate an expression it requires the full VM. We happen to know
      // that they are the same thing, so this would work for now. However
      // this might break in the future.
      return GetSyntax.build(path).compile(symbolLookup).evaluate(vm).value();
    }

    callback(context, get);

    return undefined;
  }

  get(key) {
    return UNDEFINED_REFERENCE;
  }
}

// These are exported for testing
export function setDebuggerCallback(newCallback) {
  callback = newCallback;
}

export function resetDebuggerCallback() {
  callback = defaultCallback;
}
