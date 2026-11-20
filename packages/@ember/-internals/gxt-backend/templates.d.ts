// Types of templates.gts: gxt template functions (`this` is the render's
// context).
export type GxtTemplateFunction = (this: object, ...args: unknown[]) => object;

export declare const OutletTemplate: GxtTemplateFunction;
export declare function routeWrapperTemplate(RouteWrapper: object): GxtTemplateFunction;
export declare function buildTimeComponentTemplate(Invoker: object): GxtTemplateFunction;
