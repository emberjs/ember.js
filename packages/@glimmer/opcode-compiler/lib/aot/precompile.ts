import type { BlockMetadata, Nullable } from '@glimmer/interfaces';
import type { PrecompiledModule, PrecompileOptions } from '@glimmer/compiler/lib/compiler';
import type { LexicalKeyword, OpImport } from '@glimmer/compiler/lib/wire-format-module';
import { defaultId, precompileJSON } from '@glimmer/compiler/lib/compiler';
import { bindStrictKeywords } from '@glimmer/compiler/lib/wire-format-keywords';

import { printBlock, TEMPLATE_MODULE } from './print';
import { aotRef, type RecordedProgram, RecordingConstants, recordStatements } from './record';

export interface PrecompileAotOptions extends PrecompileOptions {
  lexicalScope?: (variable: string) => boolean;
  /** Strict keywords to bind to imports instead of a runtime resolver. */
  lexicalKeywords?: Record<string, LexicalKeyword>;
  /** The template factory the build tool wraps the expression in. */
  factory?: LexicalKeyword;
}

function lit(value: unknown): string {
  return value === undefined ? 'undefined' : JSON.stringify(value);
}

/**
 * Compiles a strict template all the way to VM words. The output has the
 * same shape as `precompileModule`: a serialized template expression plus
 * the identifiers a build tool must bind to imports. The `block` holds
 * words instead of wire format, and the loader reads lexical values from
 * `scope` by position, the way the browser compiler does.
 */
export function precompileAot(source: string, options: PrecompileAotOptions): PrecompiledModule {
  let [json, usedLocals] = precompileJSON(source, options);

  if (!options.strictMode) {
    throw new Error('precompileAot compiles strict mode templates only');
  }

  let { block, slots } = bindStrictKeywords(json, options.lexicalKeywords ?? {}, usedLocals.length);
  let [statements, locals, upvars] = block;

  let imports: OpImport[] = [];
  let seen = new Set<string>();

  function bind(local: string, module: string, name: string): string {
    if (!seen.has(local)) {
      seen.add(local);
      imports.push({ local, module, name, id: -1 });
    }

    return local;
  }

  let scopeEntries = usedLocals.map((name) => (name === 'this' ? `"this":this` : name));
  let scopeValues: unknown[] = usedLocals.map((_, index) => aotRef({ index }));

  for (const slot of slots) {
    let local = bind(
      `__kw_${slot.name.replace(/[^A-Za-z0-9_$]/g, '_')}`,
      slot.keyword.module,
      slot.keyword.name
    );
    scopeEntries.push(`${lit(slot.name)}:${local}`);
    scopeValues.push(aotRef({ index: scopeValues.length }));
  }

  let moduleName = options.meta?.moduleName;
  let meta: BlockMetadata = {
    symbols: {
      locals,
      upvars,
      lexical: [...usedLocals, ...slots.map((slot) => slot.name)],
    },
    scopeValues,
    isStrictMode: true,
    moduleName,
    owner: null,
    size: locals.length,
  };

  let constants = new RecordingConstants();
  let programs: RecordedProgram[] = [];
  recordStatements(statements, locals.length, { meta, constants, programs });

  let idFn = options.id || defaultId;
  let id: Nullable<string> = idFn(JSON.stringify(options.meta) + JSON.stringify(json));

  let fields = [
    `id:${lit(id)}`,
    `block:${printBlock(locals, constants.entries, programs, bind)}`,
    `moduleName:${lit(moduleName ?? '(unknown template module)')}`,
    `isStrictMode:true`,
  ];

  if (scopeEntries.length > 0) {
    fields.push(`scope:()=>({${scopeEntries.join(',')}})`);
  }

  return {
    imports,
    factory: options.factory ?? { module: TEMPLATE_MODULE, name: 'default' },
    expression: `{${fields.join(',')}}`,
  };
}
