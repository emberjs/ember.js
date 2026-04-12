/* tslint:disable */
/* eslint-disable */

/**
 * Parse a Glimmer/Handlebars template string and return an ASTv1 Template as JSON.
 *
 * Called from JavaScript via wasm-bindgen.
 */
export function parseTemplate(source: string, src_name?: string | null): any;

/**
 * Parse a Glimmer/Handlebars template string and return an ASTv1 Template as a JSON string.
 *
 * Useful for debugging or when the WASM <-> JS object bridge is problematic.
 */
export function parseTemplateToJson(source: string, src_name?: string | null): string;
