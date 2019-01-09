import {
  CompilableProgram,
  LayoutWithContext,
  Option,
  SerializedTemplateBlock,
  SerializedTemplateWithLazyBlock,
  Template,
  TemplateMeta,
} from '@glimmer/interfaces';
import { assign } from '@glimmer/util';
import { compilable } from './compilable-template';
import { WrappedBuilder } from './wrapped-component';

export interface TemplateFactory<M> {
  /**
   * Template identifier, if precompiled will be the id of the
   * precompiled template.
   */
  id: string;

  /**
   * Compile time meta.
   */
  meta: M;

  /**
   * Used to create an environment specific singleton instance
   * of the template.
   *
   * @param {Environment} env glimmer Environment
   */
  create(): Template<TemplateMeta<M>>;
  /**
   * Used to create an environment specific singleton instance
   * of the template.
   *
   * @param {Environment} env glimmer Environment
   * @param {Object} meta environment specific injections into meta
   */
  create<U>(meta: U): Template<TemplateMeta<M & U>>;
}

let clientId = 0;

/**
 * Wraps a template js in a template module to change it into a factory
 * that handles lazy parsing the template and to create per env singletons
 * of the template.
 */
export default function templateFactory<M>(
  serializedTemplate: SerializedTemplateWithLazyBlock<M>
): TemplateFactory<M>;
export default function templateFactory<M, U>(
  serializedTemplate: SerializedTemplateWithLazyBlock<M>
): TemplateFactory<M & U>;
export default function templateFactory<M>({
  id: templateId,
  meta,
  block,
}: SerializedTemplateWithLazyBlock<M>): TemplateFactory<M> {
  let parsedBlock: SerializedTemplateBlock;
  let id = templateId || `client-${clientId++}`;
  let create = (envMeta?: {}) => {
    let newMeta = envMeta ? assign({}, envMeta, meta) : meta;
    if (!parsedBlock) {
      parsedBlock = JSON.parse(block);
    }
    return new TemplateImpl({ id, block: parsedBlock, referrer: newMeta });
  };
  return { id, meta, create };
}

class TemplateImpl<R> implements Template {
  private layout: Option<CompilableProgram> = null;
  private partial: Option<CompilableProgram> = null;
  private wrappedLayout: Option<CompilableProgram> = null;
  public symbols: string[];
  public hasEval: boolean;
  public id: string;
  public referrer: TemplateMeta & R;

  constructor(private parsedLayout: Pick<LayoutWithContext<R>, 'id' | 'block' | 'referrer'>) {
    let { block } = parsedLayout;
    this.symbols = block.symbols;
    this.hasEval = block.hasEval;
    this.referrer = parsedLayout.referrer;
    this.id = parsedLayout.id || `client-${clientId++}`;
  }

  asLayout(): CompilableProgram {
    if (this.layout) return this.layout;
    return (this.layout = compilable({
      ...this.parsedLayout,
      asPartial: false,
    }));
  }

  asPartial(): CompilableProgram {
    if (this.partial) return this.partial;
    return (this.layout = compilable({
      ...this.parsedLayout,
      asPartial: true,
    }));
  }

  asWrappedLayout(): CompilableProgram {
    if (this.wrappedLayout) return this.wrappedLayout;
    return (this.wrappedLayout = new WrappedBuilder({
      ...this.parsedLayout,
      asPartial: false,
    }));
  }
}

export function Layout(serialized: string, envMeta?: {}): CompilableProgram {
  let parsed = JSON.parse(serialized);
  let factory = templateFactory(parsed);

  let template = factory.create(envMeta);
  return template.asLayout();
}
