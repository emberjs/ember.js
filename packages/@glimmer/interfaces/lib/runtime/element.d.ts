import { type Option } from '../core';
import { type Reference } from '../references';

export interface ElementOperations {
  setAttribute(name: string, value: Reference, trusting: boolean, namespace: Option<string>): void;

  setStaticAttribute(name: string, value: string, namespace: Option<string>): void;
}
