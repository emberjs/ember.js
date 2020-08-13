import { SerializedTemplateWithLazyBlock, Dict } from '@glimmer/interfaces';
import { SimpleElement } from '@simple-dom/interface';

/**
 * This abstracts a tracked root.
 */
export interface Cell<T> {
  get(): T;
  set(value: T): void;
}

export type ComponentArgs = Readonly<Dict<any>>;

export interface Benchmark {
  /**
   * Register a template only component
   * @param name
   * @param template
   */
  templateOnlyComponent(name: string, template: SerializedTemplateWithLazyBlock<unknown>): void;

  /**
   * Register a basic component
   * @param name
   * @param template
   * @param component
   */
  basicComponent<TComponent extends object = object>(
    name: string,
    template: SerializedTemplateWithLazyBlock<unknown>,
    component: new (args: ComponentArgs) => TComponent
  ): void;

  /**
   * Compile the benchmark
   * @param entry the entry template compiled with precompile
   */
  compile(entry: SerializedTemplateWithLazyBlock<unknown>): RenderBenchmark;
}

/**
 * Render the benchmark
 * @param element - the element to append to.
 * @param root - root state.
 * @param isInteractive - whether we are in SSR mode.
 */
export type RenderBenchmark = (
  element: SimpleElement | HTMLElement,
  root: Dict<unknown>,
  isInteractive?: boolean
) => Promise<UpdateBenchmark>;

/**
 * Update the benchmark.
 * @param name - the name of the measure. The marks used will be `${measure}Start` and `${measure}End`.
 * @param doUpdate - a callback that will do the mutation, the measure will be from before the callback until it is rendered.
 */
export type UpdateBenchmark = (name: string, doUpdate: () => void) => Promise<void>;
