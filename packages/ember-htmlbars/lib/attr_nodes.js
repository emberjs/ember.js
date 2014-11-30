/**
@module ember
@submodule ember-htmlbars
*/

import QuotedAttrNode from "ember-htmlbars/attr_nodes/quoted";
import UnquotedAttrNode from "ember-htmlbars/attr_nodes/unquoted";
import UnquotedNonpropertyAttrNode from "ember-htmlbars/attr_nodes/unquoted_nonproperty";
import QuotedClassAttrNode from "ember-htmlbars/attr_nodes/quoted_class";
import { create as o_create } from "ember-metal/platform";

var cannotSetPropertyRegex = /[^a-zA-Z]/;
var svgNamespaceURI = 'http://www.w3.org/2000/svg';

var unquotedAttrNodeTypes = o_create(null);
unquotedAttrNodeTypes['class'] = UnquotedNonpropertyAttrNode;

var quotedAttrNodeTypes = o_create(null);
quotedAttrNodeTypes['class'] = QuotedClassAttrNode;

export default function attrNodeTypeFor(attrName, element, quoted) {
  var result;
  if (quoted) {
    result = quotedAttrNodeTypes[attrName];
    if (!result) {
      result = QuotedAttrNode;
      quotedAttrNodeTypes[attrName] = result;
    }
  } else {
    result = unquotedAttrNodeTypes[attrName];
    if (!result) {
      if (element.namespaceURI === svgNamespaceURI) {
        result = UnquotedNonpropertyAttrNode;
      } else if (cannotSetPropertyRegex.test(attrName)) {
        result = UnquotedNonpropertyAttrNode;
      } else {
        result = UnquotedAttrNode;
      }
      unquotedAttrNodeTypes[attrName] = result;
    }
  }

  return result;
}
