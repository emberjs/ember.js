/*
 * @overview  Glimmer
 * @copyright Copyright 2011-2015 Tilde Inc. and contributors
 * @license   Licensed under MIT license
 *            See https://raw.githubusercontent.com/tildeio/glimmer/master/LICENSE
 * @version   VERSION_STRING_PLACEHOLDER
 */

// Break cycles in the module loader.
import "./glimmer-syntax";

import {
  compile,
  compileSpec
} from "glimmer-compiler";

export {
  compile,
  compileSpec
};
