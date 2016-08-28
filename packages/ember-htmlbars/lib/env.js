import { environment } from 'ember-environment';

import { hooks } from 'htmlbars-runtime';
import assign from 'ember-metal/assign';
import isEnabled from 'ember-metal/features';

import subexpr from './hooks/subexpr';
import concat from './hooks/concat';
import linkRenderNode from './hooks/link-render-node';
import createFreshScope, { createChildScope } from './hooks/create-fresh-scope';
import bindShadowScope from './hooks/bind-shadow-scope';
import bindSelf from './hooks/bind-self';
import bindScope from './hooks/bind-scope';
import bindLocal from './hooks/bind-local';
import bindBlock from './hooks/bind-block';
import updateSelf from './hooks/update-self';
import getRoot from './hooks/get-root';
import getChild from './hooks/get-child';
import getBlock from './hooks/get-block';
import getValue from './hooks/get-value';
import getCellOrValue from './hooks/get-cell-or-value';
import cleanupRenderNode from './hooks/cleanup-render-node';
import destroyRenderNode from './hooks/destroy-render-node';
import didRenderNode from './hooks/did-render-node';
import willCleanupTree from './hooks/will-cleanup-tree';
import didCleanupTree from './hooks/did-cleanup-tree';
import classify from './hooks/classify';
import component from './hooks/component';
import lookupHelper from './hooks/lookup-helper';
import hasHelper from './hooks/has-helper';
import invokeHelper from './hooks/invoke-helper';
import element from './hooks/element';

import helpers from './helpers';
import keywords, { registerKeyword } from './keywords';

import DOMHelper from './system/dom-helper';

const emberHooks = assign({}, hooks);
emberHooks.keywords = keywords;

assign(emberHooks, {
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

import debuggerKeyword from './keywords/debugger';
import withKeyword from './keywords/with';
import outlet from './keywords/outlet';
import unbound from './keywords/unbound';
import componentKeyword from './keywords/component';
import elementComponent from './keywords/element-component';
import mount from './keywords/mount';
import partial from './keywords/partial';
import input from './keywords/input';
import textarea from './keywords/textarea';
import yieldKeyword from './keywords/yield';
import mut, { privateMut } from './keywords/mut';
import readonly from './keywords/readonly';
import getKeyword from './keywords/get';
import actionKeyword from './keywords/action';
import renderKeyword from './keywords/render';
import elementActionKeyword from './keywords/element-action';

registerKeyword('debugger', debuggerKeyword);
registerKeyword('with', withKeyword);
registerKeyword('outlet', outlet);
registerKeyword('unbound', unbound);
registerKeyword('component', componentKeyword);
registerKeyword('@element_component', elementComponent);
if (isEnabled('ember-application-engines')) {
  registerKeyword('mount', mount);
}
registerKeyword('partial', partial);
registerKeyword('input', input);
registerKeyword('textarea', textarea);
registerKeyword('yield', yieldKeyword);
registerKeyword('mut', mut);
registerKeyword('@mut', privateMut);
registerKeyword('readonly', readonly);
registerKeyword('get', getKeyword);
registerKeyword('action', actionKeyword);
registerKeyword('render', renderKeyword);
registerKeyword('@element_action', elementActionKeyword);

export default {
  hooks: emberHooks,
  helpers: helpers,
  useFragmentCache: true
};

const domHelper = environment.hasDOM ? new DOMHelper() : null;

export { domHelper };
