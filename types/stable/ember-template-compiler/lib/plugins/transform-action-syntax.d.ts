declare module 'ember-template-compiler/lib/plugins/transform-action-syntax' {
  import type { ASTPlugin } from '@glimmer/syntax';
  import type { EmberASTPluginEnvironment } from 'ember-template-compiler/lib/types';
  /**
     @module ember
    */
  /**
      A Glimmer2 AST transformation that replaces all instances of

      ```handlebars
     <button {{action 'foo'}}>
     <button onblur={{action 'foo'}}>
     <button onblur={{action (action 'foo') 'bar'}}>
      ```

      with

      ```handlebars
     <button {{action this 'foo'}}>
     <button onblur={{action this 'foo'}}>
     <button onblur={{action this (action this 'foo') 'bar'}}>
      ```

      @private
      @class TransformActionSyntax
    */
  export default function transformActionSyntax({ syntax }: EmberASTPluginEnvironment): ASTPlugin;
}
