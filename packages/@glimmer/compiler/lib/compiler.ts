import { preprocess } from "@glimmer/syntax";
import TemplateCompiler, { CompileOptions } from "./template-compiler";
import { SerializedTemplateWithLazyBlock, TemplateJavascript, TemplateMeta } from "@glimmer/wire-format";
import { Option } from "@glimmer/interfaces";
import { PreprocessOptions } from "@glimmer/syntax";

export interface TemplateIdFn {
  (src: string): Option<string>;
}

export interface PrecompileOptions<T extends TemplateMeta> extends CompileOptions<T>, PreprocessOptions {
  id?: TemplateIdFn;
}

declare function require(id: string): any;

export const defaultId: TemplateIdFn = (() => {
  if (typeof require === 'function') {
    try {
      /* tslint:disable:no-require-imports */
      const crypto = require('crypto');
      /* tslint:enable:no-require-imports */

      let idFn: TemplateIdFn = src => {
        let hash = crypto.createHash('sha1');
        hash.update(src, 'utf8');
        // trim to 6 bytes of data (2^48 - 1)
        return hash.digest('base64').substring(0,8);
      };

      idFn("test");

      return idFn;
    } catch (e) {
    }
  }

  return function idFn() { return null; };
})();

const defaultOptions: PrecompileOptions<TemplateMeta> = {
  id: defaultId,
  meta: {}
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
export function precompile<T extends TemplateMeta>(string: string, options?: PrecompileOptions<T>): TemplateJavascript;
export function precompile(string: string, options: PrecompileOptions<TemplateMeta> = defaultOptions): TemplateJavascript {
  let ast = preprocess(string, options);
  let { block, meta } = TemplateCompiler.compile(options, ast);
  let idFn = options.id || defaultId;
  let blockJSON = JSON.stringify(block.toJSON());
  let templateJSONObject: SerializedTemplateWithLazyBlock<TemplateMeta> = {
    id: idFn(JSON.stringify(meta) + blockJSON),
    block: blockJSON,
    meta
  };

  // JSON is javascript
  return JSON.stringify(templateJSONObject);
}
