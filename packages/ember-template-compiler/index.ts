export * from './lib/public-api';
import * as ETC from './lib/public-api';
import { __registerTemplateCompiler } from '@ember/template-compilation';

__registerTemplateCompiler(ETC);
// used to bootstrap templates
import './lib/system/bootstrap';

// add domTemplates initializer (only does something if `ember-template-compiler`
// is loaded already)
import './lib/system/initializer';
