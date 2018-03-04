import {
  Reference,
} from '@glimmer/reference';
import {
  ElementBuilder,
  Environment as GlimmerEnvironment,
  PrimitiveReference,
  SimpleDynamicAttribute,
} from '@glimmer/runtime';
import {
  Destroyable, Opaque,
} from '@glimmer/util';
import { warn } from 'ember-debug';
import { DEBUG } from 'ember-env-flags';
import { OWNER, Owner } from 'ember-utils';
import {
  constructStyleDeprecationMessage,
  lookupComponent,
} from 'ember-views';
import DebugStack from './utils/debug-stack';
import createIterable from './utils/iterable';
import {
  ConditionalReference,
  RootPropertyReference,
  UpdatableReference,
} from './utils/references';
import { isHTMLSafe } from './utils/string';

import installPlatformSpecificProtocolForURL from './protocol-for-url';

import { OwnedTemplate } from './template';

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

  public debugStack: typeof DebugStack;
  public inTransaction: boolean;

  constructor(injections: any) {
    super(injections);
    this.owner = injections[OWNER];
    this.isInteractive = this.owner.lookup<any>('-environment:main').isInteractive;

    // can be removed once https://github.com/tildeio/glimmer/pull/305 lands
    this.destroyedComponents = [];

    installPlatformSpecificProtocolForURL(this);

    if (DEBUG) {
      this.debugStack = new DebugStack();
    }
  }

  // this gets clobbered by installPlatformSpecificProtocolForURL
  // it really should just delegate to a platform specific injection
  protocolForURL(s: string): string {
    return s;
  }

  lookupComponent(name: string, meta: any) {
    return lookupComponent(meta.owner, name, meta);
  }

  toConditionalReference(reference: UpdatableReference): ConditionalReference | RootPropertyReference | PrimitiveReference<any> {
    return ConditionalReference.create(reference);
  }

  iterableFor(ref: Reference<Opaque>, key: string) {
    return createIterable(ref, key);
  }

  scheduleInstallModifier(modifier: any, manager: any): void {
    if (this.isInteractive) {
      super.scheduleInstallModifier(modifier, manager);
    }
  }

  scheduleUpdateModifier(modifier: any, manager: any) {
    if (this.isInteractive) {
      super.scheduleUpdateModifier(modifier, manager);
    }
  }

  didDestroy(destroyable: Destroyable) {
    destroyable.destroy();
  }

  begin() {
    this.inTransaction = true;

    super.begin();
  }

  commit() {
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
  }
}

if (DEBUG) {
  class StyleAttributeManager extends SimpleDynamicAttribute {
    set(dom: ElementBuilder, value: Opaque, env: GlimmerEnvironment): void {
      warn(constructStyleDeprecationMessage(value), (() => {
        if (value === null || value === undefined || isHTMLSafe(value)) {
          return true;
        }
        return false;
      })(), { id: 'ember-htmlbars.style-xss-warning' });
      super.set(dom, value, env);
    }
    update(value: Opaque, env: GlimmerEnvironment): void {
      warn(constructStyleDeprecationMessage(value), (() => {
        if (value === null || value === undefined || isHTMLSafe(value)) {
          return true;
        }
        return false;
      })(), { id: 'ember-htmlbars.style-xss-warning' });
      super.update(value, env);
    }
  }

  Environment.prototype.attributeFor = function (element, attribute: string, isTrusting: boolean, _namespace?) {
    if (attribute === 'style' && !isTrusting) {
      return StyleAttributeManager;
    }

    return GlimmerEnvironment.prototype.attributeFor.call(this, element, attribute, isTrusting, _namespace);
  };
}
