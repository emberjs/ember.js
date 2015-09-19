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
    if (morph.begin) {
        morph.begin();
    }
    statement.evaluate(morph, env, scope, visitor);
    if (morph.commit) {
        morph.commit();
    }
}
export { morphWasDirty as alwaysDirtyVisitor };
export default function (statement, morph, env, scope, _visitor) {
    let isDirty = morph.isDirty;
    let isSubtreeDirty = morph.isSubtreeDirty;
    let visitor = _visitor;
    if (isSubtreeDirty) {
        visitor = morphWasDirty;
    }
    else if (!isDirty) {
        if (morph.buildChildEnv) {
            env = morph.buildChildEnv(morph.state, env);
        }
        validateChildMorphs(env, morph, visitor);
        return;
    }
    morphWasDirty(statement, morph, env, scope, visitor);
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibm9kZS12aXNpdG9yLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vc3JjL2h0bWxiYXJzLXJ1bnRpbWUvbGliL25vZGUtdmlzaXRvci50cyJdLCJuYW1lcyI6WyJpbml0aWFsVmlzaXRvciIsIm1vcnBoV2FzRGlydHkiXSwibWFwcGluZ3MiOiJPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSw4QkFBOEI7QUFFbEU7Ozs7Ozs7Ozs7Ozs7Ozs7OztFQWtCRTtBQUVGLCtCQUErQixTQUFTLEVBQUUsS0FBSyxFQUFFLEdBQUcsRUFBRSxLQUFLLEVBQUUsT0FBTztJQUNsRUEsU0FBU0EsQ0FBQ0EsUUFBUUEsQ0FBQ0EsS0FBS0EsRUFBRUEsR0FBR0EsRUFBRUEsS0FBS0EsRUFBRUEsT0FBT0EsQ0FBQ0EsQ0FBQ0E7QUFDakRBLENBQUNBO0FBRUQsdUJBQXVCLFNBQVMsRUFBRSxLQUFLLEVBQUUsR0FBRyxFQUFFLEtBQUssRUFBRSxPQUFPO0lBQzFEQyxLQUFLQSxDQUFDQSxPQUFPQSxHQUFHQSxLQUFLQSxDQUFDQSxjQUFjQSxHQUFHQSxLQUFLQSxDQUFDQTtJQUM3Q0EsRUFBRUEsQ0FBQ0EsQ0FBQ0EsS0FBS0EsQ0FBQ0EsS0FBS0EsQ0FBQ0EsQ0FBQ0EsQ0FBQ0E7UUFBQ0EsS0FBS0EsQ0FBQ0EsS0FBS0EsRUFBRUEsQ0FBQ0E7SUFBQ0EsQ0FBQ0E7SUFDbkNBLFNBQVNBLENBQUNBLFFBQVFBLENBQUNBLEtBQUtBLEVBQUVBLEdBQUdBLEVBQUVBLEtBQUtBLEVBQUVBLE9BQU9BLENBQUNBLENBQUNBO0lBQy9DQSxFQUFFQSxDQUFDQSxDQUFDQSxLQUFLQSxDQUFDQSxNQUFNQSxDQUFDQSxDQUFDQSxDQUFDQTtRQUFDQSxLQUFLQSxDQUFDQSxNQUFNQSxFQUFFQSxDQUFDQTtJQUFDQSxDQUFDQTtBQUN2Q0EsQ0FBQ0E7QUFFRCxTQUFTLGFBQWEsSUFBSSxrQkFBa0IsR0FBRztBQUUvQyx5QkFBd0IsU0FBUyxFQUFFLEtBQUssRUFBRSxHQUFHLEVBQUUsS0FBSyxFQUFFLFFBQVE7SUFDNUQsSUFBSSxPQUFPLEdBQUcsS0FBSyxDQUFDLE9BQU8sQ0FBQztJQUM1QixJQUFJLGNBQWMsR0FBRyxLQUFLLENBQUMsY0FBYyxDQUFDO0lBQzFDLElBQUksT0FBTyxHQUFHLFFBQVEsQ0FBQztJQUV2QixFQUFFLENBQUMsQ0FBQyxjQUFjLENBQUMsQ0FBQyxDQUFDO1FBQ25CLE9BQU8sR0FBRyxhQUFhLENBQUM7SUFDMUIsQ0FBQztJQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUM7UUFDcEIsRUFBRSxDQUFDLENBQUMsS0FBSyxDQUFDLGFBQWEsQ0FBQyxDQUFDLENBQUM7WUFDeEIsR0FBRyxHQUFHLEtBQUssQ0FBQyxhQUFhLENBQUMsS0FBSyxDQUFDLEtBQUssRUFBRSxHQUFHLENBQUMsQ0FBQztRQUM5QyxDQUFDO1FBQ0QsbUJBQW1CLENBQUMsR0FBRyxFQUFFLEtBQUssRUFBRSxPQUFPLENBQUMsQ0FBQztRQUN6QyxNQUFNLENBQUM7SUFDVCxDQUFDO0lBRUQsYUFBYSxDQUFDLFNBQVMsRUFBRSxLQUFLLEVBQUUsR0FBRyxFQUFFLEtBQUssRUFBRSxPQUFPLENBQUMsQ0FBQztBQUN2RCxDQUFDIn0=