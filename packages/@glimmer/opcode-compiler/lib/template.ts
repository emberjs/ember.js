import { CompilableProgram, Template, Opaque, Option } from '@glimmer/interfaces';
import { assign } from '@glimmer/util';
import {
  SerializedTemplateBlock,
  SerializedTemplateWithLazyBlock,
  Statement
} from '@glimmer/wire-format';
import CompilableTemplate from './compilable-template';
import { ParsedLayout } from './interfaces';
import { WrappedBuilder } from "./wrapped-component";
import { CompileOptions, TemplateOptions } from "./syntax";

export interface TemplateFactory<TemplateMeta> {
  /**
   * Template identifier, if precompiled will be the id of the
   * precompiled template.
   */
  id: string;

  /**
   * Compile time meta.
   */
  meta: TemplateMeta;

  /**
   * Used to create an environment specific singleton instance
   * of the template.
   *
   * @param {Environment} env glimmer Environment
   */
  create(env: TemplateOptions<Opaque>): Template<TemplateMeta>;
  /**
   * Used to create an environment specific singleton instance
   * of the template.
   *
   * @param {Environment} env glimmer Environment
   * @param {Object} meta environment specific injections into meta
   */
  create<U>(env: TemplateOptions<Opaque>, meta: U): Template<TemplateMeta & U>;
}

let clientId = 0;

/**
 * Wraps a template js in a template module to change it into a factory
 * that handles lazy parsing the template and to create per env singletons
 * of the template.
 */
export default function templateFactory<TemplateMeta>(serializedTemplate: SerializedTemplateWithLazyBlock<TemplateMeta>): TemplateFactory<TemplateMeta>;
export default function templateFactory<TemplateMeta, U>(serializedTemplate: SerializedTemplateWithLazyBlock<TemplateMeta>): TemplateFactory<TemplateMeta & U>;
export default function templateFactory({ id: templateId, meta, block }: SerializedTemplateWithLazyBlock<any>): TemplateFactory<{}> {
  let parsedBlock: SerializedTemplateBlock;
  let id = templateId || `client-${clientId++}`;
  let create = (options: TemplateOptions<Opaque>, envMeta?: {}) => {
    let newMeta = envMeta ? assign({}, envMeta, meta) : meta;
    if (!parsedBlock) {
      parsedBlock = JSON.parse(block);
    }
    return new TemplateImpl(options, { id, block: parsedBlock, referrer: newMeta });
  };
  return { id, meta, create };
}

class TemplateImpl<TemplateMeta = Opaque> implements Template<TemplateMeta> {
  private layout: Option<CompilableProgram> = null;
  private partial: Option<CompilableProgram> = null;
  private wrappedLayout: Option<CompilableProgram> = null;
  public symbols: string[];
  public hasEval: boolean;
  public id: string;
  public referrer: TemplateMeta;
  private statements: Statement[];

  constructor(private options: TemplateOptions<TemplateMeta>, private parsedLayout: ParsedLayout<TemplateMeta>) {
    let { block } = parsedLayout;
    this.symbols = block.symbols;
    this.hasEval = block.hasEval;
    this.statements = block.statements;
    this.referrer = parsedLayout.referrer;
    this.id = parsedLayout.id || `client-${clientId++}`;
  }

  asLayout(): CompilableProgram {
    if (this.layout) return this.layout;
    return this.layout = compilable(this.parsedLayout, this.options, false);
  }

  asPartial(): CompilableProgram {
    if (this.partial) return this.partial;
    return this.partial = compilable(this.parsedLayout, this.options, true);
  }

  asWrappedLayout(): CompilableProgram {
    if (this.wrappedLayout) return this.wrappedLayout;
    let compileOptions: CompileOptions<TemplateMeta> = assign({}, this.options, {
      asPartial: false,
      referrer: this.referrer
    });
    return this.wrappedLayout = new WrappedBuilder(compileOptions, this.parsedLayout);
  }
}

export function compilable<TemplateMeta>(layout: ParsedLayout<TemplateMeta>, options: TemplateOptions<Opaque>, asPartial: boolean) {
  let { block, referrer } = layout;
  let { hasEval, symbols } = block;
  let compileOptions = assign({}, options, { asPartial, referrer });

  return new CompilableTemplate(block.statements, layout, compileOptions, { referrer, hasEval, symbols });
}
