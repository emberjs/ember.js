import { ENV } from '@ember/-internals/environment';
import { _getProp, get, set } from '@ember/-internals/metal';
import { Owner } from '@ember/-internals/owner';
import { getDebugName } from '@ember/-internals/utils';
import { constructStyleDeprecationMessage } from '@ember/-internals/views';
import { assert, deprecate, warn } from '@ember/debug';
import { backburner, schedule } from '@ember/runloop';
import { DEBUG } from '@glimmer/env';
import { ElementBuilder, Environment, Option } from '@glimmer/interfaces';
import {
  DynamicAttribute,
  dynamicAttribute,
  EnvironmentDelegate,
  setScheduleDestroy,
  setScheduleDestroyed,
  SimpleDynamicAttribute,
} from '@glimmer/runtime';
import { setPropertyDidChange, setTrackingTransactionEnv } from '@glimmer/validator';
import { AttrNamespace as SimpleAttrNamespace, SimpleElement } from '@simple-dom/interface';
import installPlatformSpecificProtocolForURL from './protocol-for-url';
import { OwnedTemplate } from './template';
import DebugRenderTree from './utils/debug-render-tree';
import toIterator from './utils/iterator';
import { isHTMLSafe } from './utils/string';
import toBool from './utils/to-bool';

///////////

// Setup global environment

// Autotracking

setPropertyDidChange(() => backburner.ensureInstance());

if (DEBUG) {
  setTrackingTransactionEnv!({
    assert(message) {
      assert(message, false);
    },

    deprecate(message) {
      deprecate(message, false, {
        id: 'autotracking.mutation-after-consumption',
        until: '4.0.0',
      });
    },

    debugMessage(obj, keyName) {
      let dirtyString = keyName
        ? `\`${keyName}\` on \`${getDebugName!(obj)}\``
        : `\`${getDebugName!(obj)}\``;

      return `You attempted to update ${dirtyString}, but it had already been used previously in the same computation.  Attempting to update a value after using it in a computation can cause logical errors, infinite revalidation bugs, and performance issues, and is not supported.`;
    },
  });
}

// Destruction

setScheduleDestroy((destroyable, destructor) => {
  schedule('actions', null, destructor, destroyable);
});

setScheduleDestroyed(finalizeDestructor => {
  schedule('destroy', null, finalizeDestructor);
});

///////////

// Define environment delegate

export interface CompilerFactory {
  id: string;
  new (template: OwnedTemplate): any;
}

export class EmberEnvironmentExtra {
  private _debugRenderTree?: DebugRenderTree;

  constructor(public owner: Owner) {
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
    if (ENV._DEBUG_RENDER_TREE) {
      this.debugRenderTree.commit();
    }
  }
}

export class EmberEnvironmentDelegate implements EnvironmentDelegate<EmberEnvironmentExtra> {
  public isInteractive: boolean;

  public toBool = toBool;
  public toIterator = toIterator;

  public getProp = _getProp;
  public getPath = get;
  public setPath = set;

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

  onTransactionBegin() {
    this.extra.begin();
  }

  onTransactionCommit() {
    this.extra.commit();
  }
}

export type EmberVMEnvironment = Environment<EmberEnvironmentExtra>;

if (DEBUG) {
  class StyleAttributeManager extends SimpleDynamicAttribute {
    set(dom: ElementBuilder, value: unknown, env: Environment): void {
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
    update(value: unknown, env: Environment): void {
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
