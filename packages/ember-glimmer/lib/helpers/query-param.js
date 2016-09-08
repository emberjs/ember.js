import { InternalHelperReference } from '../utils/references';
import { assert, assign } from 'ember-metal';
import { QueryParams } from 'ember-routing';

function queryParams({ positional, named }) {
  assert('The `query-params` helper only accepts hash parameters, e.g. (query-params queryParamPropertyName=\'foo\') as opposed to just (query-params \'foo\')', positional.value().length === 0);

  return QueryParams.create({
    values: assign({}, named.value())
  });
}

export default function(vm, args) {
  return new InternalHelperReference(queryParams, args);
}
