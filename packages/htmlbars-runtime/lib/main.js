import { domHelpers } from "./dom_helpers";
import { Placeholder } from "./placeholder";

export function hydrate(spec, options) {
  return spec(domHelpers(options && options.extensions), Placeholder);
}
