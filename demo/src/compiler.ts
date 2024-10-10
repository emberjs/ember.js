import initSwc, { transform } from '@swc/wasm-web';
import type { PreprocessorOptions as ContentTagOptions } from 'content-tag';
import { Preprocessor } from 'content-tag';

await initSwc({});

export class GjsCompiler {
  readonly #contentTagPreprocessor = new Preprocessor();

  #contentTag(source: string, options?: ContentTagOptions): string {
    return this.#contentTagPreprocessor.process(source, options);
  }

  compile = async (source: string, options?: ContentTagOptions): Promise<{ code: string }> => {
    let output = this.#contentTag(source, { inline_source_map: true, ...options });

    return transform(output, {
      filename: options?.filename ?? 'unknown',
      sourceMaps: options?.inline_source_map ? 'inline' : false,
      inlineSourcesContent: Boolean(options?.inline_source_map),
      jsc: {
        parser: {
          syntax: 'typescript',
          decorators: true,
        },
        transform: {
          legacyDecorator: true,
          useDefineForClassFields: false,
        },
      },
    });
  };
}

const GJS_COMPILER = new GjsCompiler();

export const compile = GJS_COMPILER.compile;
