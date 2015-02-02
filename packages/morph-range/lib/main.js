import { clear, insertBefore } from './morph-range/utils';

function Morph(domHelper, contextualElement) {
  this.domHelper = domHelper;
  // context if content if current content is detached
  this.contextualElement = contextualElement;

  // flag to force text to setContent to be treated as html
  this.parseTextAsHTML = false;

  this.firstNode = null;
  this.lastNode  = null;

  // morph graph
  this.parentMorph     = null;
  this.firstChildMorph = null;
  this.lastChildMorph  = null;

  this.previousMorph = null;
  this.nextMorph = null;
}

Morph.prototype.setContent = function Morph$setContent(content) {
  if (content === null || content === undefined) {
    return this.clear();
  }

  var type = typeof content;
  switch (type) {
    case 'string':
      if (this.parseTextAsHTML) {
        return this.setHTML(content);
      }
      return this.setText(content);
    case 'object':
      if (typeof content.nodeType === 'number') {
        return this.setNode(content);
      }
      /* Handlebars.SafeString */
      if (typeof content.string === 'string') {
        return this.setHTML(content.string);
      }
      if (this.parseTextAsHTML) {
        return this.setHTML(content.toString());
      }
      /* falls through */
    case 'boolean':
    case 'number':
      return this.setText(content.toString());
    default:
      throw new TypeError('unsupported content');
  }
};

Morph.prototype.clear = function Morph$clear() {
  return this.setNode(this.domHelper.createComment(''));
};

Morph.prototype.setText = function Morph$setText(text) {
  var firstNode = this.firstNode;
  var lastNode = this.lastNode;

  if (lastNode === firstNode && firstNode.nodeType === 3) {
    firstNode.nodeValue = text;
    return firstNode;
  }

  return this.setNode(
    text ? this.domHelper.createTextNode(text) : this.domHelper.createComment('')
  );
};

Morph.prototype.setNode = function Morph$setNode(newNode) {
  var firstNode, lastNode;
  switch (newNode.nodeType) {
    case 3:
      firstNode = newNode;
      lastNode = newNode;
      break;
    case 11:
      firstNode = newNode.firstChild;
      lastNode = newNode.lastChild;
      if (firstNode === null) {
        firstNode = this.domHelper.createComment('');
        newNode.appendChild(firstNode);
        lastNode = firstNode;
      }
      break;
    default:
      firstNode = newNode;
      lastNode = newNode;
      break;
  }

  var previousFirstNode = this.firstNode;
  if (previousFirstNode !== null) {

    var parentNode = previousFirstNode.parentNode;
    insertBefore(parentNode, firstNode, lastNode, previousFirstNode);
    clear(parentNode, previousFirstNode, this.lastNode);
  }

  // TODO recursively set parentMorph.firstNode if we are its firstChildMorph
  this.firstNode = firstNode;

  // TODO recursively set parentMorph.lastNode if we are its lastChildMorph
  this.lastNode  = lastNode;

  return newNode;
};

// return morph content to an undifferentiated state
// drops knowledge that the node has content.
// this is for rerender, I need to test, but basically
// the idea is to leave the content, but allow render again
// without appending, so n
Morph.prototype.reset = function Morph$reset() {
  this.firstChildMorph = undefined;
  this.lastChildMorph = undefined;
};

Morph.prototype.destroy = function Morph$destroy() {
  var parentMorph = this.parentMorph;
  var previousMorph = this.previousMorph;
  var nextMorph = this.nextMorph;
  var firstNode = this.firstNode;
  var lastNode = this.lastNode;
  var parentNode = firstNode.parentNode;

  if (previousMorph) {
    if (nextMorph) {
      previousMorph.nextMorph = nextMorph;
      nextMorph.previousMorph = previousMorph;
    } else {
      previousMorph.nextMorph = null;
      parentMorph.lastChildMorph = previousMorph;
    }
  } else {
    if (nextMorph) {
      nextMorph.previousMorph = null;
      parentMorph.firstChildMorph = nextMorph;
    } else {
      parentMorph.lastChildMorph = parentMorph.firstChildMorph = null;
    }
  }

  clear(parentNode, firstNode, lastNode);

  // TODO recursively set parentMorph.firstNode if we are its firstChildMorph
  this.firstNode = null;
  // TODO recursively set parentMorph.lastNode if we are its lastChildMorph
  this.lastNode = null;
};

Morph.prototype.setHTML = function(text) {
  var fragment = this.domHelper.parseHTML(text, this.contextualElement);
  return this.setNode(fragment);
};

Morph.prototype.appendMorph = function(morph) {
  this.insertMorphBefore(morph, null);
};

Morph.prototype.insertBeforeMorph = function(morph, _referenceMorph) {
  var referenceMorph = _referenceMorph ? _referenceMorph : this.lastChildMorph;
  var refNode = referenceMorph ? referenceMorph.firstNode : this.firstNode;
  var parentNode = refNode.parentNode;
  insertBefore(parentNode, morph.firstNode, morph.lastNode, refNode);
  if (!referenceMorph) {
    clear(parentNode, this.firstNode, this.lastNode);
    this.firstNode = morph.firstNode;
    this.lastNode = morph.lastNode;
    return;
  }

  var previousMorph = referenceMorph.previousMorph;
  if (previousMorph) {
    previousMorph.nextMorph = morph;
  } else {
    this.firstNode = morph.firstNode;
  }

  referenceMorph.previousMorph = morph;
};

export default Morph;
