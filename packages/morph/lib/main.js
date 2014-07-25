define("morph",
  ["morph/morph","morph/dom-helper","exports"],
  function(__dependency1__, __dependency2__, __exports__) {
    "use strict";
    var Morph = __dependency1__["default"];
    var Morph;
    __exports__.Morph = Morph;
    var DOMHelper = __dependency2__["default"];
    var DOMHelper;
    __exports__.DOMHelper = DOMHelper;
  });
define("morph/dom-helper",
  ["morph/morph","exports"],
  function(__dependency1__, __exports__) {
    "use strict";
    var Morph = __dependency1__["default"];

    var emptyString = '';

    var deletesBlankTextNodes = (function(){
      var element = document.createElement('div');
      element.appendChild( document.createTextNode('') );
      var clonedElement = element.cloneNode(true);
      return clonedElement.childNodes.length === 0;
    })();

    var ignoresCheckedAttribute = (function(){
      var element = document.createElement('input');
      element.setAttribute('checked', 'checked');
      var clonedElement = element.cloneNode(false);
      return !clonedElement.checked;
    })();

    /*
     * A class wrapping DOM functions to address environment compatibility,
     * namespaces, contextual elements for morph un-escaped content
     * insertion.
     *
     * When entering a template, a DOMHelper should be passed:
     *
     *   template(context, { hooks: hooks, dom: new DOMHelper() });
     *
     * TODO: support foreignObject as a passed contextual element. It has
     * a namespace (svg) that does not match its internal namespace
     * (xhtml).
     *
     * @class DOMHelper
     * @constructor
     * @param {HTMLDocument} _document The document DOM methods are proxied to
     */
    function DOMHelper(_document){
      this.document = _document || window.document;
    }

    var prototype = DOMHelper.prototype;
    prototype.constructor = DOMHelper;

    prototype.appendChild = function(element, childElement) {
      element.appendChild(childElement);
    };

    prototype.appendText = function(element, text) {
      element.appendChild(this.document.createTextNode(text));
    };

    prototype.setAttribute = function(element, name, value) {
      element.setAttribute(name, value);
    };

    prototype.createElement = function(tagName) {
      if (this.namespaceURI) {
        return this.document.createElementNS(this.namespaceURI, tagName);
      } else {
        return this.document.createElement(tagName);
      }
    };

    prototype.createDocumentFragment = function(){
      return this.document.createDocumentFragment();
    };

    prototype.createTextNode = function(text){
      return this.document.createTextNode(text);
    };

    prototype.repairClonedNode = function(element, blankChildTextNodes, isChecked){
      if (deletesBlankTextNodes && blankChildTextNodes.length > 0) {
        for (var i=0, len=blankChildTextNodes.length;i<len;i++){
          var textNode = document.createTextNode(emptyString),
              offset = blankChildTextNodes[i],
              before = element.childNodes[offset];
          if (before) {
            element.insertBefore(textNode, before);
          } else {
            element.appendChild(textNode);
          }
        }
      }
      if (ignoresCheckedAttribute && isChecked) {
        element.setAttribute('checked', 'checked');
      }
    };

    prototype.cloneNode = function(element, deep){
      var clone = element.cloneNode(!!deep);
      return clone;
    };

    prototype.createMorph = function(parent, start, end, contextualElement){
      if (!contextualElement && parent.nodeType === Node.ELEMENT_NODE) {
        contextualElement = parent;
      }
      if (!contextualElement) {
        contextualElement = this.document.body;
      }
      return new Morph(parent, start, end, this, contextualElement);
    };

    // This helper is just to keep the templates good looking,
    // passing integers instead of element references.
    prototype.createMorphAt = function(parent, startIndex, endIndex, contextualElement){
      var childNodes = parent.childNodes,
          start = startIndex === -1 ? null : childNodes[startIndex],
          end = endIndex === -1 ? null : childNodes[endIndex];
      return this.createMorph(parent, start, end, contextualElement);
    };

    prototype.parseHTML = function(html, contextualElement){
      var element = this.cloneNode(contextualElement, false);
      element.innerHTML = html;
      return element.childNodes;
    };

    __exports__["default"] = DOMHelper;
  });
define("morph/morph",
  ["exports"],
  function(__exports__) {
    "use strict";
    var splice = Array.prototype.splice;

    function Morph(parent, start, end, domHelper, contextualElement) {
      // TODO: this is an internal API, this should be an assert
      if (parent.nodeType === 11) {
        if (start === null || end === null) {
          throw new Error('a fragment parent must have boundary nodes in order to detect insertion');
        }
        this.element = null;
      } else {
        this.element = parent;
      }
      this._parent = parent;
      this.start = start;
      this.end = end;
      this.domHelper = domHelper;
      if (!contextualElement || contextualElement.nodeType !== Node.ELEMENT_NODE) {
        throw new Error('An element node must be provided for a contextualElement, you provided '+(contextualElement ? 'nodeType '+contextualElement.nodeType : 'nothing'));
      }
      this.contextualElement = contextualElement;
      this.text = null;
      this.owner = null;
      this.morphs = null;
      this.before = null;
      this.after = null;
      this.escaped = true;
    }

    Morph.prototype.parent = function () {
      if (!this.element) {
        var parent = this.start.parentNode;
        if (this._parent !== parent) {
          this.element = this._parent = parent;
        }
      }
      return this._parent;
    };

    Morph.prototype.destroy = function () {
      if (this.owner) {
        this.owner.removeMorph(this);
      } else {
        clear(this.element || this.parent(), this.start, this.end);
      }
    };

    Morph.prototype.removeMorph = function (morph) {
      var morphs = this.morphs;
      for (var i=0, l=morphs.length; i<l; i++) {
        if (morphs[i] === morph) {
          this.replace(i, 1);
          break;
        }
      }
    };

    Morph.prototype.update = function (nodeOrString) {
      this._update(this.element || this.parent(), nodeOrString);
    };

    Morph.prototype.updateNode = function (node) {
      var parent = this.element || this.parent();
      if (!node) return this._updateText(parent, '');
      this._updateNode(parent, node);
    };

    Morph.prototype.updateText = function (text) {
      this._updateText(this.element || this.parent(), text);
    };

    Morph.prototype.updateHTML = function (html) {
      var parent = this.element || this.parent();
      if (!html) return this._updateText(parent, '');
      this._updateHTML(parent, html);
    };

    Morph.prototype._update = function (parent, nodeOrString) {
      if (nodeOrString === null || nodeOrString === undefined) {
        this._updateText(parent, '');
      } else if (typeof nodeOrString === 'string') {
        if (this.escaped) {
          this._updateText(parent, nodeOrString);
        } else {
          this._updateHTML(parent, nodeOrString);
        }
      } else if (nodeOrString.nodeType) {
        this._updateNode(parent, nodeOrString);
      } else if (nodeOrString.string) { // duck typed SafeString
        this._updateHTML(parent, nodeOrString.string);
      } else {
        this._updateText(parent, nodeOrString.toString());
      }
    };

    Morph.prototype._updateNode = function (parent, node) {
      if (this.text) {
        if (node.nodeType === 3) {
          this.text.nodeValue = node.nodeValue;
          return;
        } else {
          this.text = null;
        }
      }
      var start = this.start, end = this.end;
      clear(parent, start, end);
      parent.insertBefore(node, end);
      if (this.before !== null) {
        this.before.end = start.nextSibling;
      }
      if (this.after !== null) {
        this.after.start = end.previousSibling;
      }
    };

    Morph.prototype._updateText = function (parent, text) {
      if (this.text) {
        this.text.nodeValue = text;
        return;
      }
      var node = this.domHelper.createTextNode(text);
      this.text = node;
      clear(parent, this.start, this.end);
      parent.insertBefore(node, this.end);
      if (this.before !== null) {
        this.before.end = node;
      }
      if (this.after !== null) {
        this.after.start = node;
      }
    };

    Morph.prototype._updateHTML = function (parent, html) {
      var start = this.start, end = this.end;
      clear(parent, start, end);
      this.text = null;
      var childNodes = this.domHelper.parseHTML(html, this.contextualElement);
      appendChildren(parent, end, childNodes);
      if (this.before !== null) {
        this.before.end = start.nextSibling;
      }
      if (this.after !== null) {
        this.after.start = end.previousSibling;
      }
    };

    Morph.prototype.append = function (node) {
      if (this.morphs === null) this.morphs = [];
      var index = this.morphs.length;
      return this.insert(index, node);
    };

    Morph.prototype.insert = function (index, node) {
      if (this.morphs === null) this.morphs = [];
      var parent = this.element || this.parent(),
        morphs = this.morphs,
        before = index > 0 ? morphs[index-1] : null,
        after  = index < morphs.length ? morphs[index] : null,
        start  = before === null ? this.start : (before.end === null ? parent.lastChild : before.end.previousSibling),
        end    = after === null ? this.end : (after.start === null ? parent.firstChild : after.start.nextSibling),
        morph  = new Morph(parent, start, end, this.domHelper, this.contextualElement);
      morph.owner = this;
      morph._update(parent, node);
      if (before !== null) {
        morph.before = before;
        before.end = start.nextSibling;
        before.after = morph;
      }
      if (after !== null) {
        morph.after = after;
        after.before = morph;
        after.start = end.previousSibling;
      }
      this.morphs.splice(index, 0, morph);
      return morph;
    };

    Morph.prototype.replace = function (index, removedLength, addedNodes) {
      if (this.morphs === null) this.morphs = [];
      var parent = this.element || this.parent(),
        morphs = this.morphs,
        before = index > 0 ? morphs[index-1] : null,
        after = index+removedLength < morphs.length ? morphs[index+removedLength] : null,
        start = before === null ? this.start : (before.end === null ? parent.lastChild : before.end.previousSibling),
        end   = after === null ? this.end : (after.start === null ? parent.firstChild : after.start.nextSibling),
        addedLength = addedNodes === undefined ? 0 : addedNodes.length,
        args, i, current;

      if (removedLength > 0) {
        clear(parent, start, end);
      }

      if (addedLength === 0) {
        if (before !== null) {
          before.after = after;
          before.end = end;
        }
        if (after !== null) {
          after.before = before;
          after.start = start;
        }
        morphs.splice(index, removedLength);
        return;
      }

      args = new Array(addedLength+2);
      if (addedLength > 0) {
        for (i=0; i<addedLength; i++) {
          args[i+2] = current = new Morph(parent, start, end, this.domHelper, this.contextualElement);
          current._update(parent, addedNodes[i]);
          current.owner = this;
          if (before !== null) {
            current.before = before;
            before.end = start.nextSibling;
            before.after = current;
          }
          before = current;
          start = end === null ? parent.lastChild : end.previousSibling;
        }
        if (after !== null) {
          current.after = after;
          after.before = current;
          after.start = end.previousSibling;
        }
      }

      args[0] = index;
      args[1] = removedLength;

      splice.apply(morphs, args);
    };

    function appendChildren(parent, end, nodeList) {
      var ref = end,
          i = nodeList.length,
          node;
      while (i--) {
        node = nodeList[i];
        parent.insertBefore(node, ref);
        ref = node;
      }
    }

    function clear(parent, start, end) {
      var current, previous;
      if (end === null) {
        current = parent.lastChild;
      } else {
        current = end.previousSibling;
      }

      while (current !== null && current !== start) {
        previous = current.previousSibling;
        parent.removeChild(current);
        current = previous;
      }
    }

    __exports__["default"] = Morph;
  });