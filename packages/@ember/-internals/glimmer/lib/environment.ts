import { OWNER, Owner } from '@ember/-internals/owner';
import { constructStyleDeprecationMessage } from '@ember/-internals/views';
import { warn } from '@ember/debug';
import { DEBUG } from '@glimmer/env';
import { Option, Simple } from '@glimmer/interfaces';
import { OpaqueIterable, VersionedReference } from '@glimmer/reference';
import {
  ElementBuilder,
  Environment as GlimmerEnvironment,
  SimpleDynamicAttribute,
} from '@glimmer/runtime';
import { Destroyable } from '@glimmer/util';
import getDebugStack, { DebugStack } from './utils/debug-stack';
import createIterable from './utils/iterable';
import { ConditionalReference, UpdatableReference } from './utils/references';
import { isHTMLSafe } from './utils/string';

import installPlatformSpecificProtocolForURL from './protocol-for-url';

import { ENV } from '@ember/-internals/environment';
import { OwnedTemplate } from './template';
import DebugRenderTree from './utils/debug-render-tree';

export interface CompilerFactory {
  id: string;
  new (template: OwnedTemplate): any;
}

export default class Environment extends GlimmerEnvironment {
  static create(options: any) {
    return new this(options);
  }

  public owner: Owner;
  public isInteractive: boolean;
  public destroyedComponents: Destroyable[];

  private _debugStack: DebugStack | undefined;
  private _debugRenderTree: DebugRenderTree | undefined;
  public inTransaction = false;

  constructor(injections: any) {
    super(injections);

    let owner: Owner = injections[OWNER];

    this.owner = owner;
    this.isInteractive = owner.lookup<any>('-environment:main').isInteractive;

    // can be removed once https://github.com/tildeio/glimmer/pull/305 lands
    this.destroyedComponents = [];

    installPlatformSpecificProtocolForURL(this);

    if (DEBUG) {
      this._debugStack = getDebugStack();
    }

    if (ENV._DEBUG_RENDER_TREE) {
      this._debugRenderTree = new DebugRenderTree();
    }
  }

  get debugStack(): DebugStack {
    if (DEBUG) {
      return this._debugStack!;
    } else {
      throw new Error("Can't access debug stack outside of debug mode");
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

  // this gets clobbered by installPlatformSpecificProtocolForURL
  // it really should just delegate to a platform specific injection
  protocolForURL(s: string): string {
    return s;
  }

  toConditionalReference(reference: UpdatableReference): VersionedReference<boolean> {
    return ConditionalReference.create(reference);
  }

  iterableFor(ref: VersionedReference, key: string): OpaqueIterable {
    return createIterable(ref, key);
  }

  scheduleInstallModifier(modifier: any, manager: any): void {
    if (this.isInteractive) {
      super.scheduleInstallModifier(modifier, manager);
    }
  }

  scheduleUpdateModifier(modifier: any, manager: any): void {
    if (this.isInteractive) {
      super.scheduleUpdateModifier(modifier, manager);
    }
  }

  didDestroy(destroyable: Destroyable): void {
    destroyable.destroy();
  }

  begin(): void {
    if (ENV._DEBUG_RENDER_TREE) {
      this.debugRenderTree.begin();
    }

    this.inTransaction = true;

    super.begin();
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

    try {
      super.commit();
    } finally {
      this.inTransaction = false;
    }

    if (ENV._DEBUG_RENDER_TREE) {
      this.debugRenderTree.commit();
    }
  }
}

if (DEBUG) {
  class StyleAttributeManager extends SimpleDynamicAttribute {
    set(dom: ElementBuilder, value: unknown, env: GlimmerEnvironment): void {
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
    update(value: unknown, env: GlimmerEnvironment): void {
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

  Environment.prototype.attributeFor = function(
    element,
    attribute: string,
    isTrusting: boolean,
    namespace: Option<Simple.AttrNamespace>
  ) {
    if (attribute === 'style' && !isTrusting) {
      return new StyleAttributeManager({ element, name: attribute, namespace });
    }

    return GlimmerEnvironment.prototype.attributeFor.call(
      this,
      element,
      attribute,
      isTrusting,
      namespace
    );
  };
}
