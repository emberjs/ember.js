import VM from '../vm';
import { PathReference } from 'glimmer-reference';

export interface CompiledExpression {
  type: string;
  evaluate(vm: VM): PathReference;
}