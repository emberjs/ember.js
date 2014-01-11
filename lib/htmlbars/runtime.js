import { domHelpers } from "htmlbars/runtime/dom_helpers";
import { Range } from "htmlbars/runtime/range";

export function hydrate(spec, options) {
  return spec(domHelpers(options && options.extensions), Range);
}
