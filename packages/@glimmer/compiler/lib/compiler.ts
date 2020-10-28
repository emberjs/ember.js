import { preprocess } from '@glimmer/syntax';
import TemplateCompiler, { CompileOptions } from './template-compiler';
import { Option, TemplateJavascript, SerializedTemplateWithLazyBlock } from '@glimmer/interfaces';
import { PreprocessOptions } from '@glimmer/syntax';

export interface TemplateIdFn {
  (src: string): Option<string>;
}

export interface PrecompileOptions extends CompileOptions, PreprocessOptions {
  // TODO(template-refactors): This should be removed in the near future, and
  // replaced with a top level `moduleName` API. It is used by ember-cli-htmlbars,
  // and possibly other libraries in the ecosystem, so it should go through a
  // deprecation process.
  meta?: {
    moduleName?: string;
  };
  id?: TemplateIdFn;
}

declare function require(id: string): any;

export const defaultId: TemplateIdFn = (() => {
  if (typeof require === 'function') {
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const crypto = require('crypto');

      let idFn: TemplateIdFn = (src) => {
        let hash = crypto.createHash('sha1');
        hash.update(src, 'utf8');
        // trim to 6 bytes of data (2^48 - 1)
        return hash.digest('base64').substring(0, 8);
      };

      idFn('test');

      return idFn;
    } catch (e) {}
  }

  return function idFn() {
    return null;
  };
})();

const defaultOptions: PrecompileOptions = {
  id: defaultId,
};

/*
 * Compile a string into a template javascript string.
 *
 * Example usage:
 *     import { precompile } from '@glimmer/compiler';
 *     import { templateFactory } from 'glimer-runtime';
 *     let templateJs = precompile("Howdy {{name}}");
 *     let factory = templateFactory(new Function("return " + templateJs)());
 *     let template = factory.create(env);
 *
 * @method precompile
 * @param {string} string a Glimmer template string
 * @return {string} a template javascript string
 */
export function precompile(
  string: string,
  options: PrecompileOptions = defaultOptions
): TemplateJavascript {
  let ast = preprocess(string, options);
  let moduleName = options.meta?.moduleName;
  let { block } = TemplateCompiler.compile(ast, string, options);
  let idFn = options.id || defaultId;
  let blockJSON = JSON.stringify(block.toJSON());
  let templateJSONObject: SerializedTemplateWithLazyBlock = {
    id: idFn(moduleName + blockJSON),
    block: blockJSON,
    moduleName: moduleName ?? '(unknown template module)',
  };

  // JSON is javascript
  return JSON.stringify(templateJSONObject);
}
