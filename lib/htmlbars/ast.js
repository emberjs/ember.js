import AST from "handlebars/compiler/ast";
var MustacheNode = AST.MustacheNode;

function HTMLElement(tag, attributes, children, helpers) {
  this.tag = tag;
  this.attributes = attributes || [];
  this.children = children || [];
  this.helpers = helpers || [];

  if (!attributes) { return; }

  for (var i=0, l=attributes.length; i<l; i++) {
    var attribute = attributes[i];
    attributes[attribute[0]] = attribute[1];
  }
}

function appendChild(node) {
  var len = this.children.length, last;
  if (len > 0) {
    last = this.children[len-1];
    if ((last instanceof MustacheNode || last instanceof BlockElement) &&
        (node instanceof MustacheNode || node instanceof BlockElement)) {
      this.children.push('');
    }
  }
  this.children.push(node);
}

HTMLElement.prototype.appendChild = appendChild;

function BlockElement(helper, children) {
  this.helper = helper;
  this.children = children || [];
  this.inverse = null;
}

BlockElement.prototype.appendChild = appendChild;

export { HTMLElement, BlockElement };
