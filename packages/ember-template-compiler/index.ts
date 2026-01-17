export * from './lib/public-api';
import * as ETC from './lib/public-api';
import { __registerTemplateCompiler } from '@ember/template-compilation';

__registerTemplateCompiler(ETC);
