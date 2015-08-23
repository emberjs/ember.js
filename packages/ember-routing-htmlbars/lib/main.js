/**
@module ember
@submodule ember-routing-htmlbars
*/

import Ember from 'ember-metal/core';

import { registerHelper } from 'ember-htmlbars/helpers';
import { registerKeyword } from 'ember-htmlbars/keywords';

import { queryParamsHelper } from 'ember-routing-htmlbars/helpers/query-params';
import action from 'ember-routing-htmlbars/keywords/action';
import elementAction from 'ember-routing-htmlbars/keywords/element-action';
import render from 'ember-routing-htmlbars/keywords/render';

registerHelper('query-params', queryParamsHelper);

registerKeyword('action', action);
registerKeyword('@element_action', elementAction);
registerKeyword('render', render);

export default Ember;
