import { Factory, Owner } from '@ember/-internals/owner';
import { ComponentDefinition, Invocation, WithJitStaticLayout } from '@glimmer/interfaces';
import RuntimeResolver from '../resolver';
import { OwnedTemplate } from '../template';
import AbstractComponentManager from './abstract';

export interface InternalDefinitionState {
  ComponentClass: Factory<any, any>;
  layout: OwnedTemplate;
}

export class InternalComponentDefinition<T>
  implements ComponentDefinition<InternalDefinitionState, T, InternalManager<T>> {
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
  implements WithJitStaticLayout<T, InternalDefinitionState, RuntimeResolver> {
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
