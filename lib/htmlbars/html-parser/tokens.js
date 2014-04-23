import { Chars, StartTag, EndTag } from "simple-html-tokenizer";
import { AttrNode, TextNode } from "htmlbars/ast";

StartTag.prototype.startAttribute = function(char) {
  this.addCurrentAttributeKey();
  this.currentAttribute = new AttrNode(char.toLowerCase(), []);
  this.attributes.push(this.currentAttribute);
};

StartTag.prototype.addToAttributeName = function(char) {
  this.currentAttribute.name += char;
};

StartTag.prototype.addToAttributeValue = function(char) {
  var value = this.currentAttribute.value;

  if (char.type === 'mustache') {
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
  this.addCurrentAttributeKey();
  delete this.currentAttribute;
  return this;
};

StartTag.prototype.addCurrentAttributeKey = function() {
  var attr = this.currentAttribute;
  if (attr) {
    this.attributes[attr.name] = attr.value;
  }
};

StartTag.prototype.addTagHelper = function(helper) {
  var helpers = this.helpers = this.helpers || [];
  helpers.push(helper);
};

export { Chars, StartTag, EndTag };
