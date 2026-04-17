/**
 * GXT-compatible ember-template-compiler replacement
 *
 * This module provides runtime template compilation that produces
 * gxt-compatible templates with $nodes structure.
 * Delegates to compile.ts which uses the GXT runtime compiler.
 */

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
 * component invocation (e.g., <XBlah /> -> $_c('x-blah', ...)).
 */
import { compileTemplate } from './compile';

// GXT's `IS_GLIMMER_COMPAT_MODE` BlockStatement handler emits a raw
// element tag (`<input>`, `<textarea>`) whenever the path name has no
// dash and no uppercase letter, because those are HTML-like names. That
// path silently drops the block children when the element is treated as
// self-closing (which `<input>` is). When `input` / `textarea` are shadowed
// by a local binding — scope value, lexical local, or block param — we
// rewrite the block-form invocation to a PascalCase alias so GXT's
// component path picks it up, and we mirror the alias into scope / locals
// so the binding resolves to the original value.
const GXT_LOWERED_KEYWORDS_MAP: Record<string, string> = {
  input: 'GxtShadowedInputBinding',
  textarea: 'GxtShadowedTextareaBinding',
};

function collectTemplateBlockParamNames(template: string): Set<string> {
  const names = new Set<string>();
  const re = /\sas\s*\|([^|]+)\|/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(template)) !== null) {
    const group = m[1];
    if (!group) continue;
    for (const raw of group.trim().split(/\s+/)) {
      if (raw) names.add(raw);
    }
  }
  return names;
}

function rewriteShadowedBlockInvocation(
  template: string,
  name: string,
  alias: string
): { source: string; changed: boolean } {
  if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(name)) {
    return { source: template, changed: false };
  }
  const open = new RegExp(`\\{\\{#(${name})(\\s[^}]*)?\\}\\}`, 'g');
  const close = new RegExp(`\\{\\{/${name}\\}\\}`, 'g');
  if (!open.test(template) || !close.test(template)) {
    return { source: template, changed: false };
  }
  open.lastIndex = 0;
  close.lastIndex = 0;
  // Rewrite to angle-bracket form using a PascalCase alias. GXT compiles
  // `<Alias>body</Alias>` with the alias as a local binding to
  // `$_c(alias, args, slots)`, which correctly threads the default block
  // through to the invoked component's `{{yield}}`. The block-form curly
  // invocation `{{#NAME}}body{{/NAME}}` otherwise lowers to an HTML
  // element tag (`<input>body</input>`) that drops its children.
  let out = template.replace(open, (_match, _n: string, extra?: string) => {
    // `extra` captures any hash args / positional params after the name.
    // Angle-bracket syntax uses them verbatim; GXT's hash-pair parser
    // supports `key=value` and bare `{{value}}` in this context.
    return `<${alias}${extra ?? ''}>`;
  });
  out = out.replace(close, `</${alias}>`);
  return { source: out, changed: true };
}

/**
 * Clone `{{#let EXPR as |NAME|}}` as `{{#let EXPR EXPR as |NAME ALIAS|}}`
 * so that references to ALIAS resolve to the same value as NAME. Only
 * touches `{{#let}}` forms that declare a single block param equal to
 * NAME; multi-param forms are left alone.
 */
function teeLetBlockParam(template: string, name: string, alias: string): string {
  const re = new RegExp(
    `\\{\\{#let\\s+([^}]*?)\\s+as\\s*\\|\\s*${name}\\s*\\|\\}\\}`,
    'g'
  );
  return template.replace(re, (_m, prefix: string) => {
    return `{{#let ${prefix} ${prefix} as |${name} ${alias}|}}`;
  });
}

export function compile(templateString: string, options?: any) {
  const originalScopeValues: Record<string, unknown> | undefined =
    options?.scopeValues && typeof options.scopeValues === 'object'
      ? options.scopeValues
      : undefined;
  const templateBlockParams = collectTemplateBlockParamNames(templateString);

  let rewritten = templateString;
  let scopePatch: Record<string, unknown> | undefined;
  let localsPatch: string[] | undefined;

  for (const [name, alias] of Object.entries(GXT_LOWERED_KEYWORDS_MAP)) {
    const inScopeValues = !!(
      originalScopeValues && Object.prototype.hasOwnProperty.call(originalScopeValues, name)
    );
    const inLocals =
      Array.isArray(options?.locals) && (options.locals as string[]).includes(name);
    const inBlockParams = templateBlockParams.has(name);
    if (!inScopeValues && !inLocals && !inBlockParams) continue;

    const result = rewriteShadowedBlockInvocation(rewritten, name, alias);
    if (!result.changed) continue;
    rewritten = result.source;

    if (inBlockParams) {
      rewritten = teeLetBlockParam(rewritten, name, alias);
    }
    if (inScopeValues && originalScopeValues) {
      scopePatch = scopePatch || { ...originalScopeValues };
      scopePatch[alias] = originalScopeValues[name];
    }
    if (inLocals) {
      localsPatch = localsPatch || [...(options!.locals as string[])];
      if (!localsPatch.includes(alias)) localsPatch.push(alias);
    }
  }

  if (rewritten === templateString) {
    return compileTemplate(templateString, options);
  }

  const patchedOptions = {
    ...(options ?? {}),
    ...(scopePatch ? { scopeValues: scopePatch } : {}),
    ...(localsPatch ? { locals: localsPatch } : {}),
  };
  return compileTemplate(rewritten, patchedOptions);
}

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

// Minimal GlimmerSyntax placeholder (no-op implementations)
export const _GlimmerSyntax = {
  preprocess(_template: string) {
    return { body: [] };
  },
  traverse() {},
  print(_ast: any) {
    return '';
  },
};

export const _preprocess = _GlimmerSyntax.preprocess;
export const _print = _GlimmerSyntax.print;
export const _precompile = precompile;

// Default export
export default { compile, precompile, VERSION };
