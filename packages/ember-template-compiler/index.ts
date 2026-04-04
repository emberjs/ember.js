export {
  precompile,
  compile,
  compileOptions,
  _buildCompileOptions,
  _transformsFor,
  RESOLUTION_MODE_TRANSFORMS,
  STRICT_MODE_TRANSFORMS,
  _preprocess,
  _print,
  _precompile,
  _GlimmerSyntax,
  VERSION,
} from './lib/public-api';
export type { EmberPrecompileOptions } from './lib/public-api';
// NOTE: import * is intentional here -- the namespace object is passed to __registerTemplateCompiler
import * as ETC from './lib/public-api';
import { __registerTemplateCompiler } from '@ember/template-compilation';

__registerTemplateCompiler(ETC);
