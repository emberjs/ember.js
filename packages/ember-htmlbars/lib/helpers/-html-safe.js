import SafeString from 'htmlbars-util/safe-string';

/**
 This private helper is used internally to handle `isVisible: false` for
 Ember.View and Ember.Component.

 @private
 */
export default function htmlSafeHelper([ value ]) {
  return new SafeString(value);
}
