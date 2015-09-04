import _Ember from 'ember-metal';
import environment from 'ember-metal/environment';

import { hooks } from 'htmlbars-runtime';
import merge from 'ember-metal/merge';

import subexpr from 'ember-htmlbars/hooks/subexpr';
import concat from 'ember-htmlbars/hooks/concat';
import linkRenderNode from 'ember-htmlbars/hooks/link-render-node';
import createFreshScope, { createChildScope } from 'ember-htmlbars/hooks/create-fresh-scope';
import bindShadowScope from 'ember-htmlbars/hooks/bind-shadow-scope';
import bindSelf from 'ember-htmlbars/hooks/bind-self';
import bindScope from 'ember-htmlbars/hooks/bind-scope';
import bindLocal from 'ember-htmlbars/hooks/bind-local';
import bindBlock from 'ember-htmlbars/hooks/bind-block';
import updateSelf from 'ember-htmlbars/hooks/update-self';
import getRoot from 'ember-htmlbars/hooks/get-root';
import getChild from 'ember-htmlbars/hooks/get-child';
import getBlock from 'ember-htmlbars/hooks/get-block';
import getValue from 'ember-htmlbars/hooks/get-value';
import getCellOrValue from 'ember-htmlbars/hooks/get-cell-or-value';
import cleanupRenderNode from 'ember-htmlbars/hooks/cleanup-render-node';
import destroyRenderNode from 'ember-htmlbars/hooks/destroy-render-node';
import didRenderNode from 'ember-htmlbars/hooks/did-render-node';
import willCleanupTree from 'ember-htmlbars/hooks/will-cleanup-tree';
import didCleanupTree from 'ember-htmlbars/hooks/did-cleanup-tree';
import classify from 'ember-htmlbars/hooks/classify';
import component from 'ember-htmlbars/hooks/component';
import lookupHelper from 'ember-htmlbars/hooks/lookup-helper';
import hasHelper from 'ember-htmlbars/hooks/has-helper';
import invokeHelper from 'ember-htmlbars/hooks/invoke-helper';
import element from 'ember-htmlbars/hooks/element';

import helpers from 'ember-htmlbars/helpers';
import keywords, { registerKeyword } from 'ember-htmlbars/keywords';

import DOMHelper from 'ember-htmlbars/system/dom-helper';

var emberHooks = merge({}, hooks);
emberHooks.keywords = keywords;

merge(emberHooks, {
  linkRenderNode,
  createFreshScope,
  createChildScope,
  bindShadowScope,
  bindSelf,
  bindScope,
  bindLocal,
  bindBlock,
  updateSelf,
  getBlock,
  getRoot,
  getChild,
  getValue,
  getCellOrValue,
  subexpr,
  concat,
  cleanupRenderNode,
  destroyRenderNode,
  willCleanupTree,
  didCleanupTree,
  didRenderNode,
  classify,
  component,
  lookupHelper,
  hasHelper,
  invokeHelper,
  element
});

import debuggerKeyword from 'ember-htmlbars/keywords/debugger';
import withKeyword from 'ember-htmlbars/keywords/with';
import outlet from 'ember-htmlbars/keywords/outlet';
import unbound from 'ember-htmlbars/keywords/unbound';
import view from 'ember-htmlbars/keywords/view';
import componentKeyword from 'ember-htmlbars/keywords/component';
import partial from 'ember-htmlbars/keywords/partial';
import input from 'ember-htmlbars/keywords/input';
import textarea from 'ember-htmlbars/keywords/textarea';
import collection from 'ember-htmlbars/keywords/collection';
import yieldKeyword from 'ember-htmlbars/keywords/yield';
import legacyYield from 'ember-htmlbars/keywords/legacy-yield';
import mut, { privateMut } from 'ember-htmlbars/keywords/mut';
import each from 'ember-htmlbars/keywords/each';
import readonly from 'ember-htmlbars/keywords/readonly';
import getKeyword from 'ember-htmlbars/keywords/get';

registerKeyword('debugger', debuggerKeyword);
registerKeyword('with', withKeyword);
registerKeyword('outlet', outlet);
registerKeyword('unbound', unbound);
registerKeyword('component', componentKeyword);
registerKeyword('partial', partial);
registerKeyword('input', input);
registerKeyword('textarea', textarea);
registerKeyword('yield', yieldKeyword);
registerKeyword('legacy-yield', legacyYield);
registerKeyword('mut', mut);
registerKeyword('@mut', privateMut);
registerKeyword('each', each);
registerKeyword('readonly', readonly);
registerKeyword('get', getKeyword);

if (_Ember.ENV._ENABLE_LEGACY_VIEW_SUPPORT) {
  registerKeyword('collection', collection);
  registerKeyword('view', view);
}


export default {
  hooks: emberHooks,
  helpers: helpers,
  useFragmentCache: true
};

var domHelper = environment.hasDOM ? new DOMHelper() : null;

export { domHelper };
