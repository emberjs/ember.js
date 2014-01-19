import { domHelpers } from "htmlbars/runtime/dom_helpers";
import { Placeholder } from "htmlbars/runtime/placeholder";

export function hydrate(spec, options) {
  return spec(domHelpers(options && options.extensions), Placeholder);
}
