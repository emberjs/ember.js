import { Option } from '@glimmer/interfaces';
import { TemplateReferenceEnvironment, IteratorDelegate } from '../..';
import { TemplatePathReference } from '../../lib/template';
import objectValues from './platform';

abstract class BoundedIterator implements IteratorDelegate {
  private position = 0;

  constructor(private length: number) {}

  isEmpty(): false {
    return false;
  }

  abstract valueFor(position: number): unknown;

  memoFor(position: number): unknown {
    return position;
  }

  next() {
    let { length, position } = this;

    if (position >= length) {
      return null;
    }

    let value = this.valueFor(position);
    let memo = this.memoFor(position);

    this.position++;

    return { value, memo };
  }
}

interface Indexable {
  readonly [key: string]: unknown;
}

class ObjectIterator extends BoundedIterator {
  static fromIndexable(obj: Indexable) {
    let keys = Object.keys(obj);
    let values = objectValues(obj);

    return new this(keys, values);
  }

  constructor(private keys: unknown[], private values: unknown[]) {
    super(values.length);
  }

  valueFor(position: number): unknown {
    return this.values[position];
  }

  memoFor(position: number): unknown {
    return this.keys[position];
  }
}

export class TestEnv implements TemplateReferenceEnvironment {
  getProp(obj: unknown, path: string) {
    return (obj as any)[path];
  }

  getPath(obj: unknown, path: string) {
    return (obj as any)[path];
  }

  setPath(obj: unknown, path: string, value: unknown) {
    return ((obj as any)[path] = value);
  }

  getTemplatePathDebugContext(_ref: TemplatePathReference) {
    return '';
  }

  setTemplatePathDebugContext(
    _ref: TemplatePathReference,
    _key: string,
    _parentRef: Option<TemplatePathReference>
  ) {}

  toIterator(obj: unknown) {
    if (typeof obj === 'object' && obj !== null) {
      return ObjectIterator.fromIndexable(obj as Indexable);
    }

    return null;
  }
}
