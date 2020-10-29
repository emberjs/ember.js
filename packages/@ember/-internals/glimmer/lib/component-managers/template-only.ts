import { ENV } from '@ember/-internals/environment';
import {
  Bounds,
  ComponentCapabilities,
  ComponentDefinition,
  Option,
  Template,
  VMArguments,
  WithStaticLayout,
} from '@glimmer/interfaces';
import { NULL_REFERENCE } from '@glimmer/reference';
import { registerDestructor } from '@glimmer/runtime';
import { unwrapTemplate } from '@glimmer/util';
import { EmberVMEnvironment } from '../environment';
import RuntimeResolver from '../resolver';
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
  willDestroy: false,
};

export interface DebugStateBucket {
  environment: EmberVMEnvironment;
}

export default class TemplateOnlyComponentManager
  extends AbstractManager<Option<DebugStateBucket>, TemplateOnlyComponentDefinitionState>
  implements
    WithStaticLayout<
      Option<DebugStateBucket>,
      TemplateOnlyComponentDefinitionState,
      RuntimeResolver
    > {
  getStaticLayout({ template }: TemplateOnlyComponentDefinitionState) {
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

      registerDestructor(bucket, () => {
        bucket.environment.extra.debugRenderTree.willDestroy(bucket!);
      });

      return bucket;
    } else {
      return null;
    }
  }

  getDebugName({ name }: TemplateOnlyComponentDefinitionState) {
    return name;
  }

  getSelf() {
    return NULL_REFERENCE;
  }

  getDestroyable(bucket: Option<DebugStateBucket>) {
    if (ENV._DEBUG_RENDER_TREE) {
      return bucket;
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
  template: Template;
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
  constructor(public name: string, public template: Template) {}

  get state(): TemplateOnlyComponentDefinitionState {
    return this;
  }
}
