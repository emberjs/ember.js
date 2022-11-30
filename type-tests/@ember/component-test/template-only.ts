import templateOnly, { TemplateOnlyComponent, TOC } from '@ember/component/template-only';
import { expectTypeOf } from 'expect-type';

const to = templateOnly();
expectTypeOf(to).toEqualTypeOf<TemplateOnlyComponent<unknown>>();

expectTypeOf(to.toString()).toBeString();

// @ts-expect-error
new TemplateOnlyComponent();

interface MySig {
  Element: HTMLAnchorElement;
  Args: {
    name: string;
    age: number;
  };
  Blocks: {
    default: [(newName: string) => void];
  };
}

const toc: TOC<MySig> = templateOnly();
expectTypeOf(toc).toEqualTypeOf<TemplateOnlyComponent<MySig>>();

const tocInferred = templateOnly<MySig>();
expectTypeOf(tocInferred).toEqualTypeOf<TemplateOnlyComponent<MySig>>();

const longToc: TemplateOnlyComponent<MySig> = templateOnly();
expectTypeOf(longToc).toEqualTypeOf<TemplateOnlyComponent<MySig>>();
