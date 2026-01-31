/**
 * GXT-compatible @ember/template-compilation implementation
 *
 * This module provides runtime template compilation using the GXT runtime compiler.
 * It implements the same interface as @ember/template-compilation but uses GXT
 * for template compilation instead of Glimmer VM.
 */

// Import the GXT runtime compiler
import {
  compileTemplate as gxtCompileTemplate,
  setupGlobalScope,
  isGlobalScopeReady,
} from '@lifeart/gxt/runtime-compiler';

import {
  createRoot as gxtCreateRoot,
  setParentContext as gxtSetParentContext,
  $_MANAGERS,
  RENDERED_NODES_PROPERTY,
  COMPONENT_ID_PROPERTY,
} from '@lifeart/gxt';

// Use Symbol.for to match the runtime compiler's symbol setup
// The runtime compiler uses Symbol.for('gxt-slots'), not the exported $SLOTS_SYMBOL from gxt
const $SLOTS_SYMBOL = Symbol.for('gxt-slots');

// Ensure global scope is set up
if (!isGlobalScopeReady()) {
  setupGlobalScope();
}

// CRITICAL: Wrap $_maybeHelper AFTER GXT's setupGlobalScope runs
// GXT's setupGlobalScope sets globalThis.$_maybeHelper to its internal function
// We need to wrap it to handle function arguments (like $_blockParam)
{
  const gx = globalThis as any;
  if (gx.$_maybeHelper && !gx.$_maybeHelper.__emberWrapped) {
    const originalMaybeHelper = gx.$_maybeHelper;
    gx.$_maybeHelper = function(nameOrFn: string | Function, args: any[], options?: any): any {
      // If first argument is a function (like $_blockParam), call it directly with the args
      if (typeof nameOrFn === 'function') {
        try {
          // For $_blockParam, args is [index], so we call with just the first arg
          const result = nameOrFn(args[0]);
          if (gx.__DEBUG_GXT_RENDER) {
            console.log(`[maybeHelper] Function call result:`, result);
          }
          return result;
        } catch (e) {
          if (gx.__DEBUG_GXT_RENDER) {
            console.log(`[maybeHelper] Function call error:`, e);
          }
          return undefined;
        }
      }
      // Otherwise, use the original GXT maybeHelper
      return originalMaybeHelper(nameOrFn, args, options);
    };
    gx.$_maybeHelper.__emberWrapped = true;
  }
}

// Set GXT mode flag
(globalThis as any).__GXT_MODE__ = true;

// Expose $_MANAGERS on globalThis so the $_tag wrapper can access it
// (manager.ts will configure it later, but we need the same reference)
(globalThis as any).$_MANAGERS = $_MANAGERS;

// Global block params stack for yielded values
// When a slot is rendered with block params, they're pushed here
// The $_blockParam helper reads from the top of the stack
const blockParamsStack: any[][] = [];
(globalThis as any).__blockParamsStack = blockParamsStack;

// Helper function to get a block param by index
// This is called by compiled templates that use {{($_blockParam N)}}
(globalThis as any).$_blockParam = function(index: number) {
  const currentParams = blockParamsStack[blockParamsStack.length - 1];
  return currentParams ? currentParams[index] : undefined;
};

// Also expose through EmberFunctionalHelpers for GXT's helper resolution
if (typeof (globalThis as any).EmberFunctionalHelpers === 'undefined') {
  (globalThis as any).EmberFunctionalHelpers = new Set();
}
(globalThis as any).EmberFunctionalHelpers.add((globalThis as any).$_blockParam);

// Override $_tag to check for Ember components before creating HTML elements
// GXT compiles PascalCase tags like <FooBar /> to $_tag('FooBar', ...) but
// these should be handled by the component manager for Ember integration
const g = globalThis as any;
if (g.$_tag && !g.$_tag.__emberWrapped) {
  const originalTag = g.$_tag;

  g.$_tag = function $_tag_ember(
    tag: string | (() => string),
    tagProps: any,
    children: any[],
    ctx: any
  ): any {
    const resolvedTag = typeof tag === 'function' ? tag() : tag;

    // Handle named blocks like <:header> and <:default>
    // These are not real elements - they're markers for named slots
    // Return a special object that can be detected when building slots
    if (resolvedTag && typeof resolvedTag === 'string' && resolvedTag.startsWith(':')) {
      const slotName = resolvedTag.slice(1); // Remove the leading ':'
      const namedBlock = {
        __isNamedBlock: true,
        __slotName: slotName,
        __children: children,
      };
      if ((globalThis as any).__DEBUG_YIELD) {
        console.log(`[named-block] Created named block: ${slotName}, children:`, children.length);
      }
      return namedBlock;
    }

    // Check if this looks like a component name (PascalCase or contains hyphen)
    const mightBeComponent = resolvedTag &&
      typeof resolvedTag === 'string' &&
      (resolvedTag[0] === resolvedTag[0].toUpperCase() || resolvedTag.includes('-'));

    // Access managers dynamically - they may be set up after this module loads
    const managers = g.$_MANAGERS;


    if (mightBeComponent && managers?.component?.canHandle) {
      // Convert PascalCase to kebab-case for Ember component lookup
      const kebabName = resolvedTag
        .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
        .replace(/([A-Z]+)([A-Z][a-z])/g, '$1-$2')
        .toLowerCase();

      // Check if the component manager can handle this
      if (managers.component.canHandle(kebabName)) {
        // Build args from tagProps - convert Props format to args object
        // IMPORTANT: Keep args LAZY - don't evaluate functions yet!
        // Block params from parent slots won't be available until slot.default runs
        let args: any = {};
        const domAttrs: [string, any][] = []; // Attributes to forward via ...attributes

        if (tagProps && tagProps !== g.$_edp) {
          // tagProps is [props[], attrs[], events[], fw?]
          // - props[0]: HTML properties including class (key "" = class, key "id" = id, etc.)
          // - attrs[1]: Attributes with @ prefix for named args, or data-* attributes
          // - events[2]: Event handlers
          // - fw[3]: Forwarded props from parent (for nested components)

          // Process props (index 0) - includes class and other HTML properties
          const props = tagProps[0];
          if (Array.isArray(props)) {
            for (const [key, value] of props) {
              // Empty key means class attribute in GXT's format
              const attrKey = key === '' ? 'class' : key;
              // Collect for forwarding via ...attributes
              domAttrs.push([attrKey, value]);
            }
          }

          // Process attrs (index 1) - includes @ args and data-* attributes
          const attrs = tagProps[1];
          if (Array.isArray(attrs)) {
            for (const [key, value] of attrs) {
              if (key.startsWith('@')) {
                // Named arg - keep as lazy getter
                // The value might be a function that references block params
                // which won't be available until we're inside a slot context
                const argName = key.slice(1);
                Object.defineProperty(args, argName, {
                  get: () => typeof value === 'function' ? value() : value,
                  enumerable: true,
                  configurable: true,
                });
              } else {
                // HTML attribute (like data-test) - collect for forwarding
                domAttrs.push([key, value]);
                // Also keep in args for direct access as lazy getter
                Object.defineProperty(args, key, {
                  get: () => typeof value === 'function' ? value() : value,
                  enumerable: true,
                  configurable: true,
                });
              }
            }
          }
        }

        // Build fw (forwarding) structure for the component manager
        // fw[0] = domAttrs (for ...attributes)
        // fw[1] = slots (for {{yield}})
        // fw[2] = events/modifiers (to forward to elements with ...attributes)
        const slots: Record<string, any> = {};

        // Collect events/modifiers from tagProps[2] for forwarding
        let events: [string, any][] = [];
        if (tagProps && tagProps !== g.$_edp && Array.isArray(tagProps[2])) {
          events = tagProps[2];
          if ((globalThis as any).__DEBUG_MODIFIERS && events.length > 0) {
            console.log(`[compile] Collected ${events.length} events/modifiers for ${kebabName}:`);
            for (let i = 0; i < events.length; i++) {
              const entry = events[i];
              console.log(`[compile]   [${i}]:`, Array.isArray(entry) ?
                `[${entry.map((e, j) => `${j}:(${typeof e})${typeof e === 'function' ? e.name || 'fn' : String(e).slice(0, 50)}`).join(', ')}]` :
                String(entry));
            }
          }
        }
        if (children && children.length > 0) {
          // Separate named blocks from default slot children
          // Named blocks are marked with __isNamedBlock from :name element handling
          const namedBlocks: Map<string, any[]> = new Map();
          const defaultChildren: any[] = [];

          for (const child of children) {
            // Check if it's a named block marker
            if (child && typeof child === 'object' && child.__isNamedBlock) {
              const slotName = child.__slotName;
              if (!namedBlocks.has(slotName)) {
                namedBlocks.set(slotName, []);
              }
              // Add the named block's children to its slot
              if (child.__children) {
                namedBlocks.get(slotName)!.push(...child.__children);
              }
            } else {
              // Regular child goes to default slot
              defaultChildren.push(child);
            }
          }

          // Helper to create a slot function
          const createSlotFn = (slotChildren: any[]) => (slotCtx: any, ...params: any[]) => {
            const unwrappedParams = params.map(param => {
              if (param && typeof param === 'object' && 'fn' in param && 'isConst' in param) {
                try { return param.fn(); } catch { return param; }
              }
              if (typeof param === 'function') {
                try { return param(); } catch { return param; }
              }
              return param;
            });

            const stack = (globalThis as any).__blockParamsStack;
            stack.push(unwrappedParams);

            try {
              const results: any[] = [];
              for (const child of slotChildren) {
                if (typeof child === 'function') {
                  try {
                    const childResult = child();
                    results.push(childResult);
                  } catch (e) {
                    results.push(child);
                  }
                } else if (typeof child === 'string' || typeof child === 'number') {
                  results.push(child);
                } else {
                  results.push(child);
                }
              }
              return results;
            } finally {
              stack.pop();
            }
          };

          // Create slot functions for named blocks
          for (const [slotName, slotChildren] of namedBlocks) {
            slots[slotName] = createSlotFn(slotChildren);
            if ((globalThis as any).__DEBUG_YIELD) {
              console.log(`[slots] Created named slot: ${slotName} with ${slotChildren.length} children`);
            }
          }

          // Create default slot if there are default children
          if (defaultChildren.length > 0) {
            slots.default = createSlotFn(defaultChildren);
          }
        }

        // Legacy: If no slots were created but children exist, create default slot
        // (This handles the case where there are no named blocks)
        if (children && children.length > 0 && !slots.default && Object.keys(slots).length === 0) {
          slots.default = (slotCtx: any, ...params: any[]) => {
            // GXT passes yield params as reactive cells
            // We need to unwrap them to get the actual values for Ember's block params
            const unwrappedParams = params.map(param => {
              // Check if it's a GXT reactive cell (has 'fn' property and 'isConst')
              if (param && typeof param === 'object' && 'fn' in param && 'isConst' in param) {
                try {
                  return param.fn();
                } catch {
                  return param;
                }
              }
              // Check if it's a function that should be evaluated
              if (typeof param === 'function') {
                try {
                  return param();
                } catch {
                  return param;
                }
              }
              return param;
            });

            // Push block params onto the global stack
            // The $_blockParam helper reads from this stack
            const stack = (globalThis as any).__blockParamsStack;
            stack.push(unwrappedParams);

            if ((globalThis as any).__DEBUG_YIELD) {
              console.log('[slot.default] called with params:', JSON.stringify(params));
              console.log('[slot.default] unwrapped params:', JSON.stringify(unwrappedParams));
              console.log('[slot.default] children count:', children.length);
              console.log('[slot.default] stack length after push:', stack.length);
            }

            try {
              // Return children results as GXT template items - NOT as DOM nodes
              // GXT's $_tag expects to receive template items (functions, strings, elements)
              // and handles the DOM conversion itself
              const results: any[] = [];
              for (const child of children) {
                if (typeof child === 'function') {
                  try {
                    // Call the child function to get its result
                    // This might return a DOM node, string, or other GXT item
                    const childResult = child();
                    if ((globalThis as any).__DEBUG_YIELD) {
                      console.log('[slot.default] child result:', typeof childResult, childResult);
                    }
                    // Pass through the result - let GXT handle it
                    results.push(childResult);
                  } catch (e) {
                    if ((globalThis as any).__DEBUG_YIELD) {
                      console.log('[slot.default] child error:', e);
                    }
                    // Fallback for static content
                    results.push(child);
                  }
                } else {
                  // Pass through non-function children directly
                  results.push(child);
                }
              }
              if ((globalThis as any).__DEBUG_YIELD) {
                console.log('[slot.default] returning results:', results.length, 'items');
              }
              return results;
            } finally {
              // Pop block params from stack
              stack.pop();
            }
          };
        }

        const fw = [domAttrs, slots, events];

        // Return a THUNK that renders the component when called
        // This is crucial for block params: when <Outer><Inner @msg={{param}} /></Outer>
        // is compiled, $_tag('Inner', ...) is called BEFORE $_tag('Outer', ...)
        // (due to JavaScript array literal evaluation order)
        // By returning a thunk, we defer the actual rendering until slot.default
        // calls the children functions - at which point block params are set up

        // Create a stable instance ID for this component position in the template
        // This ID is preserved across re-renders of the same template position
        const GXT_THUNK_ID = Symbol.for('gxt-thunk-id');
        if (!args[GXT_THUNK_ID]) {
          args[GXT_THUNK_ID] = Symbol('thunk-instance');
        }
        const thunkId = args[GXT_THUNK_ID];

        const renderComponent = function __componentThunk() {
          // Now evaluate args and render the component
          // The args getters will access block params from the stack
          // Pass the stable thunkId to enable instance caching
          (args as any).__thunkId = thunkId;
          const handleResult = managers.component.handle(kebabName, args, fw, ctx);
          if (typeof handleResult === 'function') {
            return handleResult();
          }
          return handleResult;
        };
        // Mark as component thunk for debugging
        (renderComponent as any).__isComponentThunk = true;
        (renderComponent as any).__componentName = kebabName;

        return renderComponent;
      }
    }

    // Fall back to original $_tag for regular HTML elements
    // GXT handles ...attributes internally by:
    // 1. Applying modifiers from $fw to elements with ...attributes
    // 2. Passing $fw as tagProps[3] for reference
    // We should NOT apply modifiers again here - GXT already handles them.
    // We only need to apply forwarded DOM attributes (fw[0]) that GXT doesn't handle.
    const result = originalTag(tag, tagProps, children, ctx);

    // Apply forwarded DOM attributes from $fw if present
    // $fw is passed as tagProps[3] and contains [domAttrs, slots, events/modifiers]
    // NOTE: We don't apply modifiers (fw[2]) here - GXT handles those internally
    const fw = tagProps?.[3];

    if ((globalThis as any).__DEBUG_MODIFIERS && resolvedTag) {
      console.log(`[compile] $_tag for element '${resolvedTag}':`,
        'tagProps[3] (fw):', fw ? 'present' : 'undefined',
        'tagProps length:', tagProps?.length,
        'fw[2]:', fw?.[2]?.length || 0, 'modifiers (handled by GXT)');
    }

    if (fw && Array.isArray(fw)) {
      const fwAttrs = fw[0];

      // Only apply DOM attributes (fw[0]) - GXT handles modifiers (fw[2]) internally
      if (result && typeof result === 'object' && Array.isArray(fwAttrs) && fwAttrs.length > 0) {
        const applyAttrsToElement = (el: Element) => {
          for (const [key, value] of fwAttrs) {
            const attrValue = typeof value === 'function' ? value() : value;
            if (key === 'class') {
              // Append to existing class rather than replacing
              if (el.className) {
                el.className = el.className + ' ' + attrValue;
              } else {
                el.className = attrValue;
              }
            } else {
              el.setAttribute(key, String(attrValue));
            }
          }
        };

        // Check if result is a DOM element directly
        if (result instanceof Element) {
          applyAttrsToElement(result);
        } else {
          // Check for GXT context object with symbol-keyed nodes
          const symbols = Object.getOwnPropertySymbols(result);
          for (const sym of symbols) {
            const nodes = result[sym];
            if (Array.isArray(nodes)) {
              for (const node of nodes) {
                if (node instanceof Element) {
                  applyAttrsToElement(node);
                }
              }
            }
          }
        }
      }
    }

    return result;
  };

  // Mark as wrapped to prevent re-wrapping
  g.$_tag.__emberWrapped = true;
}

/**
 * Transform capitalized component names to kebab-case for runtime resolution.
 */
function transformCapitalizedComponents(code: string): string {
  let result = code;

  // List of known Ember built-in components that need transformation
  const knownComponents = ['LinkTo', 'Input', 'Textarea', 'Outlet'];

  for (const component of knownComponents) {
    const kebab = component.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase();

    // Opening tag: <LinkTo to <link-to
    const openTagRegex = new RegExp(`<${component}(?=[\\s/>])`, 'g');
    result = result.replace(openTagRegex, `<${kebab}`);

    // Closing tag: </LinkTo> to </link-to>
    const closeTagRegex = new RegExp(`</${component}>`, 'g');
    result = result.replace(closeTagRegex, `</${kebab}>`);
  }

  return result;
}

/**
 * Transform {{outlet}} to <ember-outlet />
 */
function transformOutletHelper(code: string): string {
  return code.replace(/\{\{\s*outlet\s*\}\}/g, '<ember-outlet />');
}

/**
 * Transform {{component}} helper to angle-bracket syntax
 * - {{#component "foo-bar"}}content{{/component}} → <FooBar>content</FooBar>
 * - {{#component "foo-bar" arg=val}}content{{/component}} → <FooBar @arg={{val}}>content</FooBar>
 * - {{component "foo-bar"}} → <FooBar />
 */
function transformComponentHelper(code: string): string {
  let result = code;

  // Helper to convert kebab-case to PascalCase
  const toPascalCase = (name: string) => {
    return name.split('-').map(part => part.charAt(0).toUpperCase() + part.slice(1)).join('');
  };

  // Helper to convert attrs like arg=val to @arg={{val}}
  const transformAttrs = (attrs: string) => {
    if (!attrs.trim()) return '';

    let transformed = attrs.trim();

    // Transform each attribute - need to handle:
    // name=value, name={{value}}, name="value", name='value', name=this.value
    transformed = transformed.replace(/([a-zA-Z][a-zA-Z0-9-]*)=(\{\{[^}]+\}\}|"[^"]*"|'[^']*'|this\.[a-zA-Z0-9.]+|[^\s}]+)/g,
      (match, name, value) => {
        // Add @ prefix if not already present
        const attrName = name.startsWith('@') ? name : `@${name}`;
        // Wrap value in {{}} if it's a path like this.name and not already wrapped
        let attrValue = value;
        if (value.startsWith('this.') && !value.startsWith('{{')) {
          attrValue = `{{${value}}}`;
        }
        return `${attrName}=${attrValue}`;
      });

    // Return with leading space
    return ' ' + transformed;
  };

  // Block form: {{#component "name"}}...{{/component}}
  // Need to handle nested components properly
  const blockPattern = /\{\{#component\s+["']([^"']+)["']([^}]*)\}\}([\s\S]*?)\{\{\/component\}\}/g;
  result = result.replace(blockPattern, (match, name, attrs, content) => {
    const pascalName = toPascalCase(name);
    const transformedAttrs = transformAttrs(attrs);
    return `<${pascalName}${transformedAttrs}>${content}</${pascalName}>`;
  });

  // Inline form: {{component "name" arg=val}}
  const inlinePattern = /\{\{component\s+["']([^"']+)["']([^}]*)\}\}/g;
  result = result.replace(inlinePattern, (match, name, attrs) => {
    const pascalName = toPascalCase(name);
    const transformedAttrs = transformAttrs(attrs);
    return `<${pascalName}${transformedAttrs} />`;
  });

  return result;
}

/**
 * Transform Ember's block params syntax so that block param references use a global accessor.
 *
 * The key insight is that GXT compiles expressions to arrow functions which capture `this`
 * lexically. We cannot change `this` for arrow functions with .call(). Instead, we use
 * a global object that can be accessed from anywhere.
 *
 * This function transforms:
 *   <Foo as |x y|>{{x}} {{y}}</Foo>
 * To:
 *   <Foo>{{$_bp.0}} {{$_bp.1}}</Foo>
 *
 * Before evaluating children, we set globalThis.$_bp = params, allowing the functions
 * to access the yield values through this global reference.
 */
function transformBlockParams(templateString: string): { transformed: string; blockParamMappings: Map<string, string[]> } {
  let result = templateString;
  const blockParamMappings = new Map<string, string[]>();

  // Find all components with `as |...|` block params
  // Pattern: <ComponentName (attrs) as |param1 param2 ...|>
  const blockParamPattern = /<([A-Z][a-zA-Z0-9-]*)((?:\s+(?:[@a-zA-Z][a-zA-Z0-9-]*(?:=(?:"[^"]*"|'[^']*'|\{\{[^}]*\}\}|[^\s>]*))?))*)(\s+as\s*\|([^|]+)\|)(\s*)>/g;

  interface BlockParamScope {
    componentName: string;
    params: string[];
    startIndex: number;
    endIndex: number;
    openTagEnd: number;
  }

  const scopes: BlockParamScope[] = [];
  let match;

  // First pass: find all block param scopes
  while ((match = blockParamPattern.exec(result)) !== null) {
    const [fullMatch, componentName, attrs, asClause, paramsStr] = match;
    const startIndex = match.index;
    const openTagEnd = startIndex + fullMatch.length;

    // Parse params (space-separated)
    const params = paramsStr.trim().split(/\s+/);

    // Find the closing tag for this component
    const closingTag = `</${componentName}>`;
    let depth = 1;
    let searchPos = openTagEnd;
    let endIndex = -1;

    // Simple tag matching (doesn't handle all edge cases but works for most templates)
    const tagOpenPattern = new RegExp(`<${componentName}(?:\\s|>|/>)`, 'g');
    const tagClosePattern = new RegExp(`</${componentName}>`, 'g');

    // Find matching closing tag
    while (depth > 0 && searchPos < result.length) {
      tagOpenPattern.lastIndex = searchPos;
      tagClosePattern.lastIndex = searchPos;

      const openMatch = tagOpenPattern.exec(result);
      const closeMatch = tagClosePattern.exec(result);

      if (!closeMatch) break;

      if (openMatch && openMatch.index < closeMatch.index && !openMatch[0].endsWith('/>')) {
        depth++;
        searchPos = openMatch.index + openMatch[0].length;
      } else {
        depth--;
        if (depth === 0) {
          endIndex = closeMatch.index + closeMatch[0].length;
        } else {
          searchPos = closeMatch.index + closeMatch[0].length;
        }
      }
    }

    if (endIndex === -1) continue;

    scopes.push({
      componentName,
      params,
      startIndex,
      endIndex,
      openTagEnd,
    });

    blockParamMappings.set(componentName + '_' + startIndex, params);
  }

  // Second pass: transform references within each scope (process in reverse to preserve indices)
  for (let i = scopes.length - 1; i >= 0; i--) {
    const scope = scopes[i];
    const { params, startIndex, endIndex, openTagEnd, componentName } = scope;

    // Extract the block content
    const blockContent = result.slice(openTagEnd, endIndex - `</${componentName}>`.length);

    // Replace each param reference with ($_blockParam N) helper call
    let transformedContent = blockContent;
    for (let j = 0; j < params.length; j++) {
      const param = params[j];
      // Replace {{param}} with {{($_blockParam N)}}
      // This uses a helper that retrieves block params from a global stack
      const mustachePattern = new RegExp(`\\{\\{\\s*${param}\\s*\\}\\}`, 'g');
      transformedContent = transformedContent.replace(mustachePattern, `{{($_blockParam ${j})}}`);

      // Replace {{param}} in attribute values: @attr={{param}}
      const attrPattern = new RegExp(`([@a-zA-Z][a-zA-Z0-9-]*=)\\{\\{${param}\\}\\}`, 'g');
      transformedContent = transformedContent.replace(attrPattern, `$1{{($_blockParam ${j})}}`);
    }

    // Reconstruct the element without the `as |...|` part
    const originalOpenTag = result.slice(startIndex, openTagEnd);
    const newOpenTag = originalOpenTag.replace(/\s+as\s*\|[^|]+\|/, '');

    const closingTag = `</${componentName}>`;
    const newElement = newOpenTag + transformedContent + closingTag;

    result = result.slice(0, startIndex) + newElement + result.slice(endIndex);
  }

  return { transformed: result, blockParamMappings };
}

/**
 * Transform curly block component syntax to angle-bracket syntax
 * - {{#foo-bar}}content{{/foo-bar}} → <FooBar>content</FooBar>
 * - {{#foo-bar arg=val}}content{{/foo-bar}} → <FooBar @arg={{val}}>content</FooBar>
 * - {{foo-bar}} → <FooBar />
 */
function transformCurlyBlockComponents(code: string): string {
  let result = code;

  // Helper to convert kebab-case to PascalCase
  const toPascalCase = (name: string) => {
    return name.split('-').map(part => part.charAt(0).toUpperCase() + part.slice(1)).join('');
  };

  // Helper to convert attrs like arg=val to @arg={{val}}
  const transformAttrs = (attrs: string) => {
    if (!attrs.trim()) return '';

    let transformed = attrs.trim();

    // Transform each attribute
    // Match: name={{value}} or name=value or name="value"
    transformed = transformed.replace(/([a-zA-Z][a-zA-Z0-9-]*)=(\{\{[^}]+\}\}|"[^"]*"|'[^']*'|[^\s}]+)/g,
      (match, name, value) => {
        // Add @ prefix if not already present
        const attrName = name.startsWith('@') ? name : `@${name}`;
        return `${attrName}=${value}`;
      });

    return ' ' + transformed;
  };

  // Known block helpers that should NOT be transformed (they're control flow, not components)
  const blockHelpers = ['if', 'unless', 'each', 'each-in', 'with', 'let', 'in-element'];

  // Block form: {{#component-name attrs}}...{{/component-name}}
  // Use a recursive approach to handle nested blocks
  const transformBlocks = (input: string): string => {
    // Match opening block: {{#name attrs}}
    const blockOpenPattern = /\{\{#([a-z][a-zA-Z0-9-]*)([^}]*)\}\}/;

    let output = input;
    let match;
    let iterations = 0;
    const maxIterations = 100; // Prevent infinite loops
    const skipMap = new Map<string, string>(); // Store markers to restore

    while ((match = blockOpenPattern.exec(output)) !== null && iterations < maxIterations) {
      iterations++;
      const [fullMatch, name, attrs] = match;
      const startIndex = match.index;

      // Skip known block helpers - preserve the full original opening tag
      if (blockHelpers.includes(name)) {
        // Mark the opening tag as processed so we don't match it again
        // Use a unique marker that won't conflict with template content
        const markerId = `__SKIP_${name}_${iterations}__`;
        output = output.slice(0, startIndex) + markerId + output.slice(startIndex + fullMatch.length);
        skipMap.set(markerId, fullMatch);
        continue;
      }

      // Find the matching closing tag
      const closingTag = `{{/${name}}}`;
      let depth = 1;
      let searchPos = startIndex + fullMatch.length;
      let endIndex = -1;

      while (depth > 0 && searchPos < output.length) {
        const nextOpen = output.indexOf(`{{#${name}`, searchPos);
        const nextClose = output.indexOf(closingTag, searchPos);

        if (nextClose === -1) break;

        if (nextOpen !== -1 && nextOpen < nextClose) {
          depth++;
          searchPos = nextOpen + 3;
        } else {
          depth--;
          if (depth === 0) {
            endIndex = nextClose + closingTag.length;
          } else {
            searchPos = nextClose + closingTag.length;
          }
        }
      }

      if (endIndex === -1) {
        // Can't find closing tag, skip this opening tag
        const markerId = `__SKIP_${name}_${iterations}_nf__`;
        output = output.slice(0, startIndex) + markerId + output.slice(startIndex + fullMatch.length);
        skipMap.set(markerId, fullMatch);
        continue;
      }

      // Extract content between opening and closing tags
      const content = output.slice(startIndex + fullMatch.length, endIndex - closingTag.length);

      // Transform to angle-bracket syntax
      const pascalName = toPascalCase(name);
      const transformedAttrs = transformAttrs(attrs);
      const replacement = `<${pascalName}${transformedAttrs}>${content}</${pascalName}>`;

      output = output.slice(0, startIndex) + replacement + output.slice(endIndex);
    }

    // Restore skipped blocks from the map
    for (const [marker, original] of skipMap) {
      output = output.replace(marker, original);
    }

    return output;
  };

  result = transformBlocks(result);

  // Inline form: {{component-name arg=val}} (not followed by block content)
  // Only transform if it looks like a component (has hyphen = kebab-case)
  // Be careful not to transform helpers like {{if}} or {{log}}
  const inlinePattern = /\{\{([a-z][a-zA-Z0-9]*-[a-zA-Z0-9-]*)([^}]*)\}\}/g;
  result = result.replace(inlinePattern, (match, name, attrs) => {
    const pascalName = toPascalCase(name);
    const transformedAttrs = transformAttrs(attrs);
    return `<${pascalName}${transformedAttrs} />`;
  });

  return result;
}

// Template cache for performance
const templateCache = new Map<string, any>();

/**
 * Runtime precompileTemplate implementation using GXT runtime compiler
 * Returns a template factory function that takes an owner and returns a template.
 */
export function precompileTemplate(templateString: string, options?: {
  strictMode?: boolean;
  scope?: () => Record<string, unknown>;
  moduleName?: string;
}) {
  // Check cache first
  const cacheKey = templateString + (options?.moduleName || '');
  const cached = templateCache.get(cacheKey);
  if (cached) {
    return cached;
  }

  // Transform the template
  let transformedTemplate = templateString;
  transformedTemplate = transformCapitalizedComponents(transformedTemplate);
  if (/\{\{\s*outlet\s*\}\}/.test(transformedTemplate)) {
    transformedTemplate = transformOutletHelper(transformedTemplate);
  }
  // Transform {{component}} helper to angle-bracket
  if (/\{\{#?component\s+["']/.test(transformedTemplate)) {
    transformedTemplate = transformComponentHelper(transformedTemplate);
  }

  // Transform curly block component syntax to angle-bracket
  // {{#foo-bar}}...{{/foo-bar}} → <FooBar>...</FooBar>
  if (/\{\{#[a-z][a-zA-Z0-9-]*[\s}]/.test(transformedTemplate)) {
    transformedTemplate = transformCurlyBlockComponents(transformedTemplate);
  }

  // Transform reserved word variable names to this.varName to avoid invalid JS
  // e.g., class=class -> class=this.class (because `class` is a reserved word)
  const reservedWords = ['class', 'default', 'new', 'delete', 'void', 'typeof', 'instanceof', 'in', 'const', 'let', 'var', 'function', 'return', 'if', 'else', 'for', 'while', 'do', 'switch', 'case', 'break', 'continue', 'try', 'catch', 'finally', 'throw', 'with', 'debugger', 'import', 'export', 'extends', 'super', 'static', 'yield', 'await', 'enum', 'implements', 'interface', 'package', 'private', 'protected', 'public'];
  for (const word of reservedWords) {
    // Match word=word pattern (not word="value" or word={{expr}})
    const pattern = new RegExp(`(\\s)(${word})=(${word})(?=[\\s}/>])`, 'g');
    transformedTemplate = transformedTemplate.replace(pattern, `$1$2=this.$3`);
  }

  // Transform block params: <Foo as |x|>{{x}}</Foo> → <Foo>{{@__bp_0__}}</Foo>
  // This transforms block param references to special @args that we pass through slots
  let blockParamMappings = new Map<string, string[]>();
  if (/\s+as\s*\|[^|]+\|/.test(transformedTemplate)) {
    const result = transformBlockParams(transformedTemplate);
    transformedTemplate = result.transformed;
    blockParamMappings = result.blockParamMappings;
  }

  // Compile using GXT runtime compiler
  const compilationResult = gxtCompileTemplate(transformedTemplate, {
    moduleName: options?.moduleName || 'gxt-runtime-template',
    flags: {
      IS_GLIMMER_COMPAT_MODE: true,
      WITH_EMBER_INTEGRATION: true,
      WITH_HELPER_MANAGER: true,
      WITH_MODIFIER_MANAGER: true,
      WITH_CONTEXT_API: true,
      TRY_CATCH_ERROR_HANDLING: false,
    },
  });

  if (compilationResult.errors && compilationResult.errors.length > 0) {
    console.warn('[gxt-compile] Compilation warnings:', compilationResult.errors);
  }

  // Helper function to convert template results to nodes
  const itemToNode = (item: any, depth = 0): Node | null => {
    if (item instanceof Node) {
      return item;
    }
    // GXT returns getter functions for dynamic values like {{@greeting}}
    // These need to be called to get the actual value
    if (typeof item === 'function') {
      try {
        const result = item();
        return itemToNode(result, depth + 1);
      } catch (e) {
        // If the function throws, it might be a component or helper
        // Return null and let the caller handle it
        return null;
      }
    }
    if (typeof item === 'string') {
      return document.createTextNode(item);
    }
    if (typeof item === 'number' || typeof item === 'boolean') {
      return document.createTextNode(String(item));
    }
    if (item && typeof item === 'object') {
      // Check for GXT reactive cell with 'fn' property (from $_slot results)
      // GXT's slots return reactive cells that have a 'fn' getter function
      if (typeof item.fn === 'function' && 'isConst' in item) {
        try {
          const cellValue = item.fn();
          return itemToNode(cellValue);
        } catch (e) {
          // fn() may throw if the cell is destroyed
        }
      }

      // Check for $nodes or nodes property
      const nodesProp = item.$nodes || item.nodes;
      if (nodesProp) {
        const frag = document.createDocumentFragment();
        for (const n of nodesProp) {
          const node = itemToNode(n);
          if (node) frag.appendChild(node);
        }
        return frag.childNodes.length > 0 ? frag : null;
      }

      // Check for Symbol-based node storage (GXT context objects)
      const symbols = Object.getOwnPropertySymbols(item);
      for (const sym of symbols) {
        const val = item[sym];
        if (Array.isArray(val) && val.length > 0) {
          const hasNodes = val.some((v: any) =>
            v instanceof Node ||
            typeof v === 'string' ||
            typeof v === 'number' ||
            (v && typeof v === 'object'));

          if (hasNodes) {
            const frag = document.createDocumentFragment();
            for (const n of val) {
              const node = itemToNode(n);
              if (node) frag.appendChild(node);
            }
            return frag.childNodes.length > 0 ? frag : null;
          }
        }
      }
    }
    return null;
  };

  // Create the template factory function (takes owner, returns template)
  const templateFactory = function(owner?: any) {
    const templateId = `gxt-template-${Date.now()}-${Math.random().toString(36).slice(2)}`;

    // Create a template object that Ember expects
    const template = {
      __gxtCompiled: true,
      __gxtRuntimeCompiled: true,
      moduleName: options?.moduleName || 'gxt-runtime-template',
      id: templateId,
      result: 'ok' as const,
      meta: { owner },

      // The compiled template function
      _templateFn: compilationResult.templateFn,
      _code: compilationResult.code,

      // For debugging
      toString() {
        return `[gxt-template: ${templateString.slice(0, 50)}...]`;
      },

      // Required by Ember's template system - provides a compilable program
      asLayout() {
        return {
          compile: () => ({ handle: 0, symbolTable: { hasEval: false, symbols: [] } }),
          id: templateId,
          moduleName: options?.moduleName || 'gxt-runtime-template',
        };
      },

      asWrappedLayout() {
        return this.asLayout();
      },

      // Render function for Ember integration
      render(context: any, parentElement: Element | null) {
        if (!parentElement) {
          console.warn('[gxt-compile] No parent element provided for render');
          return { nodes: [] };
        }

        // Set up $slots and $fw as globals for the template function to access
        // The GXT runtime compiler generates code that references these directly
        const g = globalThis as any;
        const prevSlots = g.$slots;
        const prevFw = g.$fw;

        try {
          // Set up GXT context for proper rendering
          const gxtRoot = gxtCreateRoot(document);
          gxtSetParentContext(gxtRoot);

          g.$slots = context[$SLOTS_SYMBOL] || context.$slots || {};
          g.$fw = context.$fw || [[], [], []];

          // Initialize GXT context symbols on the render context if not present
          // GXT requires these for proper parent/child tracking
          // Use the actual symbols exported from GXT

          // Create a render context that inherits from the component but has GXT symbols
          const renderContext = Object.create(context);

          // Store both context and renderContext for debugging
          (globalThis as any).__lastRenderContext = context;
          (globalThis as any).__lastRenderContextCreated = renderContext;


          // Set up the GXT context symbols using the proper exported symbols
          if (RENDERED_NODES_PROPERTY && !renderContext[RENDERED_NODES_PROPERTY as any]) {
            renderContext[RENDERED_NODES_PROPERTY as any] = [];
          }
          if (COMPONENT_ID_PROPERTY && !renderContext[COMPONENT_ID_PROPERTY as any]) {
            // Generate a unique context ID
            renderContext[COMPONENT_ID_PROPERTY as any] = g.__gxtContextId = (g.__gxtContextId || 0) + 1;
          }

          // Ensure $args symbol is accessible on the render context
          // The compiled template uses this[$args].argName, where $args is Symbol.for('gxt-args')
          const $ARGS_SYMBOL = Symbol.for('gxt-args');
          if (context[$ARGS_SYMBOL] && !renderContext[$ARGS_SYMBOL]) {
            renderContext[$ARGS_SYMBOL] = context[$ARGS_SYMBOL];
          }

          // Call the compiled template function with the render context
          const result = compilationResult.templateFn.call(renderContext);

          // Handle the result
          const nodes: Node[] = [];
          if (Array.isArray(result)) {
            for (const item of result) {
              const node = itemToNode(item);
              if (node) {
                if (node instanceof DocumentFragment) {
                  const childNodes = Array.from(node.childNodes);
                  for (const child of childNodes) {
                    nodes.push(child);
                    parentElement.appendChild(child);
                  }
                } else {
                  nodes.push(node);
                  parentElement.appendChild(node);
                }
              }
            }
          } else {
            const node = itemToNode(result);
            if (node) {
              if (node instanceof DocumentFragment) {
                const childNodes = Array.from(node.childNodes);
                for (const child of childNodes) {
                  nodes.push(child);
                  parentElement.appendChild(child);
                }
              } else {
                nodes.push(node);
                parentElement.appendChild(node);
              }
            }
          }

          // Restore previous global values
          g.$slots = prevSlots;
          g.$fw = prevFw;

          return { nodes, ctx: context };
        } catch (err) {
          // Restore globals even on error
          g.$slots = prevSlots;
          g.$fw = prevFw;

          let errMsg = err instanceof Error ? err.message : String(err);
          if (errMsg === '[object Object]' && err) {
            // Try to get more info
            errMsg = JSON.stringify(err, null, 2).substring(0, 200);
          }
          console.error('[gxt-compile] Render error:', errMsg);
          console.error('[gxt-compile] Template:', templateString.slice(0, 200));
          if (err?.stack) {
            console.error('[gxt-compile] Stack:', err.stack.substring(0, 300));
          }
          return { nodes: [], ctx: context };
        }
      },
    };

    return template;
  };

  // Add properties to the factory function itself for compatibility
  (templateFactory as any).__gxtCompiled = true;
  (templateFactory as any).__gxtRuntimeCompiled = true;
  (templateFactory as any).moduleName = options?.moduleName || 'gxt-runtime-template';
  (templateFactory as any).id = `gxt-factory-${Date.now()}-${Math.random().toString(36).slice(2)}`;

  // Cache the result
  templateCache.set(cacheKey, templateFactory);

  return templateFactory;
}

/**
 * Compile a template string at runtime using GXT
 */
export function compileTemplate(templateString: string, options?: any) {
  return precompileTemplate(templateString, options);
}

/**
 * Register the template compiler (for compatibility)
 */
export function __registerTemplateCompiler(compiler: any) {
  // Store reference for debugging
  (globalThis as any).__registeredTemplateCompiler = compiler;
}

/**
 * Ember template compiler interface
 */
export const __emberTemplateCompiler = {
  compile: compileTemplate,
  precompile(templateString: string, options?: any) {
    // For precompile, just return a JSON representation
    // The actual compilation happens at runtime
    return JSON.stringify({
      source: templateString,
      moduleName: options?.moduleName,
      isGxt: true,
    });
  },
};

export default function templateCompilation() {
  return {
    precompileTemplate,
    compileTemplate,
    __registerTemplateCompiler,
    __emberTemplateCompiler,
  };
}
