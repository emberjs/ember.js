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

function morphWasDirty(statement, morph, env, scope, visitor) {
  morph.isDirty = morph.isSubtreeDirty = false;
  if (morph.begin) { morph.begin(); }
  statement.evaluate(morph, env, scope, visitor);
  if (morph.commit) { morph.commit(); }
}

export { morphWasDirty as alwaysDirtyVisitor };

export default function(statement, morph, env, scope, _visitor) {
  let isDirty = morph.isDirty;
  let isSubtreeDirty = morph.isSubtreeDirty;
  let visitor = _visitor;

  if (isSubtreeDirty) {
    visitor = morphWasDirty;
  } else if (!isDirty) {
    if (morph.buildChildEnv) {
      env = morph.buildChildEnv(morph.state, env);
    }
    validateChildMorphs(env, morph, visitor);
    return;
  }

  morphWasDirty(statement, morph, env, scope, visitor);
}
