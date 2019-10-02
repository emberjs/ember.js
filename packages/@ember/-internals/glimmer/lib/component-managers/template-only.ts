import { ENV } from '@ember/-internals/environment';
import { OwnedTemplateMeta } from '@ember/-internals/views';
import { ComponentCapabilities, Option, VMArguments as Arguments } from '@glimmer/interfaces';
import { CONSTANT_TAG, createTag } from '@glimmer/reference';
import {
  Bounds,
  ComponentDefinition,
  Invocation,
  NULL_REFERENCE,
  WithStaticLayout,
} from '@glimmer/runtime';
import Environment from '../environment';
import RuntimeResolver from '../resolver';
import { OwnedTemplate } from '../template';
import AbstractManager from './abstract';

const CAPABILITIES: ComponentCapabilities = {
  dynamicLayout: false,
  dynamicTag: false,
  prepareArgs: false,
  createArgs: ENV._DEBUG_RENDER_TREE,
  attributeHook: false,
  elementHook: false,
  createCaller: false,
  dynamicScope: false,
  updateHook: ENV._DEBUG_RENDER_TREE,
  createInstance: true,
};

export interface DebugStateBucket {
  environment: Environment;
}

export default class TemplateOnlyComponentManager
  extends AbstractManager<Option<DebugStateBucket>, TemplateOnlyComponentDefinitionState>
  implements
    WithStaticLayout<
      Option<DebugStateBucket>,
      TemplateOnlyComponentDefinitionState,
      OwnedTemplateMeta,
      RuntimeResolver
    > {
  getLayout({ template }: TemplateOnlyComponentDefinitionState): Invocation {
    const layout = template.asLayout();
    return {
      handle: layout.compile(),
      symbolTable: layout.symbolTable,
    };
  }

  getCapabilities(): ComponentCapabilities {
    return CAPABILITIES;
  }

  create(
    environment: Environment,
    { name }: TemplateOnlyComponentDefinitionState,
    args: Arguments
  ): Option<DebugStateBucket> {
    if (ENV._DEBUG_RENDER_TREE) {
      let bucket = { environment };
      environment.debugRenderTree.create(bucket, {
        type: 'component',
        name: name,
        args: args.capture(),
        instance: null,
      });
      return bucket;
    } else {
      return null;
    }
  }

  getSelf() {
    return NULL_REFERENCE;
  }

  getTag() {
    if (ENV._DEBUG_RENDER_TREE) {
      // returning a const tag skips the update hook (VM BUG?)
      return createTag();
    } else {
      // an outlet has no hooks
      return CONSTANT_TAG;
    }
  }

  getDestructor(bucket: Option<DebugStateBucket>) {
    if (ENV._DEBUG_RENDER_TREE) {
      return {
        destroy() {
          bucket!.environment.debugRenderTree.willDestroy(bucket!);
        },
      };
    } else {
      return null;
    }
  }

  didRenderLayout(bucket: Option<DebugStateBucket>, bounds: Bounds): void {
    if (ENV._DEBUG_RENDER_TREE) {
      bucket!.environment.debugRenderTree.didRender(bucket!, bounds);
    }
  }

  update(bucket: Option<DebugStateBucket>): void {
    if (ENV._DEBUG_RENDER_TREE) {
      bucket!.environment.debugRenderTree.update(bucket!);
    }
  }

  didUpdateLayout(bucket: Option<DebugStateBucket>, bounds: Bounds): void {
    if (ENV._DEBUG_RENDER_TREE) {
      bucket!.environment.debugRenderTree.didRender(bucket!, bounds);
    }
  }
}

const MANAGER = new TemplateOnlyComponentManager();

export interface TemplateOnlyComponentDefinitionState {
  name: string;
  template: OwnedTemplate;
}

export class TemplateOnlyComponentDefinition
  implements
    TemplateOnlyComponentDefinitionState,
    ComponentDefinition<TemplateOnlyComponentDefinitionState, TemplateOnlyComponentManager> {
  manager = MANAGER;
  constructor(public name: string, public template: OwnedTemplate) {}

  get state(): TemplateOnlyComponentDefinitionState {
    return this;
  }
}
