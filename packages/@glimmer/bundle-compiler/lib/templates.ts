import { ASTPluginBuilder, preprocess } from "@glimmer/syntax";
import { TemplateMeta, SerializedTemplateBlock, TemplateJavascript, SerializedTemplateWithLazyBlock } from "@glimmer/wire-format";
import { TemplateCompiler, defaultId } from "@glimmer/compiler";
import { dict } from "@glimmer/util";

export interface EagerCompilerOptions<T extends TemplateMeta> {
  meta: T;
  plugins: ASTPluginBuilder[];
  lookup: string;
}

export interface TemplateJSON<T extends TemplateMeta> {
  lookup: string;
  block: SerializedTemplateBlock;
  meta: T;
}

export class Templates<T extends TemplateMeta> {
  private templates: TemplateJSON<T>[] = [];
  private dict = dict<TemplateJSON<T>>();

  compile(input: string, options: EagerCompilerOptions<T>) {
    let ast = preprocess(input, { plugins: { ast: options.plugins } });
    let template = TemplateCompiler.compile(options, ast);
    let { lookup } = options;
    let { block, meta } = template.toJSON();

    let value = Object.freeze({ lookup, block, meta });
    this.templates.push(value);
    this.dict[lookup] = value;
  }

  eachTemplate(callback: (template: TemplateJavascript) => void) {
    let templates = this.templates;
    for (let i=0; i<templates.length; i++) {
      let { block: jsonBlock, meta } = templates[i];

      let block = JSON.stringify(jsonBlock);
      let id = defaultId(`${JSON.stringify(meta)}${block}`);

      let templateJSONObject: SerializedTemplateWithLazyBlock<TemplateMeta> = { id, block, meta };
      callback(JSON.stringify(templateJSONObject));
    }
  }
}
