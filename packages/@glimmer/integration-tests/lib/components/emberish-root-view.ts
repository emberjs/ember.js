import { preprocess } from '../compile';
import {
  JitRuntimeContext,
  SyntaxCompilationContext,
  Template,
  Option,
  TemplateMeta,
} from '@glimmer/interfaces';
import { assertElement, firstElementChild } from '../dom/simple-utils';
import { UpdatableReference } from '@glimmer/reference';
import { renderJitMain, clientBuilder } from '@glimmer/runtime';
import { SimpleElement } from '@simple-dom/interface';
import { assign } from '@glimmer/util';

export class EmberishRootView {
  private template: Template;
  public element: Option<SimpleElement> = null;

  constructor(
    private runtime: JitRuntimeContext<TemplateMeta>,
    private syntax: SyntaxCompilationContext,
    template: string,
    state?: Object
  ) {
    this.template = preprocess(template);
    assign(this, state);
  }

  appendTo(selector: string) {
    let element = assertElement(document.querySelector(selector) as SimpleElement);
    let self = new UpdatableReference(this);
    let cursor = { element, nextSibling: null };

    let templateIterator = renderJitMain(
      this.runtime,
      this.syntax,
      self,
      clientBuilder(this.runtime.env, cursor),
      this.template.asLayout().compile(this.syntax)
    );
    let result;
    do {
      result = templateIterator.next();
    } while (!result.done);

    this.element = firstElementChild(element)!;
  }
}
