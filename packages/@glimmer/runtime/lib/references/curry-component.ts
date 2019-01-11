import { Reference, PathReference, Tag } from '@glimmer/reference';
import { Option } from '@glimmer/util';
import {
  RuntimeResolverDelegate,
  CapturedArguments,
  ComponentDefinition,
  TemplateMeta,
  Maybe,
  Dict,
} from '@glimmer/interfaces';

import {
  CurriedComponentDefinition,
  isCurriedComponentDefinition,
} from '../component/curried-component';
import { resolveComponent } from '../component/resolve';
import { UNDEFINED_REFERENCE } from '../references';

export default class CurryComponentReference
  implements PathReference<Option<CurriedComponentDefinition>> {
  public tag: Tag;
  private lastValue: unknown;
  private lastDefinition: Option<CurriedComponentDefinition>;

  constructor(
    private inner: Reference<unknown>,
    private resolver: RuntimeResolverDelegate,
    private meta: TemplateMeta,
    private args: Option<CapturedArguments>
  ) {
    this.tag = inner.tag;
    this.lastValue = null;
    this.lastDefinition = null;
  }

  value(): Option<CurriedComponentDefinition> {
    let { inner, lastValue } = this;

    let value = inner.value() as Maybe<Dict>;

    if (value === lastValue) {
      return this.lastDefinition;
    }

    let definition: Option<CurriedComponentDefinition | ComponentDefinition> = null;

    if (isCurriedComponentDefinition(value)) {
      definition = value;
    } else if (typeof value === 'string' && value) {
      let { resolver, meta } = this;
      definition = resolveComponent(resolver, value, meta);
    }

    definition = this.curry(definition);

    this.lastValue = value;
    this.lastDefinition = definition;

    return definition;
  }

  get(): PathReference<unknown> {
    return UNDEFINED_REFERENCE;
  }

  private curry(
    definition: Option<CurriedComponentDefinition | ComponentDefinition>
  ): Option<CurriedComponentDefinition> {
    let { args } = this;

    if (!args && isCurriedComponentDefinition(definition)) {
      return definition;
    } else if (!definition) {
      return null;
    } else {
      return new CurriedComponentDefinition(definition, args);
    }
  }
}
