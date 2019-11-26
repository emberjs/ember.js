import { ENV } from '@ember/-internals/environment';
import {
  Bounds,
  ComponentCapabilities,
  ComponentDefinition,
  Option,
  VMArguments,
  WithJitStaticLayout,
} from '@glimmer/interfaces';
import { unwrapTemplate } from '@glimmer/opcode-compiler';
import { NULL_REFERENCE } from '@glimmer/runtime';
import { CONSTANT_TAG, createTag } from '@glimmer/validator';
import { EmberVMEnvironment } from '../environment';
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
  wrapped: false,
};

export interface DebugStateBucket {
  environment: EmberVMEnvironment;
}

export default class TemplateOnlyComponentManager
  extends AbstractManager<Option<DebugStateBucket>, TemplateOnlyComponentDefinitionState>
  implements
    WithJitStaticLayout<
      Option<DebugStateBucket>,
      TemplateOnlyComponentDefinitionState,
      RuntimeResolver
    > {
  getJitStaticLayout({ template }: TemplateOnlyComponentDefinitionState) {
    return unwrapTemplate(template).asLayout();
  }

  getCapabilities(): ComponentCapabilities {
    return CAPABILITIES;
  }

  create(
    environment: EmberVMEnvironment,
    { name, template }: TemplateOnlyComponentDefinitionState,
    args: VMArguments
  ): Option<DebugStateBucket> {
    if (ENV._DEBUG_RENDER_TREE) {
      let bucket = { environment };
      environment.extra.debugRenderTree.create(bucket, {
        type: 'component',
        name: name,
        args: args.capture(),
        instance: null,
        template,
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
          bucket!.environment.extra.debugRenderTree.willDestroy(bucket!);
        },
      };
    } else {
      return null;
    }
  }

  didRenderLayout(bucket: Option<DebugStateBucket>, bounds: Bounds): void {
    if (ENV._DEBUG_RENDER_TREE) {
      bucket!.environment.extra.debugRenderTree.didRender(bucket!, bounds);
    }
  }

  update(bucket: Option<DebugStateBucket>): void {
    if (ENV._DEBUG_RENDER_TREE) {
      bucket!.environment.extra.debugRenderTree.update(bucket!);
    }
  }

  didUpdateLayout(bucket: Option<DebugStateBucket>, bounds: Bounds): void {
    if (ENV._DEBUG_RENDER_TREE) {
      bucket!.environment.extra.debugRenderTree.didRender(bucket!, bounds);
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
    ComponentDefinition<
      TemplateOnlyComponentDefinitionState,
      Option<DebugStateBucket>,
      TemplateOnlyComponentManager
    > {
  manager = MANAGER;
  constructor(public name: string, public template: OwnedTemplate) {}

  get state(): TemplateOnlyComponentDefinitionState {
    return this;
  }
}
