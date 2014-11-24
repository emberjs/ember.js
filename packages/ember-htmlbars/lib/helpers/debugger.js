/*jshint debug:true*/

/**
@module ember
@submodule ember-htmlbars
*/
import Logger from "ember-metal/logger";

/**
  Execute the `debugger` statement in the current context.

  ```handlebars
  {{debugger}}
  ```

  Before invoking the `debugger` statement, there
  are a few helpful variables defined in the
  body of this helper that you can inspect while
  debugging that describe how and where this
  helper was invoked:

  - templateContext: this is most likely a controller
    from which this template looks up / displays properties
  - typeOfTemplateContext: a string description of
    what the templateContext is

  For example, if you're wondering why a value `{{foo}}`
  isn't rendering as expected within a template, you
  could place a `{{debugger}}` statement, and when
  the `debugger;` breakpoint is hit, you can inspect
  `templateContext`, determine if it's the object you
  expect, and/or evaluate expressions in the console
  to perform property lookups on the `templateContext`:

  ```
    > templateContext.get('foo') // -> "<value of {{foo}}>"
  ```

  @method debugger
  @for Ember.Handlebars.helpers
  @param {String} property
*/
export function debuggerHelper() {

  // These are helpful values you can inspect while debugging.
  /* jshint unused: false */
  var view = this;
  Logger.info('Use `this` to access the view context.');

  debugger;
}
