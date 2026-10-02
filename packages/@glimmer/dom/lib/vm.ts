import type { Block, RenderFn, Template } from './core';
import type { RenderResult } from './render';
import { destroy, registerDestructor } from '@glimmer/destroyable';
import { componentCapabilities } from '@glimmer/manager/lib/public/component';
import { setComponentManager } from '@glimmer/manager/lib/public/api';
import { setComponentTemplate } from '@glimmer/manager/lib/public/template';
import { getOwner, setOwner } from '@glimmer/owner';
import { trackedArray } from '@glimmer/validator/lib/collections/array';
import { untrack } from '@glimmer/validator/lib/tracking';
import { renderComponent as renderWithVM } from '@ember/-internals/glimmer/lib/base-renderer';
import { outletHelper } from '@ember/-internals/glimmer/lib/syntax/outlet';
import { precompileTemplate } from '@ember/template-compilation';

import {
  setTemplate as setCompiledTemplate,
  template as compiledTemplate,
  templateFor,
} from './core';
import { setVMFallback } from './invoke';
import { renderTemplate } from './render';

// Components that were not compiled with the codegen compiler are rendered
// with the VM, into an element we own.
setVMFallback((definition, into, owner, args) => renderWithVM(definition, { into, owner, args }));

/**
 * The VM's view of a template-only compiled component.
 */
class TemplateOnlyState {
  constructor(
    readonly template: Template,
    readonly args: Record<string, unknown>
  ) {}
}

interface Island {
  element: Element;
  outlets: Element[];
}

const ISLANDS = new WeakMap<object, Island>();

/**
 * Renders the compiled template for `context` (a component instance, or the
 * state of a template-only component) into an element the VM can insert.
 *
 * This happens once per component instance; from then on, the compiled
 * template updates itself.
 */
function island(context: object): Island {
  let existing = ISLANDS.get(context);
  if (existing) return existing;

  return untrack(() => {
    let template: Template | undefined;
    let self: unknown;
    let args: Record<string, unknown>;

    if (context instanceof TemplateOnlyState) {
      template = context.template;
      self = undefined;
      args = context.args;
    } else {
      template = templateFor(context.constructor);
      self = context;
      args = (context as { args?: Record<string, unknown> }).args ?? {};
    }

    if (!template) {
      throw new Error('BUG: rendering a compiled component without a compiled template');
    }

    let element = document.createElement('glimmer-island');
    element.style.display = 'contents';

    let outlets = trackedArray<Element>([]);

    let result: RenderResult = renderTemplate(template, {
      into: element,
      owner: getOwner(context) ?? {},
      self,
      args,
      outlets: {
        add(outlet) {
          outlets.push(outlet);
          return () => {
            let index = outlets.indexOf(outlet);
            if (index !== -1) outlets.splice(index, 1);
          };
        },
      },
    });

    registerDestructor(context, () => {
      result.destroy();
    });

    let created = { element, outlets };
    ISLANDS.set(context, created);
    return created;
  });
}

/**
 * The VM template of every compiled component: it inserts the island, and
 * renders the router's outlet into each `{{outlet}}` of the compiled
 * template (with `in-element`, so the outlet keeps the VM's dynamic scope).
 */
const BRIDGE = precompileTemplate(
  `{{#let (island this) as |i|}}{{i.element}}{{#each i.outlets as |el|}}{{#in-element el insertBefore=null}}{{component (outletHelper)}}{{/in-element}}{{/each}}{{/let}}`,
  {
    moduleName: 'packages/@glimmer/dom/lib/vm.hbs',
    strictMode: true,
    scope() {
      return { island, outletHelper };
    },
  }
);

const CAPABILITIES = componentCapabilities('3.13', { destructor: true });

class TemplateOnlyManager {
  capabilities = CAPABILITIES;

  constructor(readonly owner: object) {}

  createComponent(definition: Template, args: { named: Record<string, unknown> }) {
    let state = new TemplateOnlyState(definition, args.named);
    setOwner(state, this.owner);
    return state;
  }

  getContext(state: TemplateOnlyState) {
    return state;
  }

  destroyComponent(state: TemplateOnlyState) {
    destroy(state);
  }
}

/**
 * Makes a compiled template-only component renderable by the VM too.
 */
export function vmCompatible(t: Template): Template {
  setComponentManager((owner: object) => new TemplateOnlyManager(owner), t);
  setComponentTemplate(BRIDGE, t);
  return t;
}

/**
 * `template()`, for code compiled with `vmInterop`.
 */
export function template(render: RenderFn): Template {
  return vmCompatible(compiledTemplate(render));
}

/**
 * `setTemplate()`, for code compiled with `vmInterop`: the VM renders the
 * class with its own component manager, and the compiled template through
 * the bridge.
 */
export function setTemplate<T extends object>(definition: T, t: Template): T {
  setCompiledTemplate(definition, t);
  setComponentTemplate(BRIDGE, definition);
  return definition;
}

/**
 * `{{outlet}}`: an element that the router renders the child route into.
 */
export function outlet(b: Block, anchor: Node): void {
  let sink = b.root.outlets;

  if (!sink) {
    throw new Error(
      '{{outlet}} can only be used in a compiled template that the router renders (compile with `vmInterop`)'
    );
  }

  let element = b.root.document.createElement('glimmer-outlet');
  element.style.display = 'contents';
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- anchors are always attached
  anchor.parentNode!.insertBefore(element, anchor);

  let remove = sink.add(element);
  registerDestructor(b, remove);
}
