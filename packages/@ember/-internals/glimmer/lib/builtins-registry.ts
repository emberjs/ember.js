import type { HelperDefinitionState, ModifierDefinitionState } from '@glimmer/interfaces';

/**
 * The helpers and modifiers a template can reach by name. Empty until
 * `ensureBuiltins()` in `./builtins` fills it. Only code paths that
 * resolve by name (loose mode templates, JSON blocks, the classic
 * renderer) call that, so a strict app never loads the helpers behind it.
 */
export const BUILTIN_KEYWORD_HELPERS: Record<string, object> = {};
export const BUILTIN_HELPERS: Record<string, object> = {};
export const BUILTIN_KEYWORD_MODIFIERS: Record<string, ModifierDefinitionState> = {};
export const BUILTIN_MODIFIERS: Record<string, object> = {};

export type { HelperDefinitionState };
