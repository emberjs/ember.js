/**
@module ember
@submodule ember-testing
*/
/**
  Simulates a key event, e.g. `keypress`, `keydown`, `keyup` with the desired keyCode
  Example:
  ```javascript
  keyEvent('.some-jQuery-selector', 'keypress', 13).then(function() {
   // assert something
  });
  ```
  @method keyEvent
  @param {String} selector jQuery selector for finding element on the DOM
  @param {String} type the type of key event, e.g. `keypress`, `keydown`, `keyup`
  @param {Number} keyCode the keyCode of the simulated key event
  @return {RSVP.Promise<undefined>}
  @since 1.5.0
  @public
*/
export default function keyEvent(app, selector, contextOrType, typeOrKeyCode, keyCode) {
  let context, type;

  if (keyCode === undefined) {
    context = null;
    keyCode = typeOrKeyCode;
    type = contextOrType;
  } else {
    context = contextOrType;
    type = typeOrKeyCode;
  }

  return app.testHelpers.triggerEvent(selector, context, type, { keyCode, which: keyCode });
}
