import { Factory, Owner } from '@ember/-internals/owner';
import { OwnedTemplateMeta } from '@ember/-internals/views';
import { ComponentDefinition, Invocation, WithStaticLayout } from '@glimmer/runtime';
import RuntimeResolver from '../resolver';
import { OwnedTemplate } from '../template';
import AbstractComponentManager from './abstract';

export interface InternalDefinitionState {
  ComponentClass: Factory<any, any>;
  layout: OwnedTemplate;
}

export class InternalComponentDefinition<T>
  implements ComponentDefinition<InternalDefinitionState, InternalManager<T>> {
  public state: InternalDefinitionState;

  constructor(
    public manager: InternalManager<T>,
    ComponentClass: Factory<any, any>,
    layout: OwnedTemplate
  ) {
    this.state = { ComponentClass, layout };
  }
}

export default abstract class InternalManager<T>
  extends AbstractComponentManager<T, InternalDefinitionState>
  implements WithStaticLayout<T, InternalDefinitionState, OwnedTemplateMeta, RuntimeResolver> {
  constructor(protected owner: Owner) {
    super();
  }

  getLayout({ layout: _layout }: InternalDefinitionState): Invocation {
    let layout = _layout.asLayout();

    return {
      handle: layout.compile(),
      symbolTable: layout.symbolTable,
    };
  }
}
