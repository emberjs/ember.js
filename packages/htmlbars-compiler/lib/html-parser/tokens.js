import { Chars, StartTag, EndTag } from "../../simple-html-tokenizer";
import { buildText, buildAttr, buildString } from "../builders";

StartTag.prototype.startAttribute = function(char) {
  this.currentAttribute = buildAttr(char.toLowerCase(), [], null);
  this.attributes.push(this.currentAttribute);
};

StartTag.prototype.markAttributeQuoted = function(value) {
  this.currentAttribute.quoted = value;
};

StartTag.prototype.addToAttributeName = function(char) {
  this.currentAttribute.name += char;
};

StartTag.prototype.addToAttributeValue = function(char) {
  var value = this.currentAttribute.value;

  if (char.type === 'SubExpression' || char.type === 'PathExpression') {
    value.push(char);
  } else {
    if (value.length > 0 && value[value.length - 1].type === 'TextNode') {
      value[value.length - 1].chars += char;
    } else {
      value.push(buildText(char));
    }
  }
};

StartTag.prototype.finalize = function() {
  this.finalizeAttributeValue();
  return this;
};

StartTag.prototype.finalizeAttributeValue = function() {
  if (!this.currentAttribute) {
    return;
  }

  var parts = this.currentAttribute.value;

  if (parts.length === 0) {
    parts.push(buildText(''));
  } else if (parts.length > 1) {
    // Convert TextNode to StringNode
    for (var i = 0; i < parts.length; i++) {
      if (parts[i].type === 'TextNode') {
        parts[i] = buildString(parts[i].chars);
      }
    }
  }

  delete this.currentAttribute;
};

StartTag.prototype.addTagHelper = function(helper) {
  var helpers = this.helpers = this.helpers || [];
  helpers.push(helper);
};

export { Chars, StartTag, EndTag };
