import { get } from 'ember-metal/property_get';

export default function find(app, selector, context) {
  let $el;
  context = context || get(app, 'rootElement');
  $el = app.$(selector, context);
  return $el;
}
