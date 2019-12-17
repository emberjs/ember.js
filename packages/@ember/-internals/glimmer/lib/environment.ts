import { ENV } from '@ember/-internals/environment';
import { get, set } from '@ember/-internals/metal';
import { Owner } from '@ember/-internals/owner';
import { constructStyleDeprecationMessage } from '@ember/-internals/views';
import { warn } from '@ember/debug';
import { DEBUG } from '@glimmer/env';
import { ElementBuilder, Environment, Option } from '@glimmer/interfaces';
import { IterationItemReference, PropertyReference, VersionedPathReference } from '@glimmer/reference';
import {
  DynamicAttribute,
  dynamicAttribute,
  EnvironmentDelegate,
  SimpleDynamicAttribute,
} from '@glimmer/runtime';
import { AttrNamespace as SimpleAttrNamespace, SimpleElement } from '@simple-dom/interface';
import installPlatformSpecificProtocolForURL from './protocol-for-url';
import { OwnedTemplate } from './template';
import DebugRenderTree, { PathNodeType } from './utils/debug-render-tree';
import toIterator from './utils/iterator';
import { isHTMLSafe } from './utils/string';
import toBool from './utils/to-bool';

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

  getTemplatePathDebugContext(pathRef: VersionedPathReference) {
    let stack = this.extra.debugRenderTree.logRenderStackForPath(pathRef);

    return `While rendering:\n\n${stack}`;
  }

  setTemplatePathDebugContext(pathRef: VersionedPathReference, desc: string, parentRef: Option<VersionedPathReference>) {
    let type: PathNodeType = 'root';

    if (pathRef instanceof IterationItemReference) {
      type = 'iterator';
    } else if (pathRef instanceof PropertyReference) {
      type = 'property';
    }

    this.extra.debugRenderTree.createPath(pathRef, desc, type, parentRef);
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
