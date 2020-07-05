import { Reference, CachedReference } from '@glimmer/reference';
import { Option } from '@glimmer/util';

import { normalizeStringValue } from '../dom/normalize';

export default class ClassListReference extends CachedReference<Option<string>>
  implements Reference<Option<string>> {
  constructor(private list: Reference<unknown>[]) {
    super();
    this.list = list;
  }

  compute() {
    let ret: string[] = [];
    let { list } = this;

    for (let i = 0; i < list.length; i++) {
      let value = normalizeStringValue(list[i].value());
      if (value) ret.push(value);
    }

    return ret.length === 0 ? null : ret.join(' ');
  }
}
