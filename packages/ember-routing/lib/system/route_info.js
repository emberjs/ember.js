/**
@module ember
@submodule ember-routing
*/
import Object from 'ember-runtime/system/object';

export default Object.extend({
  name: null,
  localName: null,
  attrs: null,
  params: null,
  queryParams: null,
  parent: null,
  child: null

  // implement Enumerable over parent/child

});
