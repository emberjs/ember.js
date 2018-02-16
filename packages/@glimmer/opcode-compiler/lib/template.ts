import { CompilableProgram, Template, Opaque, Option, LayoutWithContext } from '@glimmer/interfaces';
import { assign } from '@glimmer/util';
import {
  SerializedTemplateBlock,
  SerializedTemplateWithLazyBlock,
  Statement
} from '@glimmer/wire-format';
import { CompilableProgram as CompilableProgramInstance } from './compilable-template';
import { WrappedBuilder } from "./wrapped-component";
import { LazyCompiler } from "@glimmer/opcode-compiler";

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
  create(env: LazyCompiler<TemplateMeta>): Template<TemplateMeta>;
  /**
   * Used to create an environment specific singleton instance
   * of the template.
   *
   * @param {Environment} env glimmer Environment
   * @param {Object} meta environment specific injections into meta
   */
  create<U>(env: LazyCompiler<TemplateMeta>, meta: U): Template<TemplateMeta & U>;
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
  let create = (compiler: LazyCompiler<Opaque>, envMeta?: {}) => {
    let newMeta = envMeta ? assign({}, envMeta, meta) : meta;
    if (!parsedBlock) {
      parsedBlock = JSON.parse(block);
    }
    return new TemplateImpl(compiler, { id, block: parsedBlock, referrer: newMeta, });
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

  constructor(private compiler: LazyCompiler<TemplateMeta>, private parsedLayout: Pick<LayoutWithContext<TemplateMeta>, 'id' | 'block' | 'referrer'>) {
    let { block } = parsedLayout;
    this.symbols = block.symbols;
    this.hasEval = block.hasEval;
    this.statements = block.statements;
    this.referrer = parsedLayout.referrer;
    this.id = parsedLayout.id || `client-${clientId++}`;
  }

  asLayout(): CompilableProgram {
    if (this.layout) return this.layout;
    return this.layout = new CompilableProgramInstance(this.compiler, { ...this.parsedLayout, asPartial: false });
  }

  asPartial(): CompilableProgram {
    if (this.partial) return this.partial;
    return this.layout = new CompilableProgramInstance(this.compiler, { ...this.parsedLayout, asPartial: true });
  }

  asWrappedLayout(): CompilableProgram {
    if (this.wrappedLayout) return this.wrappedLayout;
    return this.wrappedLayout = new WrappedBuilder(this.compiler, { ...this.parsedLayout, asPartial: false });
  }
}
