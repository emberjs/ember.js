/**
@module ember
@submodule ember-htmlbars
*/

import run from "ember-metal/run_loop";
import concat from "ember-htmlbars/system/concat";

export default function attribute(element, attributeName, quoted, view, parts, options, env) {
  var dom = env.dom;
  var isDirty, lastRenderedValue, attrValueStream;

  if (quoted) {
    attrValueStream = concat(parts);
  } else {
    attrValueStream = parts[0];
  }

  attrValueStream.subscribe(function() {
    isDirty = true;

    run.schedule('render', this, function() {
      var value = attrValueStream.value();

      if (isDirty) {
        isDirty = false;

        if (value !== lastRenderedValue) {
          lastRenderedValue = value;

          if (lastRenderedValue === null) {
            dom.removeAttribute(element, attributeName);
          } else {
            dom.setAttribute(element, attributeName, lastRenderedValue);
          }
        }
      }
    });
  });

  lastRenderedValue = attrValueStream.value();

  if (lastRenderedValue !== null) {
    dom.setAttribute(element, attributeName, lastRenderedValue);
  }
}
