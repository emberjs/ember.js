import type { AttrsFn, Block, BlockFn, RenderFn, Template } from './core';
import type { RenderResult } from './render';
import { registerDestructor } from '@glimmer/destroyable';
import { componentCapabilities } from '@glimmer/manager/lib/public/component';
import {
  setComponentManager,
  setHelperManager,
  setModifierManager,
} from '@glimmer/manager/lib/public/api';
import { modifierCapabilities } from '@glimmer/manager/lib/public/modifier';
import { helperCapabilities } from '@glimmer/manager/lib/public/helper';
import { setComponentTemplate } from '@glimmer/manager/lib/public/template';
import { getOwner, setOwner } from '@glimmer/owner';
import { CURRIED_COMPONENT } from '@glimmer/constants/lib/curried';
import { curry, isCurriedValue } from '@glimmer/runtime/lib/curried-value';
import { trackedArray } from '@glimmer/validator/lib/collections/array';
import { untrack } from '@glimmer/validator/lib/tracking';
import { BaseRenderer } from '@ember/-internals/glimmer/lib/base-renderer';
import { precompileTemplate } from '@ember/template-compilation';
import templateOnly from '@ember/component/template-only';

import {
  setTemplate as setCompiledTemplate,
  template as compiledTemplate,
  templateFor,
} from './core';
import { setVMFallback } from './invoke';
import { capture } from './managers';
import { attach, renderBlock, renderTemplate } from './render';

const RENDERERS = new WeakMap<object, BaseRenderer>();

function rendererFor(owner: object): BaseRenderer {
  let renderer = RENDERERS.get(owner);
  if (!renderer) {
    renderer = BaseRenderer.strict(owner, document, { isInteractive: true, hasDOM: true });
    RENDERERS.set(owner, renderer);
  }
  return renderer;
}

/**
 * `{{applyAttrs @attrs}}`: applies the attributes and modifiers of a
 * compiled invocation to the element the VM-rendered component puts
 * `...attributes` on (modifiers on an invocation are forwarded there).
 */
class ApplyAttrsManager {
  capabilities = modifierCapabilities('3.22');

  constructor(readonly owner: object) {}

  createModifier(_definition: object, args: { positional: readonly unknown[] }) {
    return { attrs: args.positional[0] as AttrsFn | null, result: null as RenderResult | null };
  }

  installModifier(state: { attrs: AttrsFn | null; result: RenderResult | null }, element: Element) {
    let { attrs } = state;
    if (attrs) {
      state.result = attach(element, this.owner, (b) => {
        attrs(b, element);
      });
    }
  }

  updateModifier() {}

  destroyModifier(state: { result: RenderResult | null }) {
    state.result?.destroy();
  }
}

const applyAttrs = setModifierManager((owner: object) => new ApplyAttrsManager(owner), {});

/**
 * `{{blockIsland @block a b c}}`: renders the compiled block of an
 * invocation, with the block params the VM-rendered component yields.
 */
class BlockIslandManager {
  capabilities = helperCapabilities('3.23', { hasValue: true, hasDestroyable: true });

  constructor(readonly owner: object) {}

  createHelper(_definition: object, args: { positional: readonly unknown[] }) {
    let block = args.positional[0] as BlockFn;
    let params = [1, 2, 3].map((i) => () => args.positional[i]);

    return untrack(() => {
      let element = document.createElement('glimmer-island');
      element.style.display = 'contents';
      let result = renderBlock(block, params, { into: element, owner: this.owner });
      return { element, result };
    });
  }

  getValue(island: { element: Element }): Element {
    return island.element;
  }

  getDestroyable(island: { result: RenderResult }): object {
    return island.result;
  }
}

const blockIsland = setHelperManager((owner) => new BlockIslandManager(owner ?? {}), {});

/**
 * How compiled templates invoke components that only have a VM template.
 * The definition is curried with the invocation's named args (so this works
 * for any component), and `@definition` is tracked, so the VM can update it
 * in place.
 */
const INVOKE = setComponentTemplate(
  precompileTemplate(
    `{{#if @block}}<@definition {{applyAttrs @attrs}} as |a b c|>{{blockIsland @block a b c}}</@definition>{{else}}<@definition {{applyAttrs @attrs}} />{{/if}}`,
    {
      moduleName: 'packages/@glimmer/dom/lib/invoke.hbs',
      strictMode: true,
      scope() {
        return { applyAttrs, blockIsland };
      },
    }
  ),
  templateOnly()
);

// Components that were not compiled with the codegen compiler are rendered
// with the VM, into an element we own. The render root is returned as a
// destroyable, so it is torn down together with the compiled block.
setVMFallback({
  render(definition, into, owner, { named, blocks, attrs }) {
    let args = capture(named, null);
    let last: object | undefined;
    let curried: object | undefined;

    return rendererFor(owner).render(INVOKE, {
      into,
      args: {
        get definition() {
          let value = definition();
          if (value !== last || !curried) {
            last = value;
            curried = curry(CURRIED_COMPONENT, value, owner, args);
          }
          return curried;
        },
        attrs,
        block: blocks?.['default'] ?? null,
      },
    });
  },

  canUpdate(from, to) {
    return isCurriedValue(from) && isCurriedValue(to);
  },
});

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
  result: RenderResult;
}

/**
 * Renders the compiled template for `context` (a component instance, or the
 * state of a template-only component) into an element the VM can insert.
 *
 * This happens once per component instance; from then on, the compiled
 * template updates itself.
 */
function createIsland(context: object): Island {
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

    let result = renderTemplate(template, {
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

    return { element, outlets, result };
  });
}

/**
 * `(island this)`: a helper (rather than a plain function), so that the VM
 * makes the island's render tree a destroyable child of its own block. That
 * way compiled components are torn down in the same pass as the VM's own
 * components, rather than a scheduling round later.
 */
class IslandHelperManager {
  capabilities = helperCapabilities('3.23', { hasValue: true, hasDestroyable: true });

  createHelper(_definition: object, args: { positional: readonly unknown[] }): Island {
    return createIsland(args.positional[0] as object);
  }

  getValue(island: Island): Island {
    return island;
  }

  getDestroyable(island: Island): object {
    return island.result;
  }
}

const island = setHelperManager(() => new IslandHelperManager(), {});

/**
 * The VM template of every compiled component: it inserts the island, where
 * the compiled template renders (and updates) itself. For route templates,
 * it also renders the route's `<@outlet />` into each `{{outlet}}` of the
 * compiled template, in the same render tree as the route (like a route
 * template compiled for the VM would).
 */
const BRIDGE = precompileTemplate(
  `{{#let (island this) as |i|}}{{i.element}}{{#each i.outlets as |el|}}{{#in-element el insertBefore=null}}<@outlet />{{/in-element}}{{/each}}{{/let}}`,
  {
    moduleName: 'packages/@glimmer/dom/lib/vm.hbs',
    strictMode: true,
    scope() {
      return { island };
    },
  }
);

const CAPABILITIES = componentCapabilities('3.13', {});

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
 * `{{outlet}}` (with `vmInterop`): an element that the VM renders the
 * route's `<@outlet />` into.
 */
export function outlet(b: Block, anchor: Node): void {
  let sink = b.root.outlets;

  if (!sink) {
    throw new Error(
      '{{outlet}} can only be used in a template that the router renders (a route template)'
    );
  }

  let element = b.root.document.createElement('glimmer-outlet');
  element.style.display = 'contents';
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- anchors are always attached
  anchor.parentNode!.insertBefore(element, anchor);

  let remove = sink.add(element);
  registerDestructor(b, remove);
}
