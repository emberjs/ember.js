import { WireFormat } from '@glimmer/interfaces';
import { LOCAL_SHOULD_LOG } from '@glimmer/local-debug-flags';
import { LOCAL_LOGGER } from '@glimmer/util';

import WireFormatDebugger from '../../wire-format-debug';
import { CONTENT } from './content';
import * as mir from './mir';

export function visit(template: mir.Template): WireFormat.SerializedTemplateBlock {
  let statements = CONTENT.list(template.body);
  let scope = template.scope;
  let block: WireFormat.SerializedTemplateBlock = [
    statements,
    scope.symbols,
    scope.hasEval,
    scope.upvars,
  ];

  if (LOCAL_SHOULD_LOG) {
    let debug = new WireFormatDebugger(block);
    LOCAL_LOGGER.log(
      `-> `,
      statements.map((s) => debug.formatOpcode(s))
    );
  }

  return block;
}
