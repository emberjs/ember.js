declare module '@ember/-internals/string' {
  /**
     Defines string helper methods used internally in ember-source.

     @class String
     @private
     */
  /**
     Replaces underscores, spaces, or camelCase with dashes.

     ```javascript
     import { dasherize } from '@ember/-internals/string';

     dasherize('innerHTML');                // 'inner-html'
     dasherize('action_name');              // 'action-name'
     dasherize('css-class-name');           // 'css-class-name'
     dasherize('my favorite items');        // 'my-favorite-items'
     dasherize('privateDocs/ownerInvoice';  // 'private-docs/owner-invoice'
     ```

     @method dasherize
     @param {String} str The string to dasherize.
     @return {String} the dasherized string.
     @private
     */
  export function dasherize(str: string): string;
  /**
     Returns the UpperCamelCase form of a string.

     ```javascript
     import { classify } from '@ember/string';

     classify('innerHTML');                   // 'InnerHTML'
     classify('action_name');                 // 'ActionName'
     classify('css-class-name');              // 'CssClassName'
     classify('my favorite items');           // 'MyFavoriteItems'
     classify('private-docs/owner-invoice');  // 'PrivateDocs/OwnerInvoice'
     ```

     @method classify
     @param {String} str the string to classify
     @return {String} the classified string
     @private
     */
  export function classify(str: string): string;
}
