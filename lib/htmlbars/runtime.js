import { helpers } from "htmlbars/helpers";

// These methods are runtime for now. If they are too expensive,
// I may inline them at compile-time.
var domHelpers = {
  appendText: function(element, value) {
    if (value === undefined) { return; }
    element.appendChild(document.createTextNode(value));
  },

  appendHTML: function(element, value) {
    if (value === undefined) { return; }
    element.appendChild(this.frag(element, value));
  },

  appendFragment: function(element, fragment) {
    if (fragment === undefined) { return; }
    element.appendChild(fragment);
  },

  ambiguousContents: function(element, context, string, escaped) {
    var helper, value, args;

    if (helper = helpers[string]) {
      return this.helperContents(string, element, context, [], { element: element, escaped: escaped });
    } else {
      return this.resolveContents(context, [string], element, escaped);
    }
  },

  helperContents: function(name, element, context, args, options) {
    var helper = helpers[name];
    options.element = element;
    args.push(options);
    return helper.apply(context, args);
  },

  resolveContents: function(context, parts, element, escaped) {
    var helper = helpers.RESOLVE;
    if (helper) {
      return helper.apply(context, [parts, { element: element, escaped: escaped }]);
    }

    return parts.reduce(function(current, part) {
      return current[part];
    }, context)
  },

  ambiguousAttr: function(element, context, attrName, string) {
    var helper, value, args;

    if (helper = helpers[string]) {
      throw new Error("helperAttr is not implemented yet");
    } else {
      return this.resolveAttr(context, [string], element, attrName)
    }
  },

  helperAttr: function(name, element, attrName, context, args, options) {
    var helper = helpers[name];
    options.element = element;
    options.attrName = attrName;
    args.push(options);
    return helper.apply(context, args);
  },

  applyAttribute: function(element, attrName, value) {
    if (value === undefined) { return; }
    element.setAttribute(attrName, value);
  },

  resolveAttr: function(context, parts, element, attrName, escaped) {
    var helper = helpers.RESOLVE_ATTR;

    if (helper) {
      return helper.apply(context, [parts, { element: element, attrName: attrName }]);
    }

    return parts.reduce(function(current, part) {
      return current[part];
    }, context);
  },

  resolveInAttr: function(context, parts, options) {
    var helper = helpers.RESOLVE_IN_ATTR;

    if (helper) {
      return helper.apply(context, [parts, options]);
    }

    return parts.reduce(function(current, part) {
      return current[part];
    }, context);
  },

  frag: function(element, string) {
    /*global DocumentFragment*/
    if (element instanceof DocumentFragment) {
      element = document.createElement('div');
    }

    var range = document.createRange();
    range.setStart(element, 0);
    range.collapse(false);
    return range.createContextualFragment(string);
  }
};

export { domHelpers };