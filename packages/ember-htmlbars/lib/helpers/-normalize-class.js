/** @private
  This private helper is used by ComponentNode to convert the classNameBindings
  microsyntax into a class name.

  When a component or view is created, we normalize class name bindings into a
  series of attribute nodes that use this helper.
*/
export default function normalizeClass(params, hash) {
  var value = params[0];

  if (typeof value === 'string') {
    return value;
  } else if (!!value) {
    return hash.activeClass;
  } else {
    return hash.inactiveClass;
  }
}
