/**
@module ember
@submodule ember-htmlbars
*/

import SimpleAttrNode from "./simple";
import { create as o_create } from "ember-metal/platform";
import { chainStream, read } from "ember-metal/streams/utils";
import sanitizeAttributeValue from "ember-views/system/sanitize_attribute_value";

function HrefAttrNode(element, attrName, attrValue, dom) {
  var sanitizedValue = chainStream(attrValue, function(){
    var unsafeValue = read(attrValue);
    var safeValue = sanitizeAttributeValue(element, attrName, unsafeValue);

    return safeValue;
  });

  this.init(element, attrName, sanitizedValue, dom);
}

HrefAttrNode.prototype = o_create(SimpleAttrNode.prototype);

export default HrefAttrNode;
