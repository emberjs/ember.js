// eslint-disable-next-line node/no-extraneous-import
import { Reference } from '@glimmer/reference';
import { Option } from '../core';

export interface ElementOperations {
  setAttribute(name: string, value: Reference, trusting: boolean, namespace: Option<string>): void;

  setStaticAttribute(name: string, value: string, namespace: Option<string>): void;
}
