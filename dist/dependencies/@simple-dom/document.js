const EMPTY_ATTRS = [];
function indexOfAttribute(attributes, namespaceURI, localName) {
    for (let i = 0; i < attributes.length; i++) {
        const attr = attributes[i];
        if (attr.namespaceURI === namespaceURI && attr.localName === localName) {
            return i;
        }
    }
    return -1;
}
function adjustAttrName(namespaceURI, localName) {
    return namespaceURI === "http://www.w3.org/1999/xhtml" /* HTML */ ? localName.toLowerCase() : localName;
}
function getAttribute(attributes, namespaceURI, localName) {
    const index = indexOfAttribute(attributes, namespaceURI, localName);
    return index === -1 ? null : attributes[index].value;
}
function removeAttribute(attributes, namespaceURI, localName) {
    const index = indexOfAttribute(attributes, namespaceURI, localName);
    if (index !== -1) {
        attributes.splice(index, 1);
    }
}
// https://dom.spec.whatwg.org/#dom-element-setattributens
function setAttribute(element, namespaceURI, prefix, localName, value) {
    if (typeof value !== 'string') {
        value = '' + value;
    }
    let { attributes } = element;
    if (attributes === EMPTY_ATTRS) {
        attributes = element.attributes = [];
    }
    else {
        const index = indexOfAttribute(attributes, namespaceURI, localName);
        if (index !== -1) {
            attributes[index].value = value;
            return;
        }
    }
    attributes.push({
        localName,
        name: prefix === null ? localName : prefix + ':' + localName,
        namespaceURI,
        prefix,
        specified: true,
        value,
    });
}

class ChildNodes {
    constructor(node) {
        this.node = node;
        this.stale = true;
        this._length = 0;
    }
    get length() {
        if (this.stale) {
            this.stale = false;
            let len = 0;
            let child = this.node.firstChild;
            for (; child !== null; len++) {
                this[len] = child;
                child = child.nextSibling;
            }
            const oldLen = this._length;
            this._length = len;
            for (; len < oldLen; len++) {
                delete this[len];
            }
        }
        return this._length;
    }
    item(index) {
        return index < this.length ? this[index] : null;
    }
}

function cloneNode(node, deep) {
    const clone = nodeFrom(node);
    if (deep) {
        let child = node.firstChild;
        let nextChild = child;
        while (child !== null) {
            nextChild = child.nextSibling;
            clone.appendChild(child.cloneNode(true));
            child = nextChild;
        }
    }
    return clone;
}
function nodeFrom(node) {
    let namespaceURI;
    if (node.nodeType === 1 /* ELEMENT_NODE */) {
        namespaceURI = node.namespaceURI;
    }
    const clone = new SimpleNodeImpl(node.ownerDocument, node.nodeType, node.nodeName, node.nodeValue, namespaceURI);
    if (node.nodeType === 1 /* ELEMENT_NODE */) {
        clone.attributes = copyAttrs(node.attributes);
    }
    return clone;
}
function copyAttrs(attrs) {
    if (attrs === EMPTY_ATTRS) {
        return EMPTY_ATTRS;
    }
    const copy = [];
    for (let i = 0; i < attrs.length; i++) {
        const attr = attrs[i];
        copy.push({
            localName: attr.localName,
            name: attr.name,
            namespaceURI: attr.namespaceURI,
            prefix: attr.prefix,
            specified: true,
            value: attr.value,
        });
    }
    return copy;
}

function insertBefore(parentNode, newChild, refChild) {
    invalidate(parentNode);
    insertBetween(parentNode, newChild, refChild === null ? parentNode.lastChild : refChild.previousSibling, refChild);
}
function removeChild(parentNode, oldChild) {
    invalidate(parentNode);
    removeBetween(parentNode, oldChild, oldChild.previousSibling, oldChild.nextSibling);
}
function invalidate(parentNode) {
    const childNodes = parentNode._childNodes;
    if (childNodes !== undefined) {
        childNodes.stale = true;
    }
}
function insertBetween(parentNode, newChild, previousSibling, nextSibling) {
    if (newChild.nodeType === 11 /* DOCUMENT_FRAGMENT_NODE */) {
        insertFragment(newChild, parentNode, previousSibling, nextSibling);
        return;
    }
    if (newChild.parentNode !== null) {
        removeChild(newChild.parentNode, newChild);
    }
    newChild.parentNode = parentNode;
    newChild.previousSibling = previousSibling;
    newChild.nextSibling = nextSibling;
    if (previousSibling === null) {
        parentNode.firstChild = newChild;
    }
    else {
        previousSibling.nextSibling = newChild;
    }
    if (nextSibling === null) {
        parentNode.lastChild = newChild;
    }
    else {
        nextSibling.previousSibling = newChild;
    }
}
function removeBetween(parentNode, oldChild, previousSibling, nextSibling) {
    oldChild.parentNode = null;
    oldChild.previousSibling = null;
    oldChild.nextSibling = null;
    if (previousSibling === null) {
        parentNode.firstChild = nextSibling;
    }
    else {
        previousSibling.nextSibling = nextSibling;
    }
    if (nextSibling === null) {
        parentNode.lastChild = previousSibling;
    }
    else {
        nextSibling.previousSibling = previousSibling;
    }
}
function insertFragment(fragment, parentNode, previousSibling, nextSibling) {
    const firstChild = fragment.firstChild;
    if (firstChild === null) {
        return;
    }
    fragment.firstChild = null;
    fragment.lastChild = null;
    let lastChild = firstChild;
    let newChild = firstChild;
    firstChild.previousSibling = previousSibling;
    if (previousSibling === null) {
        parentNode.firstChild = firstChild;
    }
    else {
        previousSibling.nextSibling = firstChild;
    }
    while (newChild !== null) {
        newChild.parentNode = parentNode;
        lastChild = newChild;
        newChild = newChild.nextSibling;
    }
    lastChild.nextSibling = nextSibling;
    if (nextSibling === null) {
        parentNode.lastChild = lastChild;
    }
    else {
        nextSibling.previousSibling = lastChild;
    }
}

function parseQualifiedName(qualifiedName) {
    let localName = qualifiedName;
    let prefix = null;
    const i = qualifiedName.indexOf(':');
    if (i !== -1) {
        prefix = qualifiedName.slice(0, i);
        localName = qualifiedName.slice(i + 1);
    }
    return [prefix, localName];
}

class SimpleNodeImpl {
    constructor(ownerDocument, nodeType, nodeName, nodeValue, namespaceURI) {
        this.ownerDocument = ownerDocument;
        this.nodeType = nodeType;
        this.nodeName = nodeName;
        this.nodeValue = nodeValue;
        this.namespaceURI = namespaceURI;
        this.parentNode = null;
        this.previousSibling = null;
        this.nextSibling = null;
        this.firstChild = null;
        this.lastChild = null;
        this.attributes = EMPTY_ATTRS;
        /**
         * @internal
         */
        this._childNodes = undefined;
    }
    get tagName() {
        return this.nodeName;
    }
    get childNodes() {
        let children = this._childNodes;
        if (children === undefined) {
            children = this._childNodes = new ChildNodes(this);
        }
        return children;
    }
    cloneNode(deep) {
        return cloneNode(this, deep === true);
    }
    appendChild(newChild) {
        insertBefore(this, newChild, null);
        return newChild;
    }
    insertBefore(newChild, refChild) {
        insertBefore(this, newChild, refChild);
        return newChild;
    }
    removeChild(oldChild) {
        removeChild(this, oldChild);
        return oldChild;
    }
    insertAdjacentHTML(position, html) {
        const raw = new SimpleNodeImpl(this.ownerDocument, -1 /* RAW_NODE */, '#raw', html, void 0);
        let parentNode;
        let nextSibling;
        switch (position) {
            case 'beforebegin':
                parentNode = this.parentNode;
                nextSibling = this;
                break;
            case 'afterbegin':
                parentNode = this;
                nextSibling = this.firstChild;
                break;
            case 'beforeend':
                parentNode = this;
                nextSibling = null;
                break;
            case 'afterend':
                parentNode = this.parentNode;
                nextSibling = this.nextSibling;
                break;
            default: throw new Error('invalid position');
        }
        if (parentNode === null) {
            throw new Error(`${position} requires a parentNode`);
        }
        insertBefore(parentNode, raw, nextSibling);
    }
    getAttribute(name) {
        const localName = adjustAttrName(this.namespaceURI, name);
        return getAttribute(this.attributes, null, localName);
    }
    getAttributeNS(namespaceURI, localName) {
        return getAttribute(this.attributes, namespaceURI, localName);
    }
    setAttribute(name, value) {
        const localName = adjustAttrName(this.namespaceURI, name);
        setAttribute(this, null, null, localName, value);
    }
    setAttributeNS(namespaceURI, qualifiedName, value) {
        const [prefix, localName] = parseQualifiedName(qualifiedName);
        setAttribute(this, namespaceURI, prefix, localName, value);
    }
    removeAttribute(name) {
        const localName = adjustAttrName(this.namespaceURI, name);
        removeAttribute(this.attributes, null, localName);
    }
    removeAttributeNS(namespaceURI, localName) {
        removeAttribute(this.attributes, namespaceURI, localName);
    }
    get doctype() {
        return this.firstChild;
    }
    get documentElement() {
        return this.lastChild;
    }
    get head() {
        return this.documentElement.firstChild;
    }
    get body() {
        return this.documentElement.lastChild;
    }
    createElement(name) {
        return new SimpleNodeImpl(this, 1 /* ELEMENT_NODE */, name.toUpperCase(), null, "http://www.w3.org/1999/xhtml" /* HTML */);
    }
    createElementNS(namespace, qualifiedName) {
        // Node name is case-preserving in XML contexts, but returns canonical uppercase form in HTML contexts
        // https://www.w3.org/TR/2004/REC-DOM-Level-3-Core-20040407/core.html#ID-104682815
        const nodeName = namespace === "http://www.w3.org/1999/xhtml" /* HTML */ ? qualifiedName.toUpperCase() : qualifiedName;
        // we don't care to parse the qualified name because we only support HTML documents
        // which don't support prefixed elements
        return new SimpleNodeImpl(this, 1 /* ELEMENT_NODE */, nodeName, null, namespace);
    }
    createTextNode(text) {
        return new SimpleNodeImpl(this, 3 /* TEXT_NODE */, '#text', text, void 0);
    }
    createComment(text) {
        return new SimpleNodeImpl(this, 8 /* COMMENT_NODE */, '#comment', text, void 0);
    }
    /**
     * Backwards compat
     * @deprecated
     */
    createRawHTMLSection(text) {
        return new SimpleNodeImpl(this, -1 /* RAW_NODE */, '#raw', text, void 0);
    }
    createDocumentFragment() {
        return new SimpleNodeImpl(this, 11 /* DOCUMENT_FRAGMENT_NODE */, '#document-fragment', null, void 0);
    }
}

function createHTMLDocument() {
    // dom.d.ts types ownerDocument as Document but for a document ownerDocument is null
    const document = new SimpleNodeImpl(null, 9 /* DOCUMENT_NODE */, '#document', null, "http://www.w3.org/1999/xhtml" /* HTML */);
    const doctype = new SimpleNodeImpl(document, 10 /* DOCUMENT_TYPE_NODE */, 'html', null, "http://www.w3.org/1999/xhtml" /* HTML */);
    const html = new SimpleNodeImpl(document, 1 /* ELEMENT_NODE */, 'HTML', null, "http://www.w3.org/1999/xhtml" /* HTML */);
    const head = new SimpleNodeImpl(document, 1 /* ELEMENT_NODE */, 'HEAD', null, "http://www.w3.org/1999/xhtml" /* HTML */);
    const body = new SimpleNodeImpl(document, 1 /* ELEMENT_NODE */, 'BODY', null, "http://www.w3.org/1999/xhtml" /* HTML */);
    html.appendChild(head);
    html.appendChild(body);
    document.appendChild(doctype);
    document.appendChild(html);
    return document;
}

export { createHTMLDocument as default };
