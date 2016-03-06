import {
  StatementCompilationBuffer,
  Statement as StatementSyntax
} from '../../syntax';

import * as Syntax from '../core';

import {
  EnterOpcode,
  LabelOpcode,
  PutArgsOpcode,
  JumpOpcode,
  JumpUnlessOpcode,
  EvaluateOpcode,
  ExitOpcode,
  PushChildScopeOpcode,
  PopScopeOpcode
} from '../../compiled/opcodes/vm';

import {
  PutIteratorOpcode,
  EnterListOpcode,
  NextIterOpcode,
  EnterWithKeyOpcode,
  ExitListOpcode
} from '../../compiled/opcodes/lists';

import Environment from '../../environment';

export default class EachSyntax extends StatementSyntax {
  type = "each-statement";

  public args: Syntax.Args;
  public templates: Syntax.Templates;
  public isStatic = false;

  constructor({ args, templates }: { args: Syntax.Args, templates: Syntax.Templates }) {
    super();
    this.args = args;
    this.templates = templates;
  }

  prettyPrint() {
    return `#each ${this.args.prettyPrint()}`;
  }

  compile(compiler: StatementCompilationBuffer, env: Environment) {
    //         Enter(BEGIN, END)
    // BEGIN:  Noop
    //         PutArgs
    //         PutIterable
    //         JumpUnless(ELSE)
    //         EnterList(BEGIN2, END2)
    // ITER:   Noop
    //         NextIter(BREAK)
    //         EnterWithKey(BEGIN2, END2)
    // BEGIN2: Noop
    //         PushChildScope
    //         Evaluate(default)
    //         PopScope
    // END2:   Noop
    //         Exit
    //         Jump(ITER)
    // BREAK:  Noop
    //         ExitList
    //         Jump(END)
    // ELSE:   Noop
    //         Evalulate(inverse)
    // END:    Noop
    //         Exit

    let BEGIN = new LabelOpcode({ label: "BEGIN" });
    let ITER = new LabelOpcode({ label: "ITER" });
    let BEGIN2 = new LabelOpcode({ label: "BEGIN2" });
    let END2 = new LabelOpcode({ label: "END2" });
    let BREAK = new LabelOpcode({ label: "BREAK" });
    let ELSE = new LabelOpcode({ label: "ELSE" });
    let END = new LabelOpcode({ label: "END" });

    compiler.append(new EnterOpcode({ begin: BEGIN, end: END }));
    compiler.append(BEGIN);
    compiler.append(new PutArgsOpcode({ args: this.args.compile(compiler, env) }));
    compiler.append(new PutIteratorOpcode());

    if (this.templates.inverse) {
      compiler.append(new JumpUnlessOpcode({ target: ELSE }));
    } else {
      compiler.append(new JumpUnlessOpcode({ target: END }));
    }

    compiler.append(new EnterListOpcode(BEGIN2, END2));
    compiler.append(ITER);
    compiler.append(new NextIterOpcode(BREAK));
    compiler.append(new EnterWithKeyOpcode(BEGIN2, END2));
    compiler.append(BEGIN2);
    compiler.append(new PushChildScopeOpcode());
    compiler.append(new EvaluateOpcode({ debug: "default", block: this.templates.default }));
    compiler.append(new PopScopeOpcode());
    compiler.append(END2);
    compiler.append(new ExitOpcode());
    compiler.append(new JumpOpcode({ target: ITER }));
    compiler.append(BREAK);
    compiler.append(new ExitListOpcode());
    compiler.append(new JumpOpcode({ target: END }));

    if (this.templates.inverse) {
      compiler.append(ELSE);
      compiler.append(new EvaluateOpcode({ debug: "inverse", block: this.templates.inverse }));
    }

    compiler.append(END);
    compiler.append(new ExitOpcode());
  }
}
