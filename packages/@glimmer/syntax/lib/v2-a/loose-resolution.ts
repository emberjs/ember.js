import * as ASTv1 from '../v1/api';
import * as ASTv2 from './api';

export interface AstCallParts {
  path: ASTv1.Expression;
  params: ASTv1.Expression[];
  hash: ASTv1.Hash;
}

export interface VarPath extends ASTv1.PathExpression {
  head: ASTv1.VarHead;
}

export function SexpSyntaxContext(node: ASTv1.SubExpression): ASTv2.FreeVarResolution | null {
  if (isSimpleCallee(node)) {
    return ASTv2.LooseModeResolution.namespaced(ASTv2.FreeVarNamespace.Helper);
  } else {
    return null;
  }
}

export function ModifierSyntaxContext(
  node: ASTv1.ElementModifierStatement
): ASTv2.FreeVarResolution | null {
  if (isSimpleCallee(node)) {
    return ASTv2.LooseModeResolution.namespaced(ASTv2.FreeVarNamespace.Modifier);
  } else {
    return null;
  }
}

export function BlockSyntaxContext(node: ASTv1.BlockStatement): ASTv2.FreeVarResolution | null {
  if (isSimpleCallee(node)) {
    return ASTv2.LooseModeResolution.namespaced(ASTv2.FreeVarNamespace.Component);
  } else {
    return null;
  }
}

export function ComponentSyntaxContext(node: ASTv1.PathExpression): ASTv2.FreeVarResolution | null {
  if (isSimplePath(node)) {
    return ASTv2.LooseModeResolution.namespaced(ASTv2.FreeVarNamespace.Component);
  } else {
    return null;
  }
}

/**
 * This corresponds to append positions (text curlies or attribute
 * curlies). In strict mode, this also corresponds to arg curlies.
 */
export function AttrValueSyntaxContext(node: ASTv1.MustacheStatement): ASTv2.FreeVarResolution {
  let isSimple = isSimpleCallee(node);
  let isInvoke = isInvokeNode(node);

  if (isSimple) {
    return isInvoke
      ? ASTv2.LooseModeResolution.namespaced(ASTv2.FreeVarNamespace.Helper)
      : ASTv2.LooseModeResolution.attr();
  } else {
    return isInvoke ? ASTv2.STRICT_RESOLUTION : ASTv2.LooseModeResolution.fallback();
  }
}

/**
 * This corresponds to append positions (text curlies or attribute
 * curlies). In strict mode, this also corresponds to arg curlies.
 */
export function AppendSyntaxContext(node: ASTv1.MustacheStatement): ASTv2.FreeVarResolution {
  let isSimple = isSimpleCallee(node);
  let isInvoke = isInvokeNode(node);

  if (isSimple) {
    return ASTv2.LooseModeResolution.append({ invoke: isInvoke });
  } else {
    return isInvoke ? ASTv2.STRICT_RESOLUTION : ASTv2.LooseModeResolution.fallback();
  }
}

export type Resolution<P extends AstCallParts | ASTv1.PathExpression> = (
  call: P
) => ASTv2.FreeVarResolution | null;

// UTILITIES

/**
 * A call node has a simple callee if its head is:
 *
 * - a `PathExpression`
 * - the `PathExpression`'s head is a `VarHead`
 * - it has no tail
 *
 * Simple heads:
 *
 * ```
 * {{x}}
 * {{x y}}
 * ```
 *
 * Not simple heads:
 *
 * ```
 * {{x.y}}
 * {{x.y z}}
 * {{@x}}
 * {{@x a}}
 * {{this}}
 * {{this a}}
 * ```
 */
function isSimpleCallee(node: AstCallParts): boolean {
  let path = node.path;

  return isSimplePath(path);
}

function isSimplePath(node: ASTv1.Expression): boolean {
  if (node.type === 'PathExpression' && node.head.type === 'VarHead') {
    return node.tail.length === 0;
  } else {
    return false;
  }
}

/**
 * The call expression has at least one argument.
 */
function isInvokeNode(node: AstCallParts): boolean {
  return node.params.length > 0 || node.hash.pairs.length > 0;
}
