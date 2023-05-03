import { Option } from '../core';
import { Reference } from '../references';

export interface ElementOperations {
  setAttribute(name: string, value: Reference, trusting: boolean, namespace: Option<string>): void;

  setStaticAttribute(name: string, value: string, namespace: Option<string>): void;
}
