import { DEBUG } from '@glimmer/env';
import {
  CompileTimeResolver,
  ContainingMetadata,
  Expressions,
  Owner,
  ResolveComponentOp,
  ResolveComponentOrHelperOp,
  ResolveHelperOp,
  ResolveModifierOp,
  ResolveOptionalComponentOrHelperOp,
  ResolveOptionalHelperOp,
  SexpOpcodes,
} from '@glimmer/interfaces';
import { assert } from '@glimmer/util';

function isGetLikeTuple(opcode: Expressions.Expression): opcode is Expressions.TupleExpression {
  return Array.isArray(opcode) && opcode.length === 2;
}

function makeTypeVerifier(typeToVerify: SexpOpcodes) {
  return (opcode: Expressions.Expression): opcode is Expressions.GetFree => {
    if (!isGetLikeTuple(opcode)) return false;

    let type = opcode[0];

    if (DEBUG && type === SexpOpcodes.GetStrictFree) {
      throw new Error('Attempted to resolve strict free, but this has not been implemented yet');
    }

    return type === SexpOpcodes.GetStrictFree || type === typeToVerify;
  };
}

export const isGetFreeComponent = makeTypeVerifier(SexpOpcodes.GetFreeAsComponentHead);

export const isGetFreeModifier = makeTypeVerifier(SexpOpcodes.GetFreeAsModifierHead);

export const isGetFreeHelper = makeTypeVerifier(SexpOpcodes.GetFreeAsHelperHead);

export const isGetFreeComponentOrHelper = makeTypeVerifier(
  SexpOpcodes.GetFreeAsComponentOrHelperHead
);

export const isGetFreeOptionalHelper = makeTypeVerifier(
  SexpOpcodes.GetFreeAsHelperHeadOrThisFallback
);

export const isGetFreeOptionalComponentOrHelper = makeTypeVerifier(
  SexpOpcodes.GetFreeAsComponentOrHelperHeadOrThisFallback
);

interface RequiredContainingMetadata extends ContainingMetadata {
  owner: Owner;
  upvars: string[];
}

function assertResolverInvariants(meta: ContainingMetadata): RequiredContainingMetadata {
  if (DEBUG) {
    if (!meta.upvars) {
      throw new Error('Attempted to resolve a component, but no free vars were found');
    }

    if (!meta.owner) {
      throw new Error(
        'Attempted to resolve a component, but no owner was associated with the template it was being resolved from'
      );
    }
  }

  return (meta as unknown) as RequiredContainingMetadata;
}

export function resolveComponent(
  resolver: CompileTimeResolver,
  meta: ContainingMetadata,
  [, expr, then]: ResolveComponentOp
): void {
  assert(isGetFreeComponent(expr), 'Attempted to resolve a component with incorrect opcode');
  let { upvars, owner } = assertResolverInvariants(meta);

  let name = upvars![expr[1]];
  let value = resolver.lookupComponent(name, owner!);

  if (DEBUG && value === null) {
    throw new Error(
      `Attempted to resolve ${name}, which was expected to be a component, but nothing was found.`
    );
  }

  then(value!);
}

export function resolveHelper(
  resolver: CompileTimeResolver,
  meta: ContainingMetadata,
  [, expr, then]: ResolveHelperOp
): void {
  assert(isGetFreeHelper(expr), 'Attempted to resolve a helper with incorrect opcode');
  let { upvars, owner } = assertResolverInvariants(meta);

  let name = upvars[expr[1]];
  let value = resolver.lookupHelper(name, owner);

  if (DEBUG && value === null) {
    throw new Error(
      `Attempted to resolve ${name}, which was expected to be a component, but nothing was found.`
    );
  }

  then(value!);
}

export function resolveModifier(
  resolver: CompileTimeResolver,
  meta: ContainingMetadata,
  [, expr, then]: ResolveModifierOp
): void {
  assert(isGetFreeModifier(expr), 'Attempted to resolve a modifier with incorrect opcode');
  let { upvars, owner } = assertResolverInvariants(meta);

  let name = upvars[expr[1]];
  let value = resolver.lookupModifier(name, owner);

  if (DEBUG && value === null) {
    throw new Error(
      `Attempted to resolve ${name}, which was expected to be a component, but nothing was found.`
    );
  }

  then(value!);
}

export function resolveComponentOrHelper(
  resolver: CompileTimeResolver,
  meta: ContainingMetadata,
  [, expr, then]: ResolveComponentOrHelperOp
): void {
  assert(
    isGetFreeComponentOrHelper(expr),
    'Attempted to resolve a component or helper with incorrect opcode'
  );
  let { upvars, owner } = assertResolverInvariants(meta);

  let name = upvars[expr[1]];
  let value = resolver.lookupComponent(name, owner) || resolver.lookupHelper(name, owner);

  if (DEBUG && value === null) {
    throw new Error(
      `Attempted to resolve ${name}, which was expected to be a component or helper, but nothing was found.`
    );
  }

  then(value!);
}

export function resolveOptionalHelper(
  resolver: CompileTimeResolver,
  meta: ContainingMetadata,
  [, expr, then]: ResolveOptionalHelperOp
): void {
  assert(isGetFreeOptionalHelper(expr), 'Attempted to resolve a helper with incorrect opcode');
  let { upvars, owner } = assertResolverInvariants(meta);

  let name = upvars[expr[1]];
  let value = resolver.lookupHelper(name, owner);

  then(value || name);
}

export function resolveOptionalComponentOrHelper(
  resolver: CompileTimeResolver,
  meta: ContainingMetadata,
  [, expr, then]: ResolveOptionalComponentOrHelperOp
): void {
  assert(
    isGetFreeOptionalComponentOrHelper(expr),
    'Attempted to resolve an optional component or helper with incorrect opcode'
  );
  let { upvars, owner } = assertResolverInvariants(meta);

  let name = upvars[expr[1]];
  let value = resolver.lookupComponent(name, owner) || resolver.lookupHelper(name, owner);

  then(value || name);
}
