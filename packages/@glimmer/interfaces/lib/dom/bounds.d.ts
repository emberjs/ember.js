import * as Simple from './simple';
import { Option } from '../core';

export interface Bounds {
  // a method to future-proof for wormholing; may not be needed ultimately
  parentElement(): Simple.Element;
  firstNode(): Simple.Node;
  lastNode(): Simple.Node;
}
