/**
 * GXT-compatible ember-template-compiler replacement
 *
 * This module provides runtime template compilation that produces
 * gxt-compatible templates with $nodes structure.
 */

// The $nodes symbol is 'nodes' in gxt
const GXT_NODES_KEY = 'nodes';

// Import glimmer-syntax from the original location for parsing
// @ts-ignore - Dynamic import for glimmer syntax
let glimmerSyntax: any = null;

// Lazy-load glimmer-syntax
async function getGlimmerSyntax() {
  if (!glimmerSyntax) {
    // Try to import from @glimmer/syntax if available
    try {
      glimmerSyntax = await import('@glimmer/syntax');
    } catch {
      console.warn('Could not load @glimmer/syntax, using simple parser');
    }
  }
  return glimmerSyntax;
}

// Simple HBS parser for basic templates (fallback when glimmer-syntax not available)
function simpleParseTemplate(templateString: string): any[] {
  const nodes: any[] = [];
  let remaining = templateString;

  while (remaining.length > 0) {
    // Check for mustache expression {{...}}
    const mustacheStart = remaining.indexOf('{{');

    if (mustacheStart === -1) {
      // No more mustaches, rest is text
      if (remaining.trim()) {
        nodes.push({ type: 'text', value: remaining });
      }
      break;
    }

    // Add text before mustache
    if (mustacheStart > 0) {
      const textBefore = remaining.slice(0, mustacheStart);
      if (textBefore.trim() || textBefore.includes('\n')) {
        nodes.push({ type: 'text', value: textBefore });
      }
    }

    // Find closing }}
    const mustacheEnd = remaining.indexOf('}}', mustacheStart);
    if (mustacheEnd === -1) {
      // Unclosed mustache, treat rest as text
      nodes.push({ type: 'text', value: remaining });
      break;
    }

    const expression = remaining.slice(mustacheStart + 2, mustacheEnd).trim();

    // Check for block expressions {{#...}}
    if (expression.startsWith('#')) {
      const blockName = expression.slice(1).split(/\s+/)[0];
      const closeTag = `{{/${blockName}}}`;
      const closeIdx = remaining.indexOf(closeTag, mustacheEnd);

      if (closeIdx !== -1) {
        const blockContent = remaining.slice(mustacheEnd + 2, closeIdx);
        const args = expression.slice(1 + blockName!.length).trim();

        nodes.push({
          type: 'block',
          name: blockName,
          args,
          content: blockContent,
        });

        remaining = remaining.slice(closeIdx + closeTag.length);
        continue;
      }
    }

    // Regular mustache expression
    nodes.push({ type: 'mustache', expression });
    remaining = remaining.slice(mustacheEnd + 2);
  }

  return nodes;
}

// Parse HTML elements from template
function parseElements(templateString: string): any[] {
  const nodes: any[] = [];
  let remaining = templateString.trim();

  while (remaining.length > 0) {
    // Check for HTML element
    const tagMatch = remaining.match(/^<(\w+)([^>]*)>/);
    if (tagMatch) {
      const [fullMatch, tagName, attrsString] = tagMatch;

      // Parse attributes
      const attrs: Record<string, any> = {};
      const attrRegex = /(\w+)(?:=["']([^"']*)["']|={{([^}]+)}})?/g;
      let attrMatch;
      while ((attrMatch = attrRegex.exec(attrsString!)) !== null) {
        const [, name, staticValue, dynamicValue] = attrMatch;
        if (dynamicValue) {
          attrs[name!] = { dynamic: true, expression: dynamicValue };
        } else if (staticValue !== undefined) {
          attrs[name!] = staticValue;
        } else {
          attrs[name!] = true;
        }
      }

      // Find closing tag
      const closeTag = `</${tagName}>`;
      const closeIdx = remaining.indexOf(closeTag, fullMatch!.length);

      if (closeIdx !== -1) {
        const content = remaining.slice(fullMatch!.length, closeIdx);
        nodes.push({
          type: 'element',
          tag: tagName,
          attrs,
          children: parseElements(content),
        });
        remaining = remaining.slice(closeIdx + closeTag.length).trim();
      } else {
        // Self-closing or unclosed
        nodes.push({
          type: 'element',
          tag: tagName,
          attrs,
          children: [],
        });
        remaining = remaining.slice(fullMatch!.length).trim();
      }
      continue;
    }

    // Check for mustache or text
    const simpleNodes = simpleParseTemplate(remaining);
    nodes.push(...simpleNodes);
    break;
  }

  return nodes;
}

// Convert parsed node to gxt runtime call
function nodeToGxt(node: any, context: any): any {
  if (node.type === 'text') {
    return document.createTextNode(node.value);
  }

  if (node.type === 'mustache') {
    const expr = node.expression;
    // Handle this.xxx expressions
    if (expr.startsWith('this.')) {
      const path = expr.slice(5);
      const value = getPath(context, path);
      return document.createTextNode(String(value ?? ''));
    }
    // Handle @xxx args
    if (expr.startsWith('@')) {
      const path = expr.slice(1);
      const value = getPath(context?.args || context, path);
      return document.createTextNode(String(value ?? ''));
    }
    // Plain value
    return document.createTextNode(String(expr));
  }

  if (node.type === 'element') {
    const el = document.createElement(node.tag);

    // Set attributes
    for (const [name, value] of Object.entries(node.attrs)) {
      if (typeof value === 'object' && (value as any).dynamic) {
        const expr = (value as any).expression;
        const resolvedValue = resolveExpression(expr, context);
        if (resolvedValue != null) {
          el.setAttribute(name, String(resolvedValue));
        }
      } else if (value !== true) {
        el.setAttribute(name, String(value));
      } else {
        el.setAttribute(name, '');
      }
    }

    // Add children
    for (const child of node.children) {
      const childNode = nodeToGxt(child, context);
      if (childNode) {
        if (Array.isArray(childNode)) {
          childNode.forEach((n: Node) => el.appendChild(n));
        } else {
          el.appendChild(childNode);
        }
      }
    }

    return el;
  }

  if (node.type === 'block') {
    // Handle block helpers like #if, #each
    if (node.name === 'if') {
      const condition = resolveExpression(node.args, context);
      if (condition) {
        const childNodes = parseElements(node.content);
        return childNodes.map((child: any) => nodeToGxt(child, context));
      }
      return document.createComment('if-false');
    }

    if (node.name === 'each') {
      const [itemsExpr, , itemName] = node.args.split(/\s+as\s+\||\|/).map((s: string) => s.trim());
      const items = resolveExpression(itemsExpr, context) || [];
      const results: Node[] = [];

      for (const item of items) {
        const childContext = { ...context, [itemName || 'item']: item };
        const childNodes = parseElements(node.content);
        for (const child of childNodes) {
          const childNode = nodeToGxt(child, childContext);
          if (childNode) {
            if (Array.isArray(childNode)) {
              results.push(...childNode);
            } else {
              results.push(childNode);
            }
          }
        }
      }

      return results;
    }
  }

  return null;
}

// Helper to get nested path value
function getPath(obj: any, path: string): any {
  if (!obj || !path) return undefined;
  const parts = path.split('.');
  let current = obj;
  for (const part of parts) {
    if (current == null) return undefined;
    current = current[part];
  }
  return current;
}

// Resolve expression in context
function resolveExpression(expr: string, context: any): any {
  if (!expr) return undefined;
  expr = expr.trim();

  if (expr.startsWith('this.')) {
    return getPath(context, expr.slice(5));
  }
  if (expr.startsWith('@')) {
    return getPath(context?.args || context, expr.slice(1));
  }
  // Try as direct property
  return getPath(context, expr);
}

// GXT template symbol
const GXT_TEMPLATE_SYMBOL = Symbol('gxt-template');

// GXT compile options type
export interface EmberPrecompileOptions {
  moduleName?: string;
  strictMode?: boolean;
  locals?: string[];
  isProduction?: boolean;
  meta?: Record<string, unknown>;
  plugins?: {
    ast?: any[];
  };
  parseOptions?: {
    srcName?: string;
    ignoreStandalone?: boolean;
  };
  customizeComponentName?: (name: string) => string;
}

/**
 * Compile a template string to a gxt-compatible template factory.
 * Delegates to compile.ts which uses the GXT runtime compiler for proper
 * component invocation (e.g., <XBlah /> → $_c('x-blah', ...)).
 */
import { compileTemplate } from './compile';
export const compile = compileTemplate;

/**
 * Precompile a template string (returns serialized form)
 */
export function precompile(
  templateString: string,
  options: Partial<EmberPrecompileOptions> = {}
): string {
  // For gxt, we return a marker that indicates this needs runtime compilation
  return JSON.stringify({
    __gxtTemplate: true,
    source: templateString,
    moduleName: options.moduleName,
  });
}

// Re-export compileOptions for compatibility
export function compileOptions(options: Partial<EmberPrecompileOptions> = {}) {
  return options;
}

export function buildCompileOptions(options: any) {
  return options;
}

export function transformsFor() {
  return [];
}

// Export VERSION for compatibility
export const VERSION = '5.0.0-gxt';

// Export GlimmerSyntax placeholder
export const _GlimmerSyntax = {
  preprocess(template: string) {
    return { body: parseElements(template) };
  },
  traverse() {},
  print(ast: any) {
    return '';
  },
};

export const _preprocess = _GlimmerSyntax.preprocess;
export const _print = _GlimmerSyntax.print;
export const _precompile = precompile;

// Default export
export default { compile, precompile, VERSION };
