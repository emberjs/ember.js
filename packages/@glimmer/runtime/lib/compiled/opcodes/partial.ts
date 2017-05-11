import { VersionedPathReference } from '@glimmer/reference';
import { TemplateMeta } from '@glimmer/wire-format';
import { APPEND_OPCODES, Op } from '../../opcodes';
import { PartialDefinition } from '../../partial';

APPEND_OPCODES.add(Op.GetPartialTemplate, vm => {
  let stack = vm.stack;
  let definition = stack.pop<VersionedPathReference<PartialDefinition<TemplateMeta>>>();
  stack.push(definition.value().template.asPartial());
});
