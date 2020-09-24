import * as ASTv1 from '../v1/api';
import Printer, { PrinterOptions } from './printer';

export default function build(
  ast: ASTv1.Node,
  options: PrinterOptions = { entityEncoding: 'transformed' }
): string {
  if (!ast) {
    return '';
  }

  let printer = new Printer(options);
  return printer.print(ast);
}
