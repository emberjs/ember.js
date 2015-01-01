import {
  chain,
  read
} from "ember-metal/streams/utils";
import { get } from "ember-metal/property_get";
import { dasherize } from "ember-runtime/system/string";
import {
  isArray
} from "ember-metal/utils";

/**
  Parse a path and return an object which holds the parsed properties.

  For example a path like "content.isEnabled:enabled:disabled" will return the
  following object:

  ```javascript
  {
    path: "content.isEnabled",
    className: "enabled",
    falsyClassName: "disabled",
    classNames: ":enabled:disabled"
  }
  ```

  @method parsePropertyPath
  @static
  @private
*/
export function parsePropertyPath(path) {
  var split = path.split(':');
  var propertyPath = split[0];
  var classNames = "";
  var className, falsyClassName;

  // check if the property is defined as prop:class or prop:trueClass:falseClass
  if (split.length > 1) {
    className = split[1];
    if (split.length === 3) {
      falsyClassName = split[2];
    }

    classNames = ':' + className;
    if (falsyClassName) {
      classNames += ":" + falsyClassName;
    }
  }

  return {
    path: propertyPath,
    classNames: classNames,
    className: (className === '') ? undefined : className,
    falsyClassName: falsyClassName
  };
}

/**
  Get the class name for a given value, based on the path, optional
  `className` and optional `falsyClassName`.

  - if a `className` or `falsyClassName` has been specified:
    - if the value is truthy and `className` has been specified,
      `className` is returned
    - if the value is falsy and `falsyClassName` has been specified,
      `falsyClassName` is returned
    - otherwise `null` is returned
  - if the value is `true`, the dasherized last part of the supplied path
    is returned
  - if the value is not `false`, `undefined` or `null`, the `value`
    is returned
  - if none of the above rules apply, `null` is returned

  @method classStringForValue
  @param path
  @param val
  @param className
  @param falsyClassName
  @static
  @private
*/
export function classStringForValue(path, val, className, falsyClassName) {
  if (isArray(val)) {
    val = get(val, 'length') !== 0;
  }

  // When using the colon syntax, evaluate the truthiness or falsiness
  // of the value to determine which className to return
  if (className || falsyClassName) {
    if (className && !!val) {
      return className;

    } else if (falsyClassName && !val) {
      return falsyClassName;

    } else {
      return null;
    }

  // If value is a Boolean and true, return the dasherized property
  // name.
  } else if (val === true) {
    // Normalize property path to be suitable for use
    // as a class name. For exaple, content.foo.barBaz
    // becomes bar-baz.
    var parts = path.split('.');
    return dasherize(parts[parts.length-1]);

  // If the value is not false, undefined, or null, return the current
  // value of the property.
  } else if (val !== false && val != null) {
    return val;

  // Nothing to display. Return null so that the old class is removed
  // but no new class is added.
  } else {
    return null;
  }
}

export function streamifyClassNameBinding(view, classNameBinding, prefix) {
  prefix = prefix || '';
  Ember.assert("classNameBindings must not have spaces in them. Multiple class name bindings can be provided as elements of an array, e.g. ['foo', ':bar']", classNameBinding.indexOf(' ') === -1);
  var parsedPath = parsePropertyPath(classNameBinding);
  if (parsedPath.path === '') {
    return classStringForValue(
      parsedPath.path,
      true,
      parsedPath.className,
      parsedPath.falsyClassName
    );
  } else {
    var pathValue = view.getStream(prefix+parsedPath.path);
    return chain(pathValue, function() {
      return classStringForValue(
        parsedPath.path,
        read(pathValue),
        parsedPath.className,
        parsedPath.falsyClassName
      );
    });
  }
}
