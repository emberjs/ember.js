import { merge } from "htmlbars/utils";

export function domHelpers(helpers, extensions) {
  var base = {
    // These methods are runtime for now. If they are too expensive,
    // I may inline them at compile-time.
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
        var options = {
          element: element,
          escaped: escaped,
          append: this.appendCallback(element),
          dom: this
        };

        return helper.apply(context, [parts, options]);
      }

      return parts.reduce(function(current, part) {
        return current[part];
      }, context);
    },

    ambiguousAttr: function(context, string, stream, buffer, options) {
      var helper;

      if (helper = helpers[string]) {
        throw new Error("helperAttr is not implemented yet");
      } else {
        return this.resolveInAttr(context, [string], stream, buffer, options);
      }
    },

    helperAttr: function(context, name, args, buffer, options) {
      options.dom = this;
      var helper = helpers[name], position = buffer.length;
      args.push(options);

      var stream = helper.apply(context, args);

      buffer.push('');

      stream.subscribe(function(next) {
        buffer[position] = next;
        options.setAttribute(buffer.join(''));
      });
    },

    resolveInAttr: function(context, parts, buffer, options) {
      var helper = helpers.RESOLVE_IN_ATTR;

      options.dom = this;

      if (helper) {
        var position = buffer.length;
        buffer.push('');

        var stream = helper.call(context, parts, options);

        stream.subscribe(function(next) {
          buffer[position] = next;
          options.setAttribute(buffer.join(''));
        });

        return;
      }

      var out = parts.reduce(function(current, part) {
        return current[part];
      }, context);

      buffer.push(out);
    },

    setAttribute: function(element, name, value, options) {
      this.setAttr(element, name, options.stream.subscribe);

      options.stream.next(value);
    },

    setAttr: function(element, name, subscribe) {
      subscribe(function(value) {
        element.setAttribute(name, value);
      });
    },

    stream: function(callback) {
      var subscriptions = [], lastValue, hasValue;

      var stream = {
        subscribe: function(next) {
          subscriptions.push(next);
          if (hasValue) next(lastValue);
        },

        next: function(value) {
          lastValue = value;
          hasValue = true;
          notify();
        }
      };

      function notify() {
        subscriptions.forEach(function(subscription) {
          subscription(lastValue);
        });
      }

      callback(stream);

      return stream;
    },

    frag: function(element, string) {
      /*global DocumentFragment*/
      if (element instanceof DocumentFragment) {
        element = this.createElement('div');
      }

      return this.createContextualFragment(element, string);
    },

    // overridable
    appendCallback: function(element) {
      return function(node) { element.appendChild(node); };
    },

    createElement: function() {
      return document.createElement.apply(document, arguments);
    },

    createDocumentFragment: function() {
      return document.createDocumentFragment.apply(document, arguments);
    },

    createContextualFragment: function(element, string) {
      var range = this.createRange();
      range.setStart(element, 0);
      range.collapse(false);
      return range.createContextualFragment(string);
    },

    createRange: function() {
      return document.createRange();
    }
  };

  return extensions ? merge(extensions, base) : base;
}

export function hydrate(spec, options) {
  return spec(domHelpers(options.helpers || {}, options.extensions || {}));
}
