/**
This module is deprecated and should not be used.
See [the deprecations guide](https://deprecations.emberjs.com/v4.x#toc_ember-string-from-ember-module)
for more details.

@module @ember/string
*/

export { getStrings as _getStrings, setStrings as _setStrings } from './lib/string_registry';

import { Cache } from '@ember/-internals/utils';
import { deprecate } from '@ember/debug';

import { type SafeString, internalHtmlSafe, internalIsHtmlSafe } from '@ember/-internals/glimmer';

const STRING_DASHERIZE_REGEXP = /[ _]/g;

const STRING_DASHERIZE_CACHE = new Cache<string, string>(1000, (key) =>
  decamelize(key).replace(STRING_DASHERIZE_REGEXP, '-')
);

const STRING_CAMELIZE_REGEXP_1 = /(-|_|\.|\s)+(.)?/g;
const STRING_CAMELIZE_REGEXP_2 = /(^|\/)([A-Z])/g;

const CAMELIZE_CACHE = new Cache<string, string>(1000, (key) =>
  key
    .replace(STRING_CAMELIZE_REGEXP_1, (_match, _separator, chr) => (chr ? chr.toUpperCase() : ''))
    .replace(STRING_CAMELIZE_REGEXP_2, (match /*, separator, chr */) => match.toLowerCase())
);

const STRING_CLASSIFY_REGEXP_1 = /^(-|_)+(.)?/;
const STRING_CLASSIFY_REGEXP_2 = /(.)(-|_|\.|\s)+(.)?/g;
const STRING_CLASSIFY_REGEXP_3 = /(^|\/|\.)([a-z])/g;

const CLASSIFY_CACHE = new Cache<string, string>(1000, (str) => {
  let replace1 = (_match: string, _separator: string, chr: string) =>
    chr ? `_${chr.toUpperCase()}` : '';
  let replace2 = (_match: string, initialChar: string, _separator: string, chr: string) =>
    initialChar + (chr ? chr.toUpperCase() : '');
  let parts = str.split('/');
  for (let i = 0; i < parts.length; i++) {
    parts[i] = parts[i]!.replace(STRING_CLASSIFY_REGEXP_1, replace1).replace(
      STRING_CLASSIFY_REGEXP_2,
      replace2
    );
  }
  return parts
    .join('/')
    .replace(STRING_CLASSIFY_REGEXP_3, (match /*, separator, chr */) => match.toUpperCase());
});

const STRING_UNDERSCORE_REGEXP_1 = /([a-z\d])([A-Z]+)/g;
const STRING_UNDERSCORE_REGEXP_2 = /-|\s+/g;

const UNDERSCORE_CACHE = new Cache<string, string>(1000, (str) =>
  str
    .replace(STRING_UNDERSCORE_REGEXP_1, '$1_$2')
    .replace(STRING_UNDERSCORE_REGEXP_2, '_')
    .toLowerCase()
);

const STRING_CAPITALIZE_REGEXP = /(^|\/)([a-z\u00C0-\u024F])/g;

const CAPITALIZE_CACHE = new Cache<string, string>(1000, (str) =>
  str.replace(STRING_CAPITALIZE_REGEXP, (match /*, separator, chr */) => match.toUpperCase())
);

const STRING_DECAMELIZE_REGEXP = /([a-z\d])([A-Z])/g;

const DECAMELIZE_CACHE = new Cache<string, string>(1000, (str) =>
  str.replace(STRING_DECAMELIZE_REGEXP, '$1_$2').toLowerCase()
);

/**
  Defines string helper methods including string formatting and localization.

  @class String
  @public
  @deprecated Add the package `@ember/string` to your project to use in place of this module.
*/

/**
  Splits a string into separate units separated by spaces, eliminating any
  empty strings in the process.

  ```javascript
  import { w } from '@ember/string';

  w("alpha beta gamma").forEach(function(key) {
    console.log(key);
  });

  // > alpha
  // > beta
  // > gamma
  ```

  @method w
  @param {String} str The string to split
  @return {Array} array containing the split strings
  @public
  @deprecated Add `@ember/string` to your package.json
*/
export function w(str: string): string[] {
  deprecateImportFromInternalString();
  return str.split(/\s+/);
}

/**
  Converts a camelized string into all lower case separated by underscores.

  ```javascript
  import { decamelize } from '@ember/string';

  decamelize('innerHTML');          // 'inner_html'
  decamelize('action_name');        // 'action_name'
  decamelize('css-class-name');     // 'css-class-name'
  decamelize('my favorite items');  // 'my favorite items'
  ```

  @method decamelize
  @param {String} str The string to decamelize.
  @return {String} the decamelized string.
  @public
  @deprecated Add `@ember/string` to your package.json
*/
export function decamelize(str: string): string {
  deprecateImportFromInternalString();
  return DECAMELIZE_CACHE.get(str);
}

/**
  Replaces underscores, spaces, or camelCase with dashes.

  ```javascript
  import { dasherize } from '@ember/string';

  dasherize('innerHTML');                // 'inner-html'
  dasherize('action_name');              // 'action-name'
  dasherize('css-class-name');           // 'css-class-name'
  dasherize('my favorite items');        // 'my-favorite-items'
  dasherize('privateDocs/ownerInvoice';  // 'private-docs/owner-invoice'
  ```

  @method dasherize
  @param {String} str The string to dasherize.
  @return {String} the dasherized string.
  @public
  @deprecated Add `@ember/string` to your package.json
*/
export function dasherize(str: string): string {
  deprecateImportFromInternalString();
  return STRING_DASHERIZE_CACHE.get(str);
}

/**
  Returns the lowerCamelCase form of a string.

  ```javascript
  import { camelize } from '@ember/string';

  camelize('innerHTML');                   // 'innerHTML'
  camelize('action_name');                 // 'actionName'
  camelize('css-class-name');              // 'cssClassName'
  camelize('my favorite items');           // 'myFavoriteItems'
  camelize('My Favorite Items');           // 'myFavoriteItems'
  camelize('private-docs/owner-invoice');  // 'privateDocs/ownerInvoice'
  ```

  @method camelize
  @param {String} str The string to camelize.
  @return {String} the camelized string.
  @public
  @deprecated Add `@ember/string` to your package.json
*/
export function camelize(str: string): string {
  deprecateImportFromInternalString();
  return CAMELIZE_CACHE.get(str);
}

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
  @public
  @deprecated Add `@ember/string` to your package.json
*/
export function classify(str: string): string {
  deprecateImportFromInternalString();
  return CLASSIFY_CACHE.get(str);
}

/**
  More general than decamelize. Returns the lower\_case\_and\_underscored
  form of a string.

  ```javascript
  import { underscore } from '@ember/string';

  underscore('innerHTML');                 // 'inner_html'
  underscore('action_name');               // 'action_name'
  underscore('css-class-name');            // 'css_class_name'
  underscore('my favorite items');         // 'my_favorite_items'
  underscore('privateDocs/ownerInvoice');  // 'private_docs/owner_invoice'
  ```

  @method underscore
  @param {String} str The string to underscore.
  @return {String} the underscored string.
  @public
  @deprecated Add `@ember/string` to your package.json
*/
export function underscore(str: string): string {
  deprecateImportFromInternalString();
  return UNDERSCORE_CACHE.get(str);
}

/**
  Returns the Capitalized form of a string

  ```javascript
  import { capitalize } from '@ember/string';

  capitalize('innerHTML')                 // 'InnerHTML'
  capitalize('action_name')               // 'Action_name'
  capitalize('css-class-name')            // 'Css-class-name'
  capitalize('my favorite items')         // 'My favorite items'
  capitalize('privateDocs/ownerInvoice'); // 'PrivateDocs/ownerInvoice'
  ```

  @method capitalize
  @param {String} str The string to capitalize.
  @return {String} The capitalized string.
  @public
  @deprecated Add `@ember/string` to your package.json
*/
export function capitalize(str: string): string {
  deprecateImportFromInternalString();
  return CAPITALIZE_CACHE.get(str);
}

function deprecateImportFromInternalString() {
  deprecate(
    'Importing from `@ember/string` without having the `@ember/string` package in your project is deprecated. Please add `@ember/string` to your `package.json',
    false,
    {
      id: 'ember-string.add-package',
      for: 'ember-source',
      since: {
        available: '4.10',
        enabled: '4.10',
      },
      until: '5.0.0',
      url: 'https://deprecations.emberjs.com/v4.x/#toc_ember-string-add-package',
    }
  );
}

function deprecateImportFromString(
  name: string,
  message = `Importing ${name} from '@ember/string' is deprecated. Please import ${name} from '@ember/template' instead.`
) {
  deprecate(message, false, {
    id: 'ember-string.htmlsafe-ishtmlsafe',
    for: 'ember-source',
    since: {
      available: '4.10',
      enabled: '4.10',
    },
    until: '5.0.0',
    url: 'https://deprecations.emberjs.com/v3.x/#toc_ember-string-htmlsafe-ishtmlsafe',
  });
}

export function htmlSafe(str: string): SafeString {
  deprecateImportFromString('htmlSafe');

  return internalHtmlSafe(str);
}

export function isHTMLSafe(str: unknown): str is SafeString {
  deprecateImportFromString('isHTMLSafe');

  return internalIsHtmlSafe(str);
}
