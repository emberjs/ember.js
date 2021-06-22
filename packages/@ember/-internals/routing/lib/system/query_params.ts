export default class QueryParams {
  values: null | object;
  isQueryParams = true;
  constructor(values = null) {
    this.values = values;
  }
}

export const DEFAULT_QUERY_PARAM_VALUE = '__DEFAULT_QPS_VALUE__-2619863850871346-64111';
