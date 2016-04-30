export default function keyEvent(app, selector, contextOrType, typeOrKeyCode, keyCode) {
  var context, type;

  if (typeof keyCode === 'undefined') {
    context = null;
    keyCode = typeOrKeyCode;
    type = contextOrType;
  } else {
    context = contextOrType;
    type = typeOrKeyCode;
  }

  return app.testHelpers.triggerEvent(selector, context, type, { keyCode: keyCode, which: keyCode });
}
