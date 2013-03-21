define(
  ["htmlbars/helpers","exports"],
  function(__dependency1__, __exports__) {
    "use strict";
    var helpers = __dependency1__.helpers;

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

      ambiguousAttr: function(context, string, options) {
        var helper;

        if (helper = helpers[string]) {
          throw new Error("helperAttr is not implemented yet");
        } else {
          return this.resolveInAttr(context, [string], options)
        }
      },

      helperAttr: function(context, name, args, options) {
        var helper = helpers[name];
        args.push(options);
        return helper.apply(context, args);
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

    __exports__.domHelpers = domHelpers;
  });
