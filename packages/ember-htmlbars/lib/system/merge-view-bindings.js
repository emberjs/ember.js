import Ember from "ember-metal/core"; // Ember.warn, Ember.assert
import { IS_BINDING } from "ember-metal/mixin";
import SimpleStream from "ember-metal/streams/simple";
import { read, isStream } from "ember-metal/streams/utils";
import {
  streamifyClassNameBinding
} from "ember-views/streams/class_name_binding";

var a_push = Array.prototype.push;

export default function mergeViewBindings(view, props, hash) {
  mergeGenericViewBindings(view, props, hash);
  mergeDOMViewBindings(view, props, hash);
  return props;
}

function mergeGenericViewBindings(view, props, hash) {
  for (var key in hash) {
    if (key === 'id' ||
        key === 'tag' ||
        key === 'class' ||
        key === 'classBinding' ||
        key === 'classNameBindings' ||
        key === 'attributeBindings') {
      continue;
    }

    var value = hash[key];

    if (IS_BINDING.test(key)) {
      if (typeof value === 'string') {
        Ember.deprecate(
          "You're attempting to render a view by passing " + key + " " +
          "to a view helper, but this syntax is deprecated. You should use `" +
          key.slice(0, -7) + "=someValue` instead."
        );

        props[key] = view._getBindingForStream(value);
      } else if (isStream(value)) {
        Ember.deprecate(
          "You're attempting to render a view by passing " + key + " " +
          "to a view helper without a quoted value, but this syntax is " +
          "ambiguous. You should either surround " + key + "'s value in " +
          "quotes or remove `Binding` from " + key + "."
        );

        props[key] = view._getBindingForStream(value);
      } else {
        props[key] = value;
      }
    } else {
      if (isStream(value)) {
        props[key + 'Binding'] = view._getBindingForStream(value);
      } else {
        props[key] = value;
      }
    }
  }
}

function mergeDOMViewBindings(view, props, hash) {
  Ember.assert(
    "Setting 'attributeBindings' via template helpers is not allowed. " +
    "Please subclass Ember.View and set it there instead.",
    !hash.attributeBindings
  );

  if (hash.id) {
    props.id = props.elementId = read(hash.id);
  }

  if (hash.tag) {
    props.tagName = read(hash.tag);
  }

  var classBindings = [];

  if (hash['class']) {
    if (typeof hash['class'] === 'string') {
      props.classNames = hash['class'].split(' ');
    } else if (hash['class']._label) {
      // label exists for via property paths in the template
      // but not for streams with nested sub-expressions
      classBindings.push(hash['class']._label);
    } else {
      // this stream did not have a label which means that
      // it is not a simple property path type stream (likely
      // the result of a sub-expression)
      classBindings.push(hash['class']);
    }
  }

  if (hash.classBinding) {
    a_push.apply(classBindings, hash.classBinding.split(' '));
  }

  if (hash.classNameBindings) {
    a_push.apply(classBindings, hash.classNameBindings.split(' '));
  }

  if (classBindings.length > 0) {
    props.classNameBindings = classBindings;

    for (var i = 0; i < classBindings.length; i++) {
      var initialValue = classBindings[i];
      var classBinding;

      if (isStream(initialValue)) {
        classBinding = initialValue;
      } else {
        classBinding = streamifyClassNameBinding(view, initialValue);
      }

      if (isStream(classBinding)) {
        classBindings[i] = classBinding;
      } else {
        classBindings[i] = new SimpleStream(classBinding);
      }
    }
  }
}
