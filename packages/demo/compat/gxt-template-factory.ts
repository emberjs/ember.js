/**
 * GXT Template Factory Runtime Helper
 *
 * Provides createTemplateFactory() which wraps a GXT-compiled template function
 * into an Ember-compatible template factory. This is used by the Vite plugin
 * (gxt-template-compiler-plugin.mjs) to wrap compiled templates at build time.
 *
 * Instead of inlining ~200 lines of factory code per template, the plugin emits:
 *   import { createTemplateFactory } from './gxt-template-factory';
 *   const __gxt_template_0__ = createTemplateFactory(function() { ... });
 */

import { createRoot, setParentContext } from '@lifeart/gxt';

/**
 * Extract DOM nodes from a GXT rendering result.
 *
 * GXT stores nodes in various formats (direct nodes, arrays, symbol-keyed
 * properties, reactive getters). This function normalizes all of them into
 * a flat array of DOM Nodes.
 */
function extractNodesFromContext(result: unknown, createTextNodes = true): Node[] {
  if (!result) return [];

  if (result instanceof Node) return [result];

  if (typeof result === 'string' || typeof result === 'number') {
    if (createTextNodes && result !== '') {
      return [document.createTextNode(String(result))];
    }
    return [];
  }

  if (typeof result === 'function') {
    try {
      const value = (result as () => unknown)();
      if (value !== undefined && value !== null) {
        return extractNodesFromContext(value, createTextNodes);
      }
    } catch (_e) {
      // Ignore errors from calling reactive getters
    }
    return [];
  }

  if (Array.isArray(result)) {
    const nodes: Node[] = [];
    for (const item of result) {
      if (item instanceof Node) {
        nodes.push(item);
      } else if (typeof item === 'string' || typeof item === 'number') {
        if (createTextNodes && item !== '') {
          nodes.push(document.createTextNode(String(item)));
        }
      } else if (typeof item === 'function') {
        try {
          const value = (item as () => unknown)();
          if (value !== undefined && value !== null) {
            if (typeof value === 'string' || typeof value === 'number') {
              if (createTextNodes && value !== '') {
                nodes.push(document.createTextNode(String(value)));
              }
            } else {
              nodes.push(...extractNodesFromContext(value, createTextNodes));
            }
          }
        } catch (_e) {
          // Ignore errors from calling reactive getters
        }
      } else if (item && typeof item === 'object') {
        nodes.push(...extractNodesFromContext(item, createTextNodes));
      }
    }
    return nodes;
  }

  if (typeof result === 'object' && result !== null) {
    // Check symbol-keyed properties (GXT stores nodes under symbol keys)
    const symbols = Object.getOwnPropertySymbols(result);
    for (const sym of symbols) {
      const val = (result as Record<symbol, unknown>)[sym];
      if (Array.isArray(val) && val.length > 0) {
        const hasNodes = val.some((item: unknown) => item instanceof Node);
        if (hasNodes) {
          return val.filter((item: unknown) => item instanceof Node) as Node[];
        }
        const foundNodes: Node[] = [];
        for (const item of val) {
          if (item instanceof Node) {
            foundNodes.push(item);
          } else if (typeof item === 'string' || typeof item === 'number') {
            if (item !== '') {
              foundNodes.push(document.createTextNode(String(item)));
            }
          } else if (typeof item === 'function') {
            try {
              const value = (item as () => unknown)();
              if (value !== undefined && value !== null) {
                if (typeof value === 'string' || typeof value === 'number') {
                  if (value !== '') {
                    foundNodes.push(document.createTextNode(String(value)));
                  }
                } else {
                  foundNodes.push(...extractNodesFromContext(value, true));
                }
              }
            } catch (_e) {
              // Ignore errors from calling reactive getters
            }
          } else if (item && typeof item === 'object') {
            foundNodes.push(...extractNodesFromContext(item, true));
          }
        }
        if (foundNodes.length > 0) {
          return foundNodes;
        }
      }
    }

    // Check $nodes or nodes property for nested contexts
    const obj = result as Record<string, unknown>;
    const nodesProp = obj.$nodes || obj.nodes;
    if (nodesProp) {
      return extractNodesFromContext(nodesProp);
    }
  }

  return [];
}

/**
 * Process GXT node definitions into DOM nodes and append to parent.
 */
function processNodes(items: unknown, parentEl: Element): Node[] {
  const nodes = extractNodesFromContext(items);
  for (const node of nodes) {
    if (node.parentNode !== parentEl) {
      parentEl.appendChild(node);
    }
  }
  return nodes;
}

/**
 * Set up GXT context for template execution.
 *
 * GXT primitives ($_tag, $_if, etc.) require context to be properly
 * initialized via createRoot and setParentContext.
 */
function withGxtContext(
  ctx: Record<string | symbol, unknown>,
  _parentEl: Element,
  fn: () => unknown
): unknown {
  const domApi = {
    doc: document,
    parent(node: Node) { return node.parentNode; },
    isNode(item: unknown) { return item && typeof item === 'object' && 'nodeType' in (item as object); },
    destroy(node: Node | null) { node && (node as Element).remove(); },
    clearChildren(el: Element) { el.innerHTML = ''; },
    toString() { return 'html:dom-api'; },
    addEventListener(el: Element, event: string, handler: EventListener) {
      el.addEventListener(event, handler);
      return () => el.removeEventListener(event, handler);
    },
    attr(el: Element, name: string, value: string | null) {
      el.setAttribute(name, value === null ? '' : value);
    },
    prop(el: Record<string, unknown>, name: string, value: unknown) {
      el[name] = value;
      return value;
    },
    comment(str = '') { return document.createComment(str); },
    text(str = '') { return document.createTextNode(str); },
    textContent(node: Node, text: string) { node.textContent = text; },
    fragment() { return document.createDocumentFragment(); },
    element(tag = '') { return document.createElement(tag); },
    insert(parent: Node | null, node: Node, before?: Node | null) {
      parent && parent.insertBefore(node, before || null);
    }
  };

  const gxtRoot = createRoot(document) as Record<string | symbol, unknown>;
  const symbols = Object.getOwnPropertySymbols(gxtRoot);
  let domProviderSymbol: symbol | undefined;
  let nodesSymbol: symbol | undefined;

  for (const sym of symbols) {
    const val = gxtRoot[sym];
    ctx[sym] = val;

    if (Array.isArray(val) && !nodesSymbol) {
      nodesSymbol = sym;
    } else if (val === undefined && !domProviderSymbol) {
      domProviderSymbol = sym;
    }
  }

  if (domProviderSymbol) {
    ctx[domProviderSymbol] = domApi;
    gxtRoot[domProviderSymbol] = domApi;
  }

  if (nodesSymbol && !Array.isArray(ctx[nodesSymbol])) {
    ctx[nodesSymbol] = [];
  }

  setParentContext(gxtRoot as Parameters<typeof setParentContext>[0]);

  return fn();
}

interface RenderResult {
  nodes: Node[];
  ctx?: Record<string, unknown>;
}

interface TemplateObject {
  __gxtCompiled: true;
  moduleName: string;
  render(ctx: Record<string, unknown> | null, parentEl: Element | null): RenderResult;
}

interface TemplateFactory {
  (owner: unknown): TemplateObject;
  __gxtCompiled: true;
  __gxtFactory: true;
  moduleName: string;
  asLayout(): {
    moduleName: string;
    symbolTable: { hasEval: boolean; symbols: string[]; upvars: string[] };
    meta: { moduleName: string; size: number };
    compile(): number;
  };
  asWrappedLayout: TemplateFactory['asLayout'];
  render(ctx: Record<string, unknown> | null, parentEl: Element | null): RenderResult;
}

/**
 * Create an Ember-compatible template factory from a GXT template function.
 *
 * The template function is the compiled GXT output that returns an array of
 * node definitions using $_tag, $_if, etc.
 */
export function createTemplateFactory(
  templateFn: (...args: unknown[]) => unknown,
  moduleName = 'unknown'
): TemplateFactory {
  function renderTemplate(
    ctx: Record<string, unknown> | null,
    parentEl: Element | null
  ): RenderResult {
    if (!parentEl) {
      if ((globalThis as Record<string, unknown>).__DEBUG_GXT_TEMPLATE) {
        console.warn('[gxt-template] No parent element provided for render');
      }
      return { nodes: [] };
    }
    const gxtCtx = (ctx || {}) as Record<string | symbol, unknown>;
    if (!gxtCtx.args) gxtCtx.args = {};

    try {
      const result = withGxtContext(gxtCtx, parentEl, () =>
        templateFn.call(gxtCtx, gxtCtx.args)
      );
      const nodes = processNodes(result, parentEl);
      return { nodes, ctx: gxtCtx as Record<string, unknown> };
    } catch (e) {
      if ((globalThis as Record<string, unknown>).__DEBUG_GXT_TEMPLATE) {
        console.error('[gxt-template] Render error:', e);
      }
      return { nodes: [], ctx: gxtCtx as Record<string, unknown> };
    }
  }

  const factory = function (_owner: unknown): TemplateObject {
    return {
      __gxtCompiled: true,
      moduleName,
      render: renderTemplate,
    };
  } as TemplateFactory;

  factory.__gxtCompiled = true;
  factory.__gxtFactory = true;
  factory.moduleName = moduleName;
  factory.render = renderTemplate;

  factory.asLayout = function () {
    return {
      moduleName,
      symbolTable: { hasEval: false, symbols: [], upvars: [] },
      meta: { moduleName, size: 0 },
      compile() { return 999999; },
    };
  };
  factory.asWrappedLayout = factory.asLayout;

  return factory;
}
