import { validateChildMorphs } from "../htmlbars-util/morph-utils";

/**
  Node classification:

  # Primary Statement Nodes:

  These nodes are responsible for a render node that represents a morph-range.

  * block
  * inline
  * content
  * element
  * component

  # Leaf Statement Nodes:

  This node is responsible for a render node that represents a morph-attr.

  * attribute
*/

export function initialVisitor(statement, morph, env, scope, visitor) {
  statement.evaluate(morph, env, scope, visitor);
}

export function alwaysDirtyVisitor(statement, morph, env, scope, visitor) {
  morph.isDirty = morph.isSubtreeDirty = false;
  statement.evaluate(morph, env, scope, visitor);
}

export default function(statement, morph, env, scope, _visitor) {
  let isDirty = morph.isDirty;
  let isSubtreeDirty = morph.isSubtreeDirty;
  let visitor = _visitor;

  if (isSubtreeDirty) {
    visitor = alwaysDirtyVisitor;
  } else if (!isDirty) {
    if (morph.buildChildEnv) {
      env = morph.buildChildEnv(morph.state, env);
    }
    validateChildMorphs(env, morph, visitor);
    return;
  }

  morph.isDirty = morph.isSubtreeDirty = false;
  statement.evaluate(morph, env, scope, visitor);
}
