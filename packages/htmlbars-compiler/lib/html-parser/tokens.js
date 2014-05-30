import { Chars, StartTag, EndTag } from "simple-html-tokenizer";
import { AttrNode, TextNode, MustacheNode, StringNode, IdNode } from "../ast";

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
  this.finalizeAttributeValue();
  delete this.currentAttribute;
  return this;
};

StartTag.prototype.finalizeAttributeValue = function() {
  var attr = this.currentAttribute;

  if (!attr) return;

  if (attr.value.length === 1) {
    // Unwrap a single TextNode or MustacheNode
    attr.value = attr.value[0];
  } else {
    // If the attr value has multiple parts combine them into
    // a single MustacheNode with the concat helper
    var params = [ new IdNode([{ part: 'concat' }]) ];

    for (var i = 0; i < attr.value.length; i++) {
      var part = attr.value[i];
      if (part.type === 'text') {
        params.push(new StringNode(part.chars));
      } else if (part.type === 'mustache') {
        var sexpr = part.sexpr;
        delete sexpr.isRoot;

        if (sexpr.isHelper) {
          sexpr.isHelper = true;
        }

        params.push(sexpr);
      }
    }

    attr.value = new MustacheNode(params, undefined, true, { left: false, right: false });
  }
};

StartTag.prototype.addTagHelper = function(helper) {
  var helpers = this.helpers = this.helpers || [];
  helpers.push(helper);
};

export { Chars, StartTag, EndTag };
