/**
@module ember
@submodule ember-htmlbars
*/

import QuotedAttrNode from "ember-htmlbars/attr_nodes/quoted";
import UnquotedAttrNode from "ember-htmlbars/attr_nodes/unquoted";
import UnquotedNonpropertyAttrNode from "ember-htmlbars/attr_nodes/unquoted_nonproperty";
import { badAttributes } from "ember-views/system/sanitize_attribute_value";
import SanitizedAttrNode from "ember-htmlbars/attr_nodes/sanitized";
import { create as o_create } from "ember-metal/platform";
import { normalizeProperty } from "ember-htmlbars/attr_nodes/utils";

var svgNamespaceURI = 'http://www.w3.org/2000/svg';

var unquotedAttrNodeTypes = o_create(null);
unquotedAttrNodeTypes['class'] = UnquotedNonpropertyAttrNode;

var quotedAttrNodeTypes = o_create(null);

for (var attrName in badAttributes) {
  unquotedAttrNodeTypes[attrName] = SanitizedAttrNode;
  quotedAttrNodeTypes[attrName] = SanitizedAttrNode;
}

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
      } else {
        var normalized = normalizeProperty(element, attrName);
        if (normalized) {
          result = UnquotedAttrNode;
        } else {
          result = UnquotedNonpropertyAttrNode;
        }
      }
      unquotedAttrNodeTypes[attrName] = result;
    }
  }

  return result;
}
