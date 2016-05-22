import { InternalHelperReference } from '../utils/references';
import { assert } from 'ember-metal/debug';
import QueryParams from 'ember-routing/system/query_params';
import assign from 'ember-metal/assign';

function queryParams({ positional, named }) {
  assert('The `query-params` helper only accepts hash parameters, e.g. (query-params queryParamPropertyName=\'foo\') as opposed to just (query-params \'foo\')', positional.value().length === 0);

  return QueryParams.create({
    values: assign({}, named.value())
  });
}

export default {
  isInternalHelper: true,
  toReference(args) {
    return new InternalHelperReference(queryParams, args);
  }
};
