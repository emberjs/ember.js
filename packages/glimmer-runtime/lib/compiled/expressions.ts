import VM from '../vm';
import Syntax, { PrettyPrintValue } from '../syntax';
import Compiler from '../compiler';
import { PathReference } from 'glimmer-reference';

export interface CompiledExpression {
  type: string;
  evaluate(vm: VM): PathReference;
}