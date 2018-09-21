export default class QueryParams {
  values: null | object;
  isQueryParams = true;
  constructor(values = null) {
    this.values = values;
  }
}
