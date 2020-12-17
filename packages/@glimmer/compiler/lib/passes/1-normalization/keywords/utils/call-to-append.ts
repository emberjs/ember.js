import { Result } from '../../../../shared/result';
import * as mir from '../../../2-encoding/mir';
import { NormalizationState } from '../../context';
import { GenericKeywordNode, KeywordDelegate } from '../impl';

export function toAppend<T>({
  assert,
  translate,
}: KeywordDelegate<GenericKeywordNode, T, mir.ExpressionNode>): KeywordDelegate<
  GenericKeywordNode,
  T,
  mir.AppendTextNode
> {
  return {
    assert,
    translate(
      { node, state }: { node: GenericKeywordNode; state: NormalizationState },
      value: T
    ): Result<mir.AppendTextNode> {
      let result = translate({ node, state }, value);

      return result.mapOk((text) => new mir.AppendTextNode({ text, loc: node.loc }));
    },
  };
}
