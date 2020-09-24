import { WireFormat } from '@glimmer/interfaces';
import { LOCAL_SHOULD_LOG } from '@glimmer/local-debug-flags';
import { LOCAL_LOGGER } from '@glimmer/util';

import WireFormatDebugger from '../../wire-format-debug';
import { CONTENT } from './content';
import * as mir from './mir';

export function visit(template: mir.Template): WireFormat.SerializedTemplateBlock {
  let statements = CONTENT.list(template.body);
  let scope = template.scope;

  if (LOCAL_SHOULD_LOG) {
    let debug = new WireFormatDebugger(scope);
    LOCAL_LOGGER.log(
      `-> `,
      statements.map((s) => debug.formatOpcode(s))
    );
  }

  return {
    symbols: scope.symbols,
    statements,
    hasEval: scope.hasEval,
    upvars: scope.upvars,
  };
}
