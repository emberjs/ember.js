declare module 'ember-template-compiler/lib/system/bootstrap' {
  /**
    @module ember
    */
  import type { TemplateFactory } from '@glimmer/interfaces';
  export interface BootstrapOptions {
    context?: Document | HTMLElement;
    hasTemplate(templateName: string): boolean;
    setTemplate(templateName: string, template: TemplateFactory): void;
  }
  /**
      Find templates stored in the head tag as script tags and make them available
      to `Ember.CoreView` in the global `Ember.TEMPLATES` object.

      Script tags with `text/x-handlebars` will be compiled
      with Ember's template compiler and are suitable for use as a view's template.

      @private
      @method bootstrap
      @for Ember.HTMLBars
      @static
      @param ctx
    */
  function bootstrap({ context, hasTemplate, setTemplate }: BootstrapOptions): void;
  export default bootstrap;
}
