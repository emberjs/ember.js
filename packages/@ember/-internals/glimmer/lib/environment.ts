import { ENV } from '@ember/-internals/environment';
import { get } from '@ember/-internals/metal';
import { Owner } from '@ember/-internals/owner';
import { isProxy } from '@ember/-internals/utils';
import { constructStyleDeprecationMessage } from '@ember/-internals/views';
import { warn } from '@ember/debug';
import { DEBUG } from '@glimmer/env';
import { ElementBuilder, Environment, Option } from '@glimmer/interfaces';
import { OpaqueIterable, VersionedReference } from '@glimmer/reference';
import {
  DynamicAttribute,
  dynamicAttribute,
  RuntimeEnvironment,
  RuntimeEnvironmentDelegate,
  SimpleDynamicAttribute,
} from '@glimmer/runtime';
import { AttrNamespace as SimpleAttrNamespace, SimpleElement } from '@simple-dom/interface';
import installPlatformSpecificProtocolForURL from './protocol-for-url';
import { OwnedTemplate } from './template';
import { Component } from './utils/curly-component-state-bucket';
import DebugRenderTree from './utils/debug-render-tree';
import createIterable from './utils/iterable';
// import { ConditionalReference, UpdatableReference } from './utils/references';
import { isHTMLSafe } from './utils/string';
import emberToBool from './utils/to-bool';

export interface CompilerFactory {
  id: string;
  new (template: OwnedTemplate): any;
}

export class EmberEnvironmentExtra {
  private _debugRenderTree?: DebugRenderTree;

  public destroyedComponents: Component[];

  constructor(public owner: Owner) {
    // can be removed once https://github.com/tildeio/glimmer/pull/305 lands
    this.destroyedComponents = [];

    if (ENV._DEBUG_RENDER_TREE) {
      this._debugRenderTree = new DebugRenderTree();
    }
  }

  get debugRenderTree(): DebugRenderTree {
    if (ENV._DEBUG_RENDER_TREE) {
      return this._debugRenderTree!;
    } else {
      throw new Error(
        "Can't access debug render tree outside of the inspector (_DEBUG_RENDER_TREE flag is disabled)"
      );
    }
  }

  begin(): void {
    if (ENV._DEBUG_RENDER_TREE) {
      this.debugRenderTree.begin();
    }
  }

  commit(): void {
    let destroyedComponents = this.destroyedComponents;

    this.destroyedComponents = [];
    // components queued for destruction must be destroyed before firing
    // `didCreate` to prevent errors when removing and adding a component
    // with the same name (would throw an error when added to view registry)
    for (let i = 0; i < destroyedComponents.length; i++) {
      destroyedComponents[i].destroy();
    }

    if (ENV._DEBUG_RENDER_TREE) {
      this.debugRenderTree.commit();
    }
  }
}

export class EmberEnvironmentDelegate implements RuntimeEnvironmentDelegate<EmberEnvironmentExtra> {
  public isInteractive: boolean;
  public attributeFor?: (
    element: SimpleElement,
    attr: string,
    isTrusting: boolean,
    namespace: Option<SimpleAttrNamespace>
  ) => DynamicAttribute;

  public extra: EmberEnvironmentExtra;

  constructor(owner: Owner, isInteractive: boolean) {
    this.extra = new EmberEnvironmentExtra(owner);
    this.isInteractive = isInteractive;

    installPlatformSpecificProtocolForURL(this);
  }

  // this gets clobbered by installPlatformSpecificProtocolForURL
  // it really should just delegate to a platform specific injection
  protocolForURL(s: string): string {
    return s;
  }

  toBool(value: unknown) {
    if (isProxy(value)) {
      return Boolean(get(value, 'isTruthy'));
    } else {
      return emberToBool(value);
    }
  }

  // iterableFor(ref: VersionedReference, key: string): OpaqueIterable {
  //   return createIterable(ref, key);
  // }

  // scheduleInstallModifier(modifier: any, manager: any): void {
  //   if (this.isInteractive) {
  //     super.scheduleInstallModifier(modifier, manager);
  //   }
  // }

  // scheduleUpdateModifier(modifier: any, manager: any): void {
  //   if (this.isInteractive) {
  //     super.scheduleUpdateModifier(modifier, manager);
  //   }
  // }

  // didDestroy(destroyable: Destroyable): void {
  //   destroyable.destroy();
  // }
}

export type EmberVMEnvironment = Environment<EmberEnvironmentExtra>;

if (DEBUG) {
  class StyleAttributeManager extends SimpleDynamicAttribute {
    set(dom: ElementBuilder, value: unknown, env: RuntimeEnvironment): void {
      warn(
        constructStyleDeprecationMessage(value),
        (() => {
          if (value === null || value === undefined || isHTMLSafe(value)) {
            return true;
          }
          return false;
        })(),
        { id: 'ember-htmlbars.style-xss-warning' }
      );
      super.set(dom, value, env);
    }
    update(value: unknown, env: RuntimeEnvironment): void {
      warn(
        constructStyleDeprecationMessage(value),
        (() => {
          if (value === null || value === undefined || isHTMLSafe(value)) {
            return true;
          }
          return false;
        })(),
        { id: 'ember-htmlbars.style-xss-warning' }
      );
      super.update(value, env);
    }
  }

  EmberEnvironmentDelegate.prototype.attributeFor = function(
    element,
    attribute: string,
    isTrusting: boolean,
    namespace: Option<SimpleAttrNamespace>
  ) {
    if (attribute === 'style' && !isTrusting) {
      return new StyleAttributeManager({ element, name: attribute, namespace });
    }

    return dynamicAttribute(element, attribute, namespace);
  };
}
