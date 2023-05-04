/**
@module @ember/component
*/
import { type Opaque } from '@ember/-internals/utility-types';
import { action } from '@ember/object';
import TextareaTemplate from '../templates/textarea';
import AbstractInput from './abstract-input';
import { type OpaqueInternalComponentConstructor, opaquify } from './internal';

/**
  The `Textarea` component inserts a new instance of `<textarea>` tag into the template.

  The `@value` argument provides the content of the `<textarea>`.

  This template:

  ```handlebars
  <Textarea @value="A bunch of text" />
  ```

  Would result in the following HTML:

  ```html
  <textarea class="ember-text-area">
    A bunch of text
  </textarea>
  ```

  The `@value` argument is two-way bound. If the user types text into the textarea, the `@value`
  argument is updated. If the `@value` argument is updated, the text in the textarea is updated.

  In the following example, the `writtenWords` property on the component will be updated as the user
  types 'Lots of text' into the text area of their browser's window.

  ```app/components/word-editor.js
  import Component from '@glimmer/component';
  import { tracked } from '@glimmer/tracking';

  export default class WordEditorComponent extends Component {
    @tracked writtenWords = "Lots of text that IS bound";
  }
  ```

  ```handlebars
  <Textarea @value={{writtenWords}} />
  ```

  Would result in the following HTML:

  ```html
  <textarea class="ember-text-area">
    Lots of text that IS bound
  </textarea>
  ```

  If you wanted a one way binding, you could use the `<textarea>` element directly, and use the
  `value` DOM property and the `input` event.

  ### Actions

  The `Textarea` component takes a number of arguments with callbacks that are invoked in
  response to user events.

  * `enter`
  * `insert-newline`
  * `escape-press`
  * `focus-in`
  * `focus-out`
  * `key-press`

  These callbacks are passed to `Textarea` like this:

  ```handlebars
  <Textarea @value={{this.searchWord}} @enter={{this.query}} />
  ```

  ## Classic Invocation Syntax

  The `Textarea` component can also be invoked using curly braces, just like any other Ember
  component.

  For example, this is an invocation using angle-bracket notation:

  ```handlebars
  <Textarea @value={{this.searchWord}} @enter={{this.query}} />
  ```

  You could accomplish the same thing using classic invocation:

  ```handlebars
  {{textarea value=this.searchWord enter=this.query}}
  ```

  The main difference is that angle-bracket invocation supports any HTML attribute using HTML
  attribute syntax, because attributes and arguments have different syntax when using angle-bracket
  invocation. Curly brace invocation, on the other hand, only has a single syntax for arguments,
  and components must manually map attributes onto component arguments.

  When using classic invocation with `{{textarea}}`, only the following attributes are mapped onto
  arguments:

  * rows
  * cols
  * name
  * selectionEnd
  * selectionStart
  * autocomplete
  * wrap
  * lang
  * dir
  * value

  ## Classic `layout` and `layoutName` properties

  Because HTML `textarea` elements do not contain inner HTML the `layout` and
  `layoutName` properties will not be applied.

  @method Textarea
  @for Ember.Templates.components
  @public
*/

/**
  See Ember.Templates.components.Textarea.

  @method textarea
  @for Ember.Templates.helpers
  @see {Ember.Templates.components.Textarea}
  @public
*/

/**
  An opaque interface which can be imported and used in strict-mode
  templates to call <Textarea>.

  See [Ember.Templates.components.Textarea](/ember/release/classes/Ember.Templates.components/methods/Textarea?anchor=Input).

  @for @ember/component
  @method Textarea
  @see {Ember.Templates.components.Textarea}
  @public
**/
class _Textarea extends AbstractInput {
  static toString(): string {
    return 'Textarea';
  }

  get class(): string {
    return 'ember-text-area ember-view';
  }

  // See abstract-input.ts for why these are needed

  @action change(event: Event): void {
    super.change(event);
  }

  @action input(event: Event): void {
    super.input(event);
  }

  protected isSupportedArgument(name: string): boolean {
    let supportedArguments = ['type', 'value', 'enter', 'insert-newline', 'escape-press'];
    return supportedArguments.indexOf(name) !== -1 || super.isSupportedArgument(name);
  }
}

const Textarea = opaquify(_Textarea, TextareaTemplate) as Textarea;
interface Textarea extends Opaque<'component:textarea'>, OpaqueInternalComponentConstructor {}
export default Textarea;
