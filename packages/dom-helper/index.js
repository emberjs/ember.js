import { svgNamespace, svgHTMLIntegrationPoints } from "./lib/build-html-dom";
import { addClasses, removeClasses } from "./lib/classes";
import { normalizeProperty } from "./lib/prop";
import { isAttrRemovalValue } from "./lib/prop";
var doc = typeof document === 'undefined' ? false : document;
var deletesBlankTextNodes = doc && (function (document) {
    var element = document.createElement('div');
    element.appendChild(document.createTextNode(''));
    var clonedElement = element.cloneNode(true);
    return clonedElement.childNodes.length === 0;
})(doc);
var ignoresCheckedAttribute = doc && (function (document) {
    var element = document.createElement('input');
    element.setAttribute('checked', 'checked');
    var clonedElement = element.cloneNode(false);
    return !clonedElement.checked;
})(doc);
var canRemoveSvgViewBoxAttribute = doc && (doc.createElementNS ? (function (document) {
    var element = document.createElementNS(svgNamespace, 'svg');
    element.setAttribute('viewBox', '0 0 100 100');
    element.removeAttribute('viewBox');
    return !element.getAttribute('viewBox');
})(doc) : true);
var canClone = doc && (function (document) {
    var element = document.createElement('div');
    element.appendChild(document.createTextNode(' '));
    element.appendChild(document.createTextNode(' '));
    var clonedElement = element.cloneNode(true);
    return clonedElement.childNodes[0].nodeValue === ' ';
})(doc);
// This is not the namespace of the element, but of
// the elements inside that element.
function interiorNamespace(element) {
    if (element &&
        element.namespaceURI === svgNamespace &&
        !svgHTMLIntegrationPoints[element.tagName]) {
        return svgNamespace;
    }
    else {
        return null;
    }
}
// The HTML spec allows for "omitted start tags". These tags are optional
// when their intended child is the first thing in the parent tag. For
// example, this is a tbody start tag:
//
// <table>
//   <tbody>
//     <tr>
//
// The tbody may be omitted, and the browser will accept and render:
//
// <table>
//   <tr>
//
// However, the omitted start tag will still be added to the DOM. Here
// we test the string and context to see if the browser is about to
// perform this cleanup.
//
// http://www.whatwg.org/specs/web-apps/current-work/multipage/syntax.html#optional-tags
// describes which tags are omittable. The spec for tbody and colgroup
// explains this behavior:
//
// http://www.whatwg.org/specs/web-apps/current-work/multipage/tables.html#the-tbody-element
// http://www.whatwg.org/specs/web-apps/current-work/multipage/tables.html#the-colgroup-element
//
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
function DOMHelper(_document) {
    this.document = _document || document;
    if (!this.document) {
        throw new Error("A document object must be passed to the DOMHelper, or available on the global scope");
    }
    this.canClone = canClone;
    this.namespace = null;
    this.uselessElement = this.document.createElement('div');
}
var prototype = DOMHelper.prototype;
prototype.constructor = DOMHelper;
prototype.getElementById = function (id, rootNode) {
    rootNode = rootNode || this.document;
    return rootNode.getElementById(id);
};
prototype.insertBefore = function (element, childElement, referenceChild) {
    return element.insertBefore(childElement, referenceChild);
};
prototype.appendChild = function (element, childElement) {
    return element.appendChild(childElement);
};
var itemAt;
// It appears that sometimes, in yet to be itentified scenarios PhantomJS 2.0
// crashes on childNodes.item(index), but works as expected with childNodes[index];
//
// Although it would be nice to move to childNodes[index] in all scenarios,
// this would require SimpleDOM to maintain the childNodes array. This would be
// quite costly, in both dev time and runtime.
//
// So instead, we choose the best possible method and call it a day.
//
/*global navigator */
if (typeof navigator !== 'undefined' &&
    navigator.userAgent.indexOf('PhantomJS')) {
    itemAt = function (nodes, index) {
        return nodes[index];
    };
}
else {
    itemAt = function (nodes, index) {
        return nodes.item(index);
    };
}
prototype.childAt = function (element, indices) {
    var child = element;
    for (var i = 0; i < indices.length; i++) {
        child = itemAt(child.childNodes, indices[i]);
    }
    return child;
};
// Note to a Fellow Implementor:
// Ahh, accessing a child node at an index. Seems like it should be so simple,
// doesn't it? Unfortunately, this particular method has caused us a surprising
// amount of pain. As you'll note below, this method has been modified to walk
// the linked list of child nodes rather than access the child by index
// directly, even though there are two (2) APIs in the DOM that do this for us.
// If you're thinking to yourself, "What an oversight! What an opportunity to
// optimize this code!" then to you I say: stop! For I have a tale to tell.
//
// First, this code must be compatible with simple-dom for rendering on the
// server where there is no real DOM. Previously, we accessed a child node
// directly via `element.childNodes[index]`. While we *could* in theory do a
// full-fidelity simulation of a live `childNodes` array, this is slow,
// complicated and error-prone.
//
// "No problem," we thought, "we'll just use the similar
// `childNodes.item(index)` API." Then, we could just implement our own `item`
// method in simple-dom and walk the child node linked list there, allowing
// us to retain the performance advantages of the (surely optimized) `item()`
// API in the browser.
//
// Unfortunately, an enterprising soul named Samy Alzahrani discovered that in
// IE8, accessing an item out-of-bounds via `item()` causes an exception where
// other browsers return null. This necessitated a... check of
// `childNodes.length`, bringing us back around to having to support a
// full-fidelity `childNodes` array!
//
// Worst of all, Kris Selden investigated how browsers are actualy implemented
// and discovered that they're all linked lists under the hood anyway. Accessing
// `childNodes` requires them to allocate a new live collection backed by that
// linked list, which is itself a rather expensive operation. Our assumed
// optimization had backfired! That is the danger of magical thinking about
// the performance of native implementations.
//
// And this, my friends, is why the following implementation just walks the
// linked list, as surprised as that may make you. Please ensure you understand
// the above before changing this and submitting a PR.
//
// Tom Dale, January 18th, 2015, Portland OR
prototype.childAtIndex = function (element, index) {
    var node = element.firstChild;
    for (var idx = 0; node && idx < index; idx++) {
        node = node.nextSibling;
    }
    return node;
};
prototype.appendText = function (element, text) {
    return element.appendChild(this.document.createTextNode(text));
};
prototype.setAttribute = function (element, name, value) {
    element.setAttribute(name, String(value));
};
prototype.getAttribute = function (element, name) {
    return element.getAttribute(name);
};
prototype.setAttributeNS = function (element, namespace, name, value) {
    element.setAttributeNS(namespace, name, String(value));
};
prototype.getAttributeNS = function (element, namespace, name) {
    return element.getAttributeNS(namespace, name);
};
if (canRemoveSvgViewBoxAttribute) {
    prototype.removeAttribute = function (element, name) {
        element.removeAttribute(name);
    };
}
else {
    prototype.removeAttribute = function (element, name) {
        if (element.tagName === 'svg' && name === 'viewBox') {
            element.setAttribute(name, null);
        }
        else {
            element.removeAttribute(name);
        }
    };
}
prototype.setPropertyStrict = function (element, name, value) {
    if (value === undefined) {
        value = null;
    }
    if (value === null && (name === 'value' || name === 'type' || name === 'src')) {
        value = '';
    }
    element[name] = value;
};
prototype.getPropertyStrict = function (element, name) {
    return element[name];
};
prototype.setProperty = function (element, name, value, namespace) {
    if (element.namespaceURI === svgNamespace) {
        if (isAttrRemovalValue(value)) {
            element.removeAttribute(name);
        }
        else {
            if (namespace) {
                element.setAttributeNS(namespace, name, value);
            }
            else {
                element.setAttribute(name, value);
            }
        }
    }
    else {
        var { normalized, type } = normalizeProperty(element, name);
        if (type === 'prop') {
            element[normalized] = value;
        }
        else {
            if (isAttrRemovalValue(value)) {
                element.removeAttribute(name);
            }
            else {
                if (namespace && element.setAttributeNS) {
                    element.setAttributeNS(namespace, name, value);
                }
                else {
                    element.setAttribute(name, value);
                }
            }
        }
    }
};
if (doc && doc.createElementNS) {
    // Only opt into namespace detection if a contextualElement
    // is passed.
    prototype.createElement = function (tagName, contextualElement) {
        var namespace = this.namespace;
        if (contextualElement) {
            if (tagName === 'svg') {
                namespace = svgNamespace;
            }
            else {
                namespace = interiorNamespace(contextualElement);
            }
        }
        if (namespace) {
            return this.document.createElementNS(namespace, tagName);
        }
        else {
            return this.document.createElement(tagName);
        }
    };
    prototype.setAttributeNS = function (element, namespace, name, value) {
        element.setAttributeNS(namespace, name, String(value));
    };
}
else {
    prototype.createElement = function (tagName) {
        return this.document.createElement(tagName);
    };
    prototype.setAttributeNS = function (element, namespace, name, value) {
        element.setAttribute(name, String(value));
    };
}
prototype.addClasses = addClasses;
prototype.removeClasses = removeClasses;
prototype.setNamespace = function (ns) {
    this.namespace = ns;
};
prototype.detectNamespace = function (element) {
    this.namespace = interiorNamespace(element);
};
prototype.createDocumentFragment = function () {
    return this.document.createDocumentFragment();
};
prototype.createTextNode = function (text) {
    return this.document.createTextNode(text);
};
prototype.createComment = function (text) {
    return this.document.createComment(text);
};
prototype.repairClonedNode = function (element, blankChildTextNodes, isChecked) {
    if (deletesBlankTextNodes && blankChildTextNodes.length > 0) {
        for (var i = 0, len = blankChildTextNodes.length; i < len; i++) {
            var textNode = this.document.createTextNode(''), offset = blankChildTextNodes[i], before = this.childAtIndex(element, offset);
            if (before) {
                element.insertBefore(textNode, before);
            }
            else {
                element.appendChild(textNode);
            }
        }
    }
    if (ignoresCheckedAttribute && isChecked) {
        element.setAttribute('checked', 'checked');
    }
};
prototype.cloneNode = function (element, deep) {
    var clone = element.cloneNode(!!deep);
    return clone;
};
prototype.appendHTMLBefore = function (parent, nextSibling, html) {
    // REFACTOR TODO: table stuff in IE9; maybe just catch exceptions?
    let prev = nextSibling && nextSibling.previousSibling;
    let last;
    if (nextSibling === null) {
        parent.insertAdjacentHTML('beforeEnd', html);
        last = parent.lastChild;
    }
    else if (nextSibling.nodeType === 3) {
        nextSibling.insertAdjacentHTML('beforeBegin', html);
        last = nextSibling.previousSibling;
    }
    else {
        parent.insertBefore(this.uselessElement, nextSibling);
        this.uselessElement.insertAdjacentHTML('beforeBegin', html);
        last = this.uselessElement.previousSibling;
        parent.removeChild(this.uselessElement);
    }
    let first = prev ? prev.nextSibling : parent.firstChild;
    return { first, last };
};
var parsingNode;
// Used to determine whether a URL needs to be sanitized.
prototype.protocolForURL = function (url) {
    if (!parsingNode) {
        parsingNode = this.document.createElement('a');
    }
    parsingNode.href = url;
    return parsingNode.protocol;
};
export default DOMHelper;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi9zcmMvZG9tLWhlbHBlci9pbmRleC50cyJdLCJuYW1lcyI6WyJpbnRlcmlvck5hbWVzcGFjZSIsIkRPTUhlbHBlciJdLCJtYXBwaW5ncyI6Ik9BQU8sRUFDTCxZQUFZLEVBQ1osd0JBQXdCLEVBQ3pCLE1BQU0sc0JBQXNCO09BQ3RCLEVBQ0wsVUFBVSxFQUNWLGFBQWEsRUFDZCxNQUFNLGVBQWU7T0FDZixFQUNMLGlCQUFpQixFQUNsQixNQUFNLFlBQVk7T0FDWixFQUFFLGtCQUFrQixFQUFFLE1BQU0sWUFBWTtBQUUvQyxJQUFJLEdBQUcsR0FBRyxPQUFPLFFBQVEsS0FBSyxXQUFXLEdBQUcsS0FBSyxHQUFHLFFBQVEsQ0FBQztBQUU3RCxJQUFJLHFCQUFxQixHQUFHLEdBQUcsSUFBSSxDQUFDLFVBQVMsUUFBUTtJQUNuRCxJQUFJLE9BQU8sR0FBRyxRQUFRLENBQUMsYUFBYSxDQUFDLEtBQUssQ0FBQyxDQUFDO0lBQzVDLE9BQU8sQ0FBQyxXQUFXLENBQUUsUUFBUSxDQUFDLGNBQWMsQ0FBQyxFQUFFLENBQUMsQ0FBRSxDQUFDO0lBQ25ELElBQUksYUFBYSxHQUFHLE9BQU8sQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLENBQUM7SUFDNUMsTUFBTSxDQUFDLGFBQWEsQ0FBQyxVQUFVLENBQUMsTUFBTSxLQUFLLENBQUMsQ0FBQztBQUMvQyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQztBQUVSLElBQUksdUJBQXVCLEdBQUcsR0FBRyxJQUFJLENBQUMsVUFBUyxRQUFRO0lBQ3JELElBQUksT0FBTyxHQUFHLFFBQVEsQ0FBQyxhQUFhLENBQUMsT0FBTyxDQUFDLENBQUM7SUFDOUMsT0FBTyxDQUFDLFlBQVksQ0FBQyxTQUFTLEVBQUUsU0FBUyxDQUFDLENBQUM7SUFDM0MsSUFBSSxhQUFhLEdBQUcsT0FBTyxDQUFDLFNBQVMsQ0FBQyxLQUFLLENBQUMsQ0FBQztJQUM3QyxNQUFN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