import type {
  CompileTimeConstants,
  CompileTimeResolver,
  ContainingMetadata,
  Expressions,
  Owner,
  ResolutionTimeConstants,
  ResolveComponentOp,
  ResolveComponentOrHelperOp,
  ResolveHelperOp,
  ResolveModifierOp,
  ResolveOptionalComponentOrHelperOp,
  SexpOpcode,
} from '@glimmer/interfaces';
import { assert, debugToString, expect, unwrap } from '@glimmer/util';
import { SexpOpcodes } from '@glimmer/wire-format';

function isGetLikeTuple(opcode: Expressions.Expression): opcode is Expressions.TupleExpression {
  return Array.isArray(opcode) && opcode.length === 2;
}

function makeResolutionTypeVerifier(typeToVerify: SexpOpcode) {
  return (
    opcode: Expressions.Expression
  ): opcode is Expressions.GetFree | Expressions.GetLexicalSymbol => {
    if (!isGetLikeTuple(opcode)) return false;

    let type = opcode[0];

    return (
      type === SexpOpcodes.GetStrictKeyword ||
      type === SexpOpcodes.GetLexicalSymbol ||
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

interface ResolvedContainingMetadata extends ContainingMetadata {
  owner: Owner;
  upvars: string[];
}

function assertResolverInvariants(meta: ContainingMetadata): ResolvedContainingMetadata {
  if (import.meta.env.DEV) {
    if (!meta.upvars) {
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

  return meta as unknown as ResolvedContainingMetadata;
}

/**
 * <Foo/>
 * <Foo></Foo>
 * <Foo @arg={{true}} />
 */
export function resolveComponent(
  resolver: CompileTimeResolver,
  constants: CompileTimeConstants & ResolutionTimeConstants,
  meta: ContainingMetadata,
  [, expr, then]: ResolveComponentOp
): void {
  assert(isGetFreeComponent(expr), 'Attempted to resolve a component with incorrect opcode');

  let type = expr[0];

  if (import.meta.env.DEV && expr[0] === SexpOpcodes.GetStrictKeyword) {
    assert(!meta.isStrictMode, 'Strict mode errors should already be handled at compile time');

    throw new Error(
      `Attempted to resolve a component in a strict mode template, but that value was not in scope: ${
        meta.upvars![expr[1]] ?? '{unknown variable}'
      }`
    );
  }

  if (type === SexpOpcodes.GetLexicalSymbol) {
    let { scopeValues, owner, debugSymbols } = meta;
    let definition = expect(scopeValues, 'BUG: scopeValues must exist if template symbol is used')[
      expr[1]
    ];

    then(
      constants.component(
        definition as object,
        expect(owner, 'BUG: expected owner when resolving component definition'),
        false,
        debugSymbols?.at(expr[1])
      )
    );
  } else {
    let { upvars, owner } = assertResolverInvariants(meta);

    let name = unwrap(upvars[expr[1]]);
    let definition = resolver.lookupComponent(name, owner)!;

    if (import.meta.env.DEV && (typeof definition !== 'object' || definition === null)) {
      assert(!meta.isStrictMode, 'Strict mode errors should already be handled at compile time');

      throw new Error(
        `Attempted to resolve \`${name}\`, which was expected to be a component, but nothing was found.`
      );
    }

    then(constants.resolvedComponent(definition, name));
  }
}

/**
 * (helper)
 * (helper arg)
 */
export function resolveHelper(
  resolver: CompileTimeResolver,
  constants: CompileTimeConstants & ResolutionTimeConstants,
  meta: ContainingMetadata,
  [, expr, then]: ResolveHelperOp
): void {
  assert(isGetFreeHelper(expr), 'Attempted to resolve a helper with incorrect opcode');

  let type = expr[0];

  if (type === SexpOpcodes.GetLexicalSymbol) {
    let { scopeValues } = meta;
    let definition = expect(scopeValues, 'BUG: scopeValues must exist if template symbol is used')[
      expr[1]
    ];

    then(constants.helper(definition as object));
  } else if (type === SexpOpcodes.GetStrictKeyword) {
    then(
      lookupBuiltInHelper(expr as Expressions.GetStrictFree, resolver, meta, constants, 'helper')
    );
  } else {
    let { upvars, owner } = assertResolverInvariants(meta);

    let name = unwrap(upvars[expr[1]]);
    let helper = resolver.lookupHelper(name, owner)!;

    if (import.meta.env.DEV && helper === null) {
      assert(!meta.isStrictMode, 'Strict mode errors should already be handled at compile time');

      throw new Error(
        `Attempted to resolve \`${name}\`, which was expected to be a helper, but nothing was found.`
      );
    }

    then(constants.helper(helper, name));
  }
}

/**
 * <div {{modifier}}/>
 * <div {{modifier arg}}/>
 * <Foo {{modifier}}/>
 */
export function resolveModifier(
  resolver: CompileTimeResolver,
  constants: CompileTimeConstants & ResolutionTimeConstants,
  meta: ContainingMetadata,
  [, expr, then]: ResolveModifierOp
): void {
  assert(isGetFreeModifier(expr), 'Attempted to resolve a modifier with incorrect opcode');

  let type = expr[0];

  if (type === SexpOpcodes.GetLexicalSymbol) {
    let { scopeValues, debugSymbols } = meta;
    let definition = expect(scopeValues, 'BUG: scopeValues must exist if template symbol is used')[
      expr[1]
    ];

    then(constants.modifier(definition as object, debugSymbols?.at(expr[1]) ?? undefined));
  } else if (type === SexpOpcodes.GetStrictKeyword) {
    let { upvars } = assertResolverInvariants(meta);
    let name = unwrap(upvars[expr[1]]);
    let modifier = resolver.lookupBuiltInModifier(name);

    if (import.meta.env.DEV && modifier === null) {
      assert(!meta.isStrictMode, 'Strict mode errors should already be handled at compile time');

      throw new Error(
        `Attempted to resolve a modifier in a strict mode template, but it was not in scope: ${name}`
      );
    }

    then(constants.modifier(modifier!, name));
  } else {
    let { upvars, owner } = assertResolverInvariants(meta);
    let name = unwrap(upvars[expr[1]]);
    let modifier = resolver.lookupModifier(name, owner)!;

    if (import.meta.env.DEV && modifier === null) {
      assert(!meta.isStrictMode, 'Strict mode errors should already be handled at compile time');

      throw new Error(
        `Attempted to resolve \`${name}\`, which was expected to be a modifier, but nothing was found.`
      );
    }

    then(constants.modifier(modifier));
  }
}

/**
 * {{component-or-helper arg}}
 */
export function resolveComponentOrHelper(
  resolver: CompileTimeResolver,
  constants: CompileTimeConstants & ResolutionTimeConstants,
  meta: ContainingMetadata,
  [, expr, { ifComponent, ifHelper }]: ResolveComponentOrHelperOp
): void {
  assert(
    isGetFreeComponentOrHelper(expr),
    'Attempted to resolve a component or helper with incorrect opcode'
  );

  let type = expr[0];

  if (type === SexpOpcodes.GetLexicalSymbol) {
    let { scopeValues, owner, debugSymbols } = meta;
    let definition = expect(scopeValues, 'BUG: scopeValues must exist if template symbol is used')[
      expr[1]
    ];

    let component = constants.component(
      definition as object,
      expect(owner, 'BUG: expected owner when resolving component definition'),
      true,
      debugSymbols?.at(expr[1])
    );

    if (component !== null) {
      ifComponent(component);
      return;
    }

    let helper = constants.helper(definition as object, null, true);

    if (import.meta.env.DEV && helper === null) {
      assert(!meta.isStrictMode, 'Strict mode errors should already be handled at compile time');

      throw new Error(
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
    let { upvars, owner } = assertResolverInvariants(meta);

    let name = unwrap(upvars[expr[1]]);
    let definition = resolver.lookupComponent(name, owner);

    if (definition !== null) {
      ifComponent(constants.resolvedComponent(definition, name));
    } else {
      let helper = resolver.lookupHelper(name, owner);

      if (import.meta.env.DEV && helper === null) {
        assert(!meta.isStrictMode, 'Strict mode errors should already be handled at compile time');

        throw new Error(
          `Attempted to resolve \`${name}\`, which was expected to be a component or helper, but nothing was found.`
        );
      }

      ifHelper(constants.helper(helper!, name));
    }
  }
}

/**
 * {{maybeHelperOrComponent}}
 */
export function resolveOptionalComponentOrHelper(
  resolver: CompileTimeResolver,
  constants: CompileTimeConstants & ResolutionTimeConstants,
  meta: ContainingMetadata,
  [, expr, { ifComponent, ifHelper, ifValue }]: ResolveOptionalComponentOrHelperOp
): void {
  assert(
    isGetFreeComponentOrHelper(expr),
    'Attempted to resolve an optional component or helper with incorrect opcode'
  );

  let type = expr[0];

  if (type === SexpOpcodes.GetLexicalSymbol) {
    let { scopeValues, owner, debugSymbols } = meta;
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
      debugSymbols?.at(expr[1])
    );

    if (component !== null) {
      ifComponent(component);
      return;
    }

    let helper = constants.helper(definition, null, true);

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
    let { upvars, owner } = assertResolverInvariants(meta);

    let name = unwrap(upvars[expr[1]]);
    let definition = resolver.lookupComponent(name, owner);

    if (definition !== null) {
      ifComponent(constants.resolvedComponent(definition, name));
      return;
    }

    let helper = resolver.lookupHelper(name, owner);

    if (helper !== null) {
      ifHelper(constants.helper(helper, name));
    }
  }
}

function lookupBuiltInHelper(
  expr: Expressions.GetStrictFree,
  resolver: CompileTimeResolver,
  meta: ContainingMetadata,
  constants: ResolutionTimeConstants,
  type: string
): number {
  let { upvars } = assertResolverInvariants(meta);

  let name = unwrap(upvars[expr[1]]);
  let helper = resolver.lookupBuiltInHelper(name);

  if (import.meta.env.DEV && helper === null) {
    assert(!meta.isStrictMode, 'Strict mode errors should already be handled at compile time');

    // Keyword helper did not exist, which means that we're attempting to use a
    // value of some kind that is not in scope
    throw new Error(
      `Attempted to resolve a ${type} in a strict mode template, but that value was not in scope: ${
        meta.upvars![expr[1]] ?? '{unknown variable}'
      }`
    );
  }

  return constants.helper(helper!, name);
}
