import {
  CompileInto,
  SymbolLookup,
  Statement as StatementSyntax
} from '../../syntax';

import * as Syntax from '../core';

import {
  LabelOpcode,
  EnterOpcode,
  PutArgsOpcode,
  TestOpcode,
  JumpIfOpcode,
  JumpOpcode,
  EvaluateOpcode,
  ExitOpcode
} from '../../compiled/opcodes/vm';

import Environment from '../../environment';

export default class UnlessSyntax extends StatementSyntax {
  type = "unless-statement";

  public args: Syntax.Args;
  public templates: Syntax.Templates;
  public isStatic = false;

  constructor({ args, templates }: { args: Syntax.Args, templates: Syntax.Templates }) {
    super();
    this.args = args;
    this.templates = templates;
  }

  prettyPrint() {
    return `#unless ${this.args.prettyPrint()}`;
  }

  compile(compiler: CompileInto & SymbolLookup, env: Environment) {
    //        Enter(BEGIN, END)
    // BEGIN: Noop
    //        PutArgs
    //        Test
    //        JumpIf(ELSE)
    //        Evaluate(default)
    //        Jump(END)
    // ELSE:  Noop
    //        Evalulate(inverse)
    // END:   Noop
    //        Exit

    let BEGIN = new LabelOpcode({ label: "BEGIN" });
    let ELSE = new LabelOpcode({ label: "ELSE" });
    let END = new LabelOpcode({ label: "END" });

    compiler.append(new EnterOpcode({ begin: BEGIN, end: END }));
    compiler.append(BEGIN);
    compiler.append(new PutArgsOpcode({ args: this.args.compile(compiler, env) }));
    compiler.append(new TestOpcode());

    if (this.templates.inverse) {
      compiler.append(new JumpIfOpcode({ target: ELSE }));
      compiler.append(new EvaluateOpcode({ debug: "default", block: this.templates.default }));
      compiler.append(new JumpOpcode({ target: END }));
      compiler.append(ELSE);
      compiler.append(new EvaluateOpcode({ debug: "inverse", block: this.templates.inverse }));
    } else {
      compiler.append(new JumpIfOpcode({ target: END }));
      compiler.append(new EvaluateOpcode({ debug: "default", block: this.templates.default }));
    }

    compiler.append(END);
    compiler.append(new ExitOpcode());
  }
}