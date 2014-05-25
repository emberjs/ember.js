import { domHelpers } from "./dom_helpers";
import { Morph } from "./morph";

export function hydrate(spec, options) {
  return spec(domHelpers(options && options.extensions), Morph);
}
