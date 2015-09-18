interface Bounds {
	firstNode(): Node;
	lastNode(): Node;
}

interface MorphClass {
	new<BaseReference> (parentNode: Node, frame: Frame<BaseReference>): Morph;
	specialize(): MorphClass;
}

abstract class Morph {
	abstract init(options: any);
	abstract append();
	abstract update();
	abstract destroy();
}

interface MorphListCallback {
	(morph: Morph);
}

abstract class MorphList {
	abstract forEach(callback: MorphListCallback);
}

interface Bounds {
	firstNode(): Node;
	lastNode(): Node;
}

interface ContentMorph extends Bounds, Morph {}

interface RenderResultOptions<BaseReference> {
	morph: Morph,
	locals: string[],
	morphs: Morph[],
	bounds: Bounds,
	template: Template<BaseReference>
}

interface RenderResultClass {
	new<BaseReference> (options: RenderResultOptions<BaseReference>): RenderResult<BaseReference>;
	build<BaseReference>(morph: Morph, frame: Frame<BaseReference>, template: Template<BaseReference>): RenderResult<BaseReference>;
}

abstract class RenderResult<BaseReference> implements Bounds {
	abstract renderTemplate(template: Template<BaseReference>): RenderResult<BaseReference>;
	abstract rerender();
	abstract firstNode();
	abstract lastNode();
}

import { Spec } from './spec';

interface DOMHelper {}
interface ReferenceClass {}
interface Scope<T> {}

interface EnvironmentClassOptions<ReferenceClass> {
	dom: DOMHelper,
	BaseReference: ReferenceClass
}

interface EnvironmentClass {
	new<T> (options: EnvironmentClassOptions<T>) : Environment<T>;
}

interface Helper {
	(): any;
}

abstract class Environment<BaseReference> {
	abstract pushFrame(scope: Scope<BaseReference>): Frame<BaseReference>;
	abstract createRootScope() : Scope<BaseReference>;
	abstract hasHelper(scope: Scope<BaseReference>, helperName: string[]) : boolean;
	abstract lookupHelper(scope: Scope<BaseReference>, helperName: string[]) : Helper;
}

interface FrameClass {
	new<BaseReference> (env: Environment<BaseReference>, scope: Scope<BaseReference>) : Frame<BaseReference>;
}

abstract class Frame<BaseReference> {
	abstract dom(): DOMHelper;
	abstract childScope(blockArguments: any[]): Scope<BaseReference>;
	abstract scope(): Scope<BaseReference>;
	abstract hasHelper(helperName: string[]): boolean;
	abstract lookupHelper(helperName: string[]): Helper;
}

interface TemplateClass {
	fromSpec<BaseReference>(specs: Spec[]): Template<BaseReference>;
	new<BaseReference> (options: TemplateOptions<BaseReference>): Template<BaseReference>;
}

interface TemplateOptions<BaseReference> {
	meta: Object,
	root: Template<BaseReference>[],
	position: number,
	locals: string[],
	isEmpty: boolean,
	spec: Spec
}

interface EvaluationResult {
	morphs: Morph[],
	bounds: Bounds
}

interface RenderOptions {
	hostOptions?: Object,
	appendTo: HTMLElement
}

abstract class Template<BaseReference> {
	abstract evaluate(morph: Morph, frame: Frame<BaseReference>): EvaluationResult;
	abstract render(self: any, env: Environment<BaseReference>, options: RenderOptions, blockArguments: any[]): RenderResult;
	abstract renderIn(morph: Morph, frame: Frame<BaseReference>): RenderResult; 
}