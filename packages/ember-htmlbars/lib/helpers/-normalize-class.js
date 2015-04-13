import { dasherize } from "ember-runtime/system/string";

/** @private
  This private helper is used by ComponentNode to convert the classNameBindings
  microsyntax into a class name.

  When a component or view is created, we normalize class name bindings into a
  series of attribute nodes that use this helper.
*/
export default function normalizeClass(params, hash) {
  var [propName, value] = params;
  var { activeClass, inactiveClass } = hash;

  // When using the colon syntax, evaluate the truthiness or falsiness
  // of the value to determine which className to return
  if (activeClass || inactiveClass) {
    if (!!value) {
      return activeClass;
    } else {
      return inactiveClass;
    }

  // If value is a Boolean and true, return the dasherized property
  // name.
  } else if (value === true) {
    return dasherize(propName);

  // If the value is not false, undefined, or null, return the current
  // value of the property.
  } else if (value !== false && value != null) {
    return value;

  // Nothing to display. Return null so that the old class is removed
  // but no new class is added.
  } else {
    return null;
  }
}
