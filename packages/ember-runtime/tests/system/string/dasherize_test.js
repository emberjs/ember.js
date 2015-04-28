import Ember from "ember-metal/core";
import {dasherize} from "ember-runtime/system/string";

QUnit.module('EmberStringUtils.dasherize');

if (!Ember.EXTEND_PROTOTYPES && !Ember.EXTEND_PROTOTYPES.String) {
  QUnit.test("String.prototype.dasherize is not modified without EXTEND_PROTOTYPES", function() {
    ok("undefined" === typeof String.prototype.dasherize, 'String.prototype helper disabled');
  });
}

QUnit.test("dasherize normal string", function() {
  deepEqual(dasherize('my favorite items'), 'my-favorite-items');
  if (Ember.EXTEND_PROTOTYPES) {
    deepEqual('my favorite items'.dasherize(), 'my-favorite-items');
  }
});

QUnit.test("does nothing with dasherized string", function() {
  deepEqual(dasherize('css-class-name'), 'css-class-name');
  if (Ember.EXTEND_PROTOTYPES) {
    deepEqual('css-class-name'.dasherize(), 'css-class-name');
  }
});

QUnit.test("dasherize underscored string", function() {
  deepEqual(dasherize('action_name'), 'action-name');
  if (Ember.EXTEND_PROTOTYPES) {
    deepEqual('action_name'.dasherize(), 'action-name');
  }
});

QUnit.test("dasherize camelcased string", function() {
  deepEqual(dasherize('innerHTML'), 'inner-html');
  if (Ember.EXTEND_PROTOTYPES) {
    deepEqual('innerHTML'.dasherize(), 'inner-html');
  }
});

QUnit.test("dasherize string that is the property name of Object.prototype", function() {
  deepEqual(dasherize('toString'), 'to-string');
  if (Ember.EXTEND_PROTOTYPES) {
    deepEqual('toString'.dasherize(), 'to-string');
  }
});

QUnit.test("dasherize namespaced classified string", function() {
  deepEqual(dasherize('PrivateDocs/OwnerInvoice'), 'private-docs/owner-invoice');
  if (Ember.EXTEND_PROTOTYPES) {
    deepEqual('PrivateDocs/OwnerInvoice'.dasherize(), 'private-docs/owner-invoice');
  }
});

QUnit.test("dasherize namespaced camelized string", function() {
  deepEqual(dasherize('privateDocs/ownerInvoice'), 'private-docs/owner-invoice');
  if (Ember.EXTEND_PROTOTYPES) {
    deepEqual('privateDocs/ownerInvoice'.dasherize(), 'private-docs/owner-invoice');
  }
});

QUnit.test("dasherize namespaced underscored string", function() {
  deepEqual(dasherize('private_docs/owner_invoice'), 'private-docs/owner-invoice');
  if (Ember.EXTEND_PROTOTYPES) {
    deepEqual('private_docs/owner_invoice'.dasherize(), 'private-docs/owner-invoice');
  }
});
