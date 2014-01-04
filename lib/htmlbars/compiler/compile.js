import { Compiler1 } from 'htmlbars/compiler/pass1';
import { Compiler2 } from 'htmlbars/compiler/pass2';

export function compileAST(ast, options) {
  var compiler1 = new Compiler1(compileAST, options),
      compiler2 = new Compiler2(options);

  var opcodes = compiler1.compile(ast);
  return compiler2.compile(opcodes, {
    children: compiler1.children
  });
}
