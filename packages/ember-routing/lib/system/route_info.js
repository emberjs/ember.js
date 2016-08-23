/**
@module ember
@submodule ember-routing
*/
import Object from 'ember-runtime/system/object';

// name: the dot-separated, fully-qualified name of this route, like "people.index".
// localName: the final part of the name, like "index".
// params: the values of this route's parameters. Same as the argument to Route's model hook. Contains only the parameters valid for this route, if any (params for parent or child routes are not merged).
// queryParams: the values of any queryParams on this route.
// parent: another RouteInfo instance, describing this route's parent route, if any.
// child: another RouteInfo instance, describing this route's active child route, if any.
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
