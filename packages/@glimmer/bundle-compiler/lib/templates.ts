import { ASTPluginBuilder, preprocess } from "@glimmer/syntax";
import { TemplateMeta, SerializedTemplateBlock } from "@glimmer/wire-format";
import { TemplateCompiler } from "@glimmer/compiler";
import { Option, Dict } from "@glimmer/interfaces";
import { dict } from "@glimmer/util";

export interface EagerCompilerOptions<T extends TemplateMeta> {
  meta: T;
  plugins: ASTPluginBuilder[];
  id: string;
  lookup: string;
}

interface TemplateJSON<T extends TemplateMeta> {
  id: Option<string>;
  block: SerializedTemplateBlock;
  meta: T;
}

export class Templates<T extends TemplateMeta> {
  private templates: TemplateJSON<T>[];
  private dict = dict<TemplateJSON<T>>();

  compile(input: string, options: EagerCompilerOptions<T>) {
    let ast = preprocess(input, options);
    let template = TemplateCompiler.compile(options, ast);
    let { id, lookup } = options;
    let { block, meta } = template.toJSON();

    let value = Object.freeze({ id, block, meta });
    this.templates.push(value);
    this.dict[lookup] = value;
  }
}
