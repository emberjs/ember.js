import { ENV } from 'ember-environment';
import { camelize } from '../../../system/string';

QUnit.module('EmberStringUtils.camelize');

if (!ENV.EXTEND_PROTOTYPES.String) {
  QUnit.test('String.prototype.camelize is not modified without EXTEND_PROTOTYPES', function() {
    ok('undefined' === typeof String.prototype.camelize, 'String.prototype helper disabled');
  });
}

QUnit.test('camelize normal string', function() {
  deepEqual(camelize('my favorite items'), 'myFavoriteItems');
  if (ENV.EXTEND_PROTOTYPES.String) {
    deepEqual('my favorite items'.camelize(), 'myFavoriteItems');
  }
});

QUnit.test('camelize capitalized string', function() {
  deepEqual(camelize('I Love Ramen'), 'iLoveRamen');
  if (ENV.EXTEND_PROTOTYPES.String) {
    deepEqual('I Love Ramen'.camelize(), 'iLoveRamen');
  }
});

QUnit.test('camelize dasherized string', function() {
  deepEqual(camelize('css-class-name'), 'cssClassName');
  if (ENV.EXTEND_PROTOTYPES.String) {
    deepEqual('css-class-name'.camelize(), 'cssClassName');
  }
});

QUnit.test('camelize underscored string', function() {
  deepEqual(camelize('action_name'), 'actionName');
  if (ENV.EXTEND_PROTOTYPES.String) {
    deepEqual('action_name'.camelize(), 'actionName');
  }
});

QUnit.test('camelize dot notation string', function() {
  deepEqual(camelize('action.name'), 'actionName');
  if (ENV.EXTEND_PROTOTYPES.String) {
    deepEqual('action.name'.camelize(), 'actionName');
  }
});

QUnit.test('does nothing with camelcased string', function() {
  deepEqual(camelize('innerHTML'), 'innerHTML');
  if (ENV.EXTEND_PROTOTYPES.String) {
    deepEqual('innerHTML'.camelize(), 'innerHTML');
  }
});

QUnit.test('camelize namespaced classified string', function() {
  deepEqual(camelize('PrivateDocs/OwnerInvoice'), 'privateDocs/ownerInvoice');
  if (ENV.EXTEND_PROTOTYPES.String) {
    deepEqual('PrivateDocs/OwnerInvoice'.camelize(), 'privateDocs/ownerInvoice');
  }
});

QUnit.test('camelize namespaced underscored string', function() {
  deepEqual(camelize('private_docs/owner_invoice'), 'privateDocs/ownerInvoice');
  if (ENV.EXTEND_PROTOTYPES.String) {
    deepEqual('private_docs/owner_invoice'.camelize(), 'privateDocs/ownerInvoice');
  }
});

QUnit.test('camelize namespaced dasherized string', function() {
  deepEqual(camelize('private-docs/owner-invoice'), 'privateDocs/ownerInvoice');
  if (ENV.EXTEND_PROTOTYPES.String) {
    deepEqual('private-docs/owner-invoice'.camelize(), 'privateDocs/ownerInvoice');
  }
});
