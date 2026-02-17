/**
 *
 * Can we design a runtime that is both fast and eliminates complexity from our language server tooling?
 *
 */
export function emitText(text: string): void {}
export function emitComponent<Signature>(
  component: ComponentLike<Signature>,
  args: Args
): ElementFor<Signature> {}

export function emitElement<TagName extends string>(
  tagName: TagName,
  staticAttributes: AttributesFor<TagName>
): Element {}

/**
 * to elements and components
 */
export function applyAttributes<Element>(
  element: Element,
  dynamicAttributes: Record<string, () => string>
) {}
export function applyModifier<Element>(element: Element, modifier: ModifierLike, args: Args) {}

/**
 * e.g.: <template shadowrootmode="open">
 *
 * TODO: I don't know how this would work yet
 */
export function emitTemplate() {}
