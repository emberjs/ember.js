import { Chars, StartTag, EndTag } from "../../simple-html-tokenizer";
import { AttrNode, TextNode, StringNode } from "../ast";

StartTag.prototype.startAttribute = function(char) {
  this.finalizeAttributeValue();
  this.currentAttribute = new AttrNode(char.toLowerCase(), []);
  this.attributes.push(this.currentAttribute);
};

StartTag.prototype.addToAttributeName = function(char) {
  this.currentAttribute.name += char;
};

StartTag.prototype.addToAttributeValue = function(char) {
  var value = this.currentAttribute.value;

  if (char.type === 'sexpr') {
    value.push(char);
  } else {
    if (value.length > 0 && value[value.length - 1].type === 'text') {
      value[value.length - 1].chars += char;
    } else {
      value.push(new TextNode(char));
    }
  }
};

StartTag.prototype.finalize = function() {
  this.finalizeAttributeValue();
  delete this.currentAttribute;
  return this;
};

StartTag.prototype.finalizeAttributeValue = function() {
  var attr = this.currentAttribute;
  var part;

  if (!attr) {
    return;
  }

  if (attr.value.length === 1) {
    part = attr.value[0];
    if (part.type === 'sexpr') {
      if (!attr.quoted) {
        attr.value = part;
      }
    } else {
      attr.value = part;
    }
  } else {
    // Convert TextNode to StringNode
    for (var i = 0; i < attr.value.length; i++) {
      part = attr.value[i];

      if (part.type === 'text') {
        attr.value[i] = new StringNode(part.chars);
      }
    }
  }
};

StartTag.prototype.addTagHelper = function(helper) {
  var helpers = this.helpers = this.helpers || [];
  helpers.push(helper);
};

export { Chars, StartTag, EndTag };
