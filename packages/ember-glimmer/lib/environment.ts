import {
  Simple,
} from '@glimmer/interfaces';
import {
  Reference,
} from '@glimmer/reference';
import {
  DynamicAttributeFactory,
  Environment as GlimmerEnvironment,
  PrimitiveReference,
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

import installPlatformSpecificProtocolForURL from './protocol-for-url';

import {
  EMBER_MODULE_UNIFICATION,
} from 'ember/features';
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

  _resolveLocalLookupName(name: string, source: string, owner: any) {
    return EMBER_MODULE_UNIFICATION ? `${source}:${name}`
      : owner._resolveLocalLookupName(name, source);
  }

  /*
  macros() {
    let macros = super.macros();
    populateMacros(macros.blocks, macros.inlines);
    return macros;
  }
  */

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

    super.commit();

    this.inTransaction = false;
  }
}

if (DEBUG) {
  class StyleAttributeManager implements DynamicAttributeFactory {
    setAttribute(_dom: Environment, _element: Simple.Element, value: Opaque) {
      warn(constructStyleDeprecationMessage(value), (() => {
        if (value === null || value === undefined || isSafeString(value)) {
          return true;
        }
        return false;
      })(), { id: 'ember-htmlbars.style-xss-warning' });
    }

    updateAttribute(_dom: Environment, _element: Element, value: Opaque) {
      warn(constructStyleDeprecationMessage(value), (() => {
        if (value === null || value === undefined || isSafeString(value)) {
          return true;
        }
        return false;
      })(), { id: 'ember-htmlbars.style-xss-warning' });
    }
  }

  let STYLE_ATTRIBUTE_MANANGER = new StyleAttributeManager();

  Environment.prototype.attributeFor = function(element, attribute, isTrusting) {
    // if (attribute === 'style' && !isTrusting) {
    //   return STYLE_ATTRIBUTE_MANANGER;
    // }

    return GlimmerEnvironment.prototype.attributeFor.call(this, element, attribute, isTrusting);
  };
}
