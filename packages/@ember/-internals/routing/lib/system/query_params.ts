import { Option } from '@glimmer/interfaces';

export default class QueryParams {
  values: null | object;
  isQueryParams = true;
  constructor(values: Option<object> = null) {
    this.values = values;
  }
}

export function isQueryParams(obj: unknown): obj is QueryParams {
  return typeof obj === 'object' && obj !== null && obj['isQueryParams'] === true;
}
