import { DEBUG } from '@glimmer/env';
import {
  helperHandle,
  modifierHandle,
  resolvedComponentDefinition,
} from '@glimmer/program/lib/definitions';
import type {
  BlockMetadata,
  BlockSymbolNames,
  ClassicResolver,
  Expressions,
  Nullable,
  Owner,
  ProgramConstants,
  ResolutionHandler,
  ResolveComponentOp,
  ResolveComponentOrHelperOp,
  ResolveHelperOp,
  ResolveModifierOp,
  ResolveOptionalComponentOrHelperOp,
  SexpOpcode,
} from '@glimmer/interfaces';
import debugToString from '@glimmer/debug-util/lib/debug-to-string';
import { expect, unwrap } from '@glimmer/debug-util/lib/platform-utils';
import assert from '@glimmer/debug-util/lib/assert';
import { opcodes as SexpOpcodes } from '@glimmer/wire-format/lib/opcodes';

import { headId } from '../../syntax/compilers';

function isGetLikeTuple(opcode: Expressions.Expression): opcode is Expressions.TupleExpression {
  return Array.isArray(opcode) && opcode.length === 2;
}

let lexicalScopeAtRuntime = false;

/**
 * Ahead-of-time compilation has no lexical scope values, so a component,
 * helper, or modifier from lexical scope resolves at runtime the way a
 * dynamic value does. The compiler in the browser resolves it while
 * compiling, which saves a dispatch per render.
 */
export function withLexicalScopeAtRuntime<T>(fn: () => T): T {
  let previous = lexicalScopeAtRuntime;
  lexicalScopeAtRuntime = true;

  try {
    return fn();
  } finally {
    lexicalScopeAtRuntime = previous;
  }
}

function makeResolutionTypeVerifier(typeToVerify: SexpOpcode) {
  return (
    opcode: Expressions.Expression
  ): opcode is Expressions.GetFree | Expressions.GetLexicalSymbol => {
    if (!isGetLikeTuple(opcode)) return false;

    let type = headId(opcode);

    return (
      type === SexpOpcodes.GetStrictKeyword ||
      (type === SexpOpcodes.GetLexicalSymbol && !lexicalScopeAtRuntime) ||
      type === typeToVerify
    );
  };
}

export const isGetFreeComponent = makeResolutionTypeVerifier(SexpOpcodes.GetFreeAsComponentHead);

export const isGetFreeModifier = makeResolutionTypeVerifier(SexpOpcodes.GetFreeAsModifierHead);

export const isGetFreeHelper = makeResolutionTypeVerifier(SexpOpcodes.GetFreeAsHelperHead);

export const isGetFreeComponentOrHelper = makeResolutionTypeVerifier(
  SexpOpcodes.GetFreeAsComponentOrHelperHead
);

interface ResolvedBlockMetadata extends BlockMetadata {
  owner: Owner;
  symbols: BlockSymbolNames & {
    upvars: string[];
  };
}

function assertResolverInvariants(meta: BlockMetadata): ResolvedBlockMetadata {
  if (DEBUG) {
    if (!meta.symbols.upvars) {
      throw new Error(
        'Attempted to resolve a component, helper, or modifier, but no free vars were found'
      );
    }

    if (!meta.owner) {
      throw new Error(
        'Attempted to resolve a component, helper, or modifier, but no owner was associated with the template it was being resolved from'
      );
    }
  }

  return meta as unknown as ResolvedBlockMetadata;
}

/**
 * <Foo/>
 * <Foo></Foo>
 * <Foo @arg={{true}} />
 */
export function resolveComponent(
  resolver: Nullable<ClassicResolver>,
  constants: ProgramConstants,
  meta: BlockMetadata,
  [, expr, then]: ResolveComponentOp
): void {
  assert(isGetFreeComponent(expr), 'Attempted to resolve a component with incorrect opcode');

  let type = headId(expr);

  if (DEBUG && headId(expr) === SexpOpcodes.GetStrictKeyword) {
    assert(!meta.isStrictMode, 'Strict mode errors should already be handled at compile time');

    throw new Error(
      `Attempted to resolve a component in a strict mode template, but that value was not in scope: ${
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- @fixme
        meta.symbols.upvars![expr[1]] ?? '{unknown variable}'
      }`
    );
  }

  if (type === SexpOpcodes.GetLexicalSymbol) {
    let {
      scopeValues,
      owner,
      symbols: { lexical },
    } = meta;
    let definition = expect(scopeValues, 'BUG: scopeValues must exist if template symbol is used')[
      expr[1]
    ];

    then(
      constants.component(
        definition as object,
        expect(owner, 'BUG: expected owner when resolving component definition'),
        false,
        lexical?.at(expr[1])
      )
    );
  } else {
    let {
      symbols: { upvars },
      owner,
    } = assertResolverInvariants(meta);

    let name = unwrap(upvars[expr[1]]);
    let definition = resolver?.lookupComponent?.(name, owner) ?? null;

    if (DEBUG && (typeof definition !== 'object' || definition === null)) {
      assert(!meta.isStrictMode, 'Strict mode errors should already be handled at compile time');

      throw new Error(
        `Attempted to resolve \`${name}\`, which was expected to be a component, but nothing was found.`
      );
    }

    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- @fixme
    then(resolvedComponentDefinition(constants, definition!, name));
  }
}

/**
 * (helper)
 * (helper arg)
 */
export function resolveHelper(
  resolver: Nullable<ClassicResolver>,
  constants: ProgramConstants,
  meta: BlockMetadata,
  [, expr, then]: ResolveHelperOp
): void {
  assert(isGetFreeHelper(expr), 'Attempted to resolve a helper with incorrect opcode');

  let type = headId(expr);

  if (type === SexpOpcodes.GetLexicalSymbol) {
    let { scopeValues } = meta;
    let definition = expect(scopeValues, 'BUG: scopeValues must exist if template symbol is used')[
      expr[1]
    ];

    then(helperHandle(constants, definition as object));
  } else if (type === SexpOpcodes.GetStrictKeyword) {
    then(
      lookupBuiltInHelper(expr as Expressions.GetStrictFree, resolver, meta, constants, 'helper')
    );
  } else {
    let {
      symbols: { upvars },
      owner,
    } = assertResolverInvariants(meta);

    let name = unwrap(upvars[expr[1]]);
    let helper = resolver?.lookupHelper?.(name, owner) ?? null;

    if (DEBUG && helper === null) {
      assert(!meta.isStrictMode, 'Strict mode errors should already be handled at compile time');

      throw new Error(
        `Attempted to resolve \`${name}\`, which was expected to be a helper, but nothing was found.`
      );
    }

    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- @fixme
    then(helperHandle(constants, helper!, name));
  }
}

/**
 * <div {{modifier}}/>
 * <div {{modifier arg}}/>
 * <Foo {{modifier}}/>
 */
export function resolveModifier(
  resolver: Nullable<ClassicResolver>,
  constants: ProgramConstants,
  meta: BlockMetadata,
  [, expr, then]: ResolveModifierOp
): void {
  assert(isGetFreeModifier(expr), 'Attempted to resolve a modifier with incorrect opcode');

  let type = headId(expr);

  if (type === SexpOpcodes.GetLexicalSymbol) {
    let {
      scopeValues,
      symbols: { lexical },
    } = meta;
    let definition = expect(scopeValues, 'BUG: scopeValues must exist if template symbol is used')[
      expr[1]
    ];

    then(modifierHandle(constants, definition as object, lexical?.at(expr[1]) ?? undefined));
  } else if (type === SexpOpcodes.GetStrictKeyword) {
    let {
      symbols: { upvars },
    } = assertResolverInvariants(meta);
    let name = unwrap(upvars[expr[1]]);
    let modifier = resolver?.lookupBuiltInModifier?.(name) ?? null;

    if (DEBUG && modifier === null) {
      assert(!meta.isStrictMode, 'Strict mode errors should already be handled at compile time');

      throw new Error(
        `Attempted to resolve a modifier in a strict mode template, but it was not in scope: ${name}`
      );
    }

    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- @fixme
    then(modifierHandle(constants, modifier!, name));
  } else {
    let {
      symbols: { upvars },
      owner,
    } = assertResolverInvariants(meta);
    let name = unwrap(upvars[expr[1]]);
    let modifier = resolver?.lookupModifier?.(name, owner) ?? null;

    if (DEBUG && modifier === null) {
      assert(!meta.isStrictMode, 'Strict mode errors should already be handled at compile time');

      throw new Error(
        `Attempted to resolve \`${name}\`, which was expected to be a modifier, but nothing was found.`
      );
    }

    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- @fixme
    then(modifierHandle(constants, modifier!));
  }
}

/**
 * {{component-or-helper arg}}
 */
export function resolveComponentOrHelper(
  resolver: Nullable<ClassicResolver>,
  constants: ProgramConstants,
  meta: BlockMetadata,
  [, expr, { ifComponent, ifHelper }]: ResolveComponentOrHelperOp
): void {
  assert(
    isGetFreeComponentOrHelper(expr),
    'Attempted to resolve a component or helper with incorrect opcode'
  );

  let type = headId(expr);

  if (type === SexpOpcodes.GetLexicalSymbol) {
    let {
      scopeValues,
      owner,
      symbols: { lexical },
    } = meta;
    let definition = expect(scopeValues, 'BUG: scopeValues must exist if template symbol is used')[
      expr[1]
    ];

    let component = constants.component(
      definition as object,
      expect(owner, 'BUG: expected owner when resolving component definition'),
      true,
      lexical?.at(expr[1])
    );

    if (component !== null) {
      ifComponent(component);
      return;
    }

    let helper = helperHandle(constants, definition as object, null, true);

    if (DEBUG && helper === null) {
      assert(!meta.isStrictMode, 'Strict mode errors should already be handled at compile time');

      throw new Error(
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- @fixme
        `Attempted to use a value as either a component or helper, but it did not have a component manager or helper manager associated with it. The value was: ${debugToString!(
          definition
        )}`
      );
    }

    ifHelper(expect(helper, 'BUG: helper must exist'));
  } else if (type === SexpOpcodes.GetStrictKeyword) {
    ifHelper(
      lookupBuiltInHelper(
        expr as Expressions.GetStrictFree,
        resolver,
        meta,
        constants,
        'component or helper'
      )
    );
  } else {
    let {
      symbols: { upvars },
      owner,
    } = assertResolverInvariants(meta);

    let name = unwrap(upvars[expr[1]]);
    let definition = resolver?.lookupComponent?.(name, owner) ?? null;

    if (definition !== null) {
      ifComponent(resolvedComponentDefinition(constants, definition, name));
    } else {
      let helper = resolver?.lookupHelper?.(name, owner) ?? null;

      if (DEBUG && helper === null) {
        assert(!meta.isStrictMode, 'Strict mode errors should already be handled at compile time');

        throw new Error(
          `Attempted to resolve \`${name}\`, which was expected to be a component or helper, but nothing was found.`
        );
      }

      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- @fixme
      ifHelper(helperHandle(constants, helper!, name));
    }
  }
}

/**
 * {{maybeHelperOrComponent}}
 */
export function resolveOptionalComponentOrHelper(
  resolver: Nullable<ClassicResolver>,
  constants: ProgramConstants,
  meta: BlockMetadata,
  [, expr, { ifComponent, ifHelper, ifValue }]: ResolveOptionalComponentOrHelperOp
): void {
  assert(
    isGetFreeComponentOrHelper(expr),
    'Attempted to resolve an optional component or helper with incorrect opcode'
  );

  let type = headId(expr);

  if (type === SexpOpcodes.GetLexicalSymbol) {
    let {
      scopeValues,
      owner,
      symbols: { lexical },
    } = meta;
    let definition = expect(scopeValues, 'BUG: scopeValues must exist if template symbol is used')[
      expr[1]
    ];

    if (
      typeof definition !== 'function' &&
      (typeof definition !== 'object' || definition === null)
    ) {
      // The value is not an object, so it can't be a component or helper.
      ifValue(constants.value(definition));
      return;
    }

    let component = constants.component(
      definition,
      expect(owner, 'BUG: expected owner when resolving component definition'),
      true,
      lexical?.at(expr[1])
    );

    if (component !== null) {
      ifComponent(component);
      return;
    }

    let helper = helperHandle(constants, definition, null, true);

    if (helper !== null) {
      ifHelper(helper);
      return;
    }

    ifValue(constants.value(definition));
  } else if (type === SexpOpcodes.GetStrictKeyword) {
    ifHelper(
      lookupBuiltInHelper(expr as Expressions.GetStrictFree, resolver, meta, constants, 'value')
    );
  } else {
    let {
      symbols: { upvars },
      owner,
    } = assertResolverInvariants(meta);

    let name = unwrap(upvars[expr[1]]);
    let definition = resolver?.lookupComponent?.(name, owner) ?? null;

    if (definition !== null) {
      ifComponent(resolvedComponentDefinition(constants, definition, name));
      return;
    }

    let helper = resolver?.lookupHelper?.(name, owner) ?? null;

    if (helper !== null) {
      ifHelper(helperHandle(constants, helper, name));
    }
  }
}

function lookupBuiltInHelper(
  expr: Expressions.GetStrictFree,
  resolver: Nullable<ClassicResolver>,
  meta: BlockMetadata,
  constants: ProgramConstants,
  type: string
): number {
  let {
    symbols: { upvars },
  } = assertResolverInvariants(meta);

  let name = unwrap(upvars[expr[1]]);
  let helper = resolver?.lookupBuiltInHelper?.(name) ?? null;

  if (DEBUG && helper === null) {
    assert(!meta.isStrictMode, 'Strict mode errors should already be handled at compile time');

    // Keyword helper did not exist, which means that we're attempting to use a
    // value of some kind that is not in scope
    throw new Error(
      `Attempted to resolve a ${type} in a strict mode template, but that value was not in scope: ${
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- @fixme
        meta.symbols.upvars![expr[1]] ?? '{unknown variable}'
      }`
    );
  }

  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- @fixme
  return helperHandle(constants, helper!, name);
}

export const ResolveComponent: ResolutionHandler<ResolveComponentOp> = {
  resolve: resolveComponent,
};
export const ResolveHelper: ResolutionHandler<ResolveHelperOp> = { resolve: resolveHelper };
export const ResolveModifier: ResolutionHandler<ResolveModifierOp> = { resolve: resolveModifier };
export const ResolveComponentOrHelper: ResolutionHandler<ResolveComponentOrHelperOp> = {
  resolve: resolveComponentOrHelper,
};
export const ResolveOptionalComponentOrHelper: ResolutionHandler<ResolveOptionalComponentOrHelperOp> =
  { resolve: resolveOptionalComponentOrHelper };
