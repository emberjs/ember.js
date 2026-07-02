// We use the `InternalOwner` notion here because we actually need all of its
// API for using with renderers (normally, it will be `EngineInstance`).
// We use `getOwner` from our internal home for it rather than the narrower
// public API for the same reason.
import { type InternalOwner, getOwner } from '@ember/-internals/owner';
import type { BootOptions } from '@ember/engine/instance';
import { assert } from '@ember/debug';
import { schedule } from '@ember/runloop';
import { DEBUG } from '@glimmer/env';
import type { Template, TemplateFactory } from '@glimmer/interfaces';
import { hasInternalComponentManager } from '@glimmer/manager/lib/internal/api';
import type { Reference } from '@glimmer/reference/lib/reference';
import { createComputeRef, createConstRef, updateRef } from '@glimmer/reference/lib/reference';
import { consumeTag } from '@glimmer/validator/lib/tracking';
import { createTag, DIRTY_TAG as dirtyTag } from '@glimmer/validator/lib/validators';
import type { SimpleElement } from '@simple-dom/interface';
import type { OutletDefinitionState } from '../component-managers/outlet';
import type { Renderer } from '../renderer';
import type { OutletState } from '../utils/outlet';
import { makeRouteTemplate } from '../component-managers/route-template';

export interface BootEnvironment {
  hasDOM: boolean;
  isInteractive: boolean;
  _renderMode?: string;
  options: BootOptions;
}

const TOP_LEVEL_NAME = '-top-level';

function isTemplate(value: unknown): value is Template {
  if (value === null || typeof value !== 'object') {
    return false;
  }

  let template = value as Partial<Template>;
  return template.result === 'ok' || template.result === 'error';
}

export default class OutletView {
  static extend(injections: any): typeof OutletView {
    return class extends OutletView {
      static create(options: any) {
        if (options) {
          return super.create(Object.assign({}, injections, options));
        } else {
          return super.create(injections);
        }
      }
    };
  }

  static reopenClass(injections: any): void {
    Object.assign(this, injections);
  }

  static create(options: {
    environment: BootEnvironment;
    application: InternalOwner;
    template: TemplateFactory;
  }): OutletView {
    let { environment: _environment, application: namespace, template: templateFactory } = options;
    let owner = getOwner(options);
    assert('OutletView is unexpectedly missing an owner', owner);
    let template = templateFactory(owner);
    return new OutletView(_environment, owner, template, namespace);
  }

  private ref: Reference;
  public state: OutletDefinitionState;

  constructor(
    private _environment: BootEnvironment,
    public owner: InternalOwner,
    public template: Template,
    public namespace: any
  ) {
    let outletStateTag = createTag();
    let outletState: OutletState = {
      outlets: { main: undefined },
      render: {
        owner: owner,
        name: TOP_LEVEL_NAME,
        controller: undefined,
        model: undefined,
        wrapper: undefined,
        invokable: undefined,
      },
    };

    let ref = (this.ref = createComputeRef(
      () => {
        consumeTag(outletStateTag);
        return outletState;
      },
      (state: OutletState) => {
        dirtyTag(outletStateTag);
        outletState.outlets['main'] = state;
      }
    ));

    this.state = {
      ref,
      name: TOP_LEVEL_NAME,
      // The root template renders with no `self`; all template→invokable
      // upgrading (root and legacy alike) lives in this module. The template
      // is only absent when unit tests construct a bare OutletView — those
      // never render, so the missing invokable is caught by the renderer's
      // assertion if one ever tries.
      invokable:
        template !== undefined ? makeRouteTemplate(owner, TOP_LEVEL_NAME, template) : undefined,
    };
  }

  appendTo(selector: string | SimpleElement): void {
    let target;

    if (this._environment.hasDOM) {
      target = typeof selector === 'string' ? document.querySelector(selector) : selector;
    } else {
      target = selector;
    }

    let renderer = this.owner.lookup('renderer:-dom') as Renderer;

    // SAFETY: It's not clear that this cast is safe.
    // The types for appendOutletView may be incorrect or this is a potential bug.
    schedule('render', renderer, 'appendOutletView', this, target as SimpleElement);
  }

  rerender(): void {
    /**/
  }

  // Legacy `setOutletState` callers (the rendering test-helpers and
  // liquid-fire-style addons) provide a raw `template` with no `invokable`.
  // The outlet helper only knows how to render an invokable, so we upgrade any
  // raw template into a route template here, mutating the renders in place.
  // Walk the whole outlet chain so nested legacy states are normalized too.
  // We skip renders that already have an invokable (the manager-driven router
  // path), which keeps the invokable identity stable when the same render
  // object is set again.
  private upgradeLegacyTemplates(state: OutletState): void {
    let current: OutletState | undefined = state;

    while (current !== undefined) {
      let render = current.render;

      if (render !== undefined && render.invokable === undefined && render.template) {
        render.invokable = this.invokableForTemplate(
          render.name,
          render.template,
          render.controller
        );
      }

      current = current.outlets.main;
    }
  }

  // Turn a legacy raw `template` into something the outlet can render. A
  // caller may also hand us a pre-built component definition instead of a
  // template (an intimate API older addons may rely on), in which case we
  // use it directly rather than trying to wrap it.
  private invokableForTemplate(name: string, template: object, controller: unknown): object {
    if (hasInternalComponentManager(template)) {
      return template;
    }

    if (DEBUG && !isTemplate(template)) {
      let label: string;
      try {
        label = `\`${String(template)}\``;
      } catch {
        label = 'an unknown object';
      }

      assert(
        `Failed to render the \`${name}\` route: expected a component or Template object, but got ${label}.`
      );
    }

    // The route template renders with the controller as its `self` (`this`).
    // This path is for legacy `setOutletState` callers that provide a raw `template`
    // We know they use controllers, so we can safely reach for the controller here.
    let self = createConstRef(controller, 'this');
    return makeRouteTemplate(this.owner, name, template as Template, self);
  }

  setOutletState(state: OutletState): void {
    this.upgradeLegacyTemplates(state);
    updateRef(this.ref, state);
  }

  destroy(): void {
    /**/
  }
}
