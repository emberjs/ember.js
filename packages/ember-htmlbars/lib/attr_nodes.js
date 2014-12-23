/**
@module ember
@submodule ember-htmlbars
*/

import PropertyAttrNode from "ember-htmlbars/attr_nodes/property";
import AttributeAttrNode from "ember-htmlbars/attr_nodes/attribute";
import { normalizeProperty } from "ember-htmlbars/attr_nodes/utils";

var svgNamespaceURI = 'http://www.w3.org/2000/svg';

export default function attrNodeTypeFor(attrName, element) {
  if (element.namespaceURI === svgNamespaceURI || attrName === 'style') {
    return AttributeAttrNode;
  } else {
    var normalized = normalizeProperty(element, attrName);
    if (normalized) {
      return PropertyAttrNode;
    } else {
      return AttributeAttrNode;
    }
  }
}
