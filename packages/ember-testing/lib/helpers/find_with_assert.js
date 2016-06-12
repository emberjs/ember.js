export default function findWithAssert(app, selector, context) {
  let $el = app.testHelpers.find(selector, context);
  if ($el.length === 0) {
    throw new Error('Element ' + selector + ' not found.');
  }
  return $el;
}
