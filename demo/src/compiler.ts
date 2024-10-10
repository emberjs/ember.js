import type { ASTv1 } from '@glimmer/syntax';
import initSwc, { transformSync, type Output } from '@swc/wasm-web';
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

    const result = transformSync(output, {
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

    // In real life, do something better than this
    if (typeof result?.code !== 'string') {
      throw new Error('Unable to compile');
    }

    result.code = result.code.replace(
      /"moduleName":\s"[^"]+"/u,
      `"moduleName": "${options?.filename ?? 'unknown'}"`
    );

    return Promise.resolve(result as Output);
  };
}

const GJS_COMPILER = new GjsCompiler();

export const compile = GJS_COMPILER.compile;

export interface PrinterOptions {
  entityEncoding: ASTv1.EntityEncodingState;

  /**
   * Used to override the mechanism of printing a given AST.Node.
   *
   * This will generally only be useful to source -> source codemods
   * where you would like to specialize/override the way a given node is
   * printed (e.g. you would like to preserve as much of the original
   * formatting as possible).
   *
   * When the provided override returns undefined, the default built in printing
   * will be done for the AST.Node.
   *
   * @param ast the ast node to be printed
   * @param options the options specified during the print() invocation
   */
  override?(ast: ASTv1.Node, options: PrinterOptions): void | string;
}
