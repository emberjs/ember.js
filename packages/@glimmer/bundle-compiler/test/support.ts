import { CompilerDelegate, Specifier } from "@glimmer/bundle-compiler";

export class TestCompilerDelegate implements CompilerDelegate {
  hasComponentInScope(componentName: string, referrer: Specifier): boolean {
    throw new Error("Method not implemented.");
  }
  resolveComponentSpecifier(componentName: string, referrer: Specifier): Specifier {
    throw new Error("Method not implemented.");
  }
  getComponentCapabilities(specifier: Specifier): ComponentCapabilities {
    throw new Error("Method not implemented.");
  }
  getComponentLayout(specifier: Specifier): SerializedTemplateBlock {
    throw new Error("Method not implemented.");
  }
  hasHelperInScope(helperName: string, referer: Specifier): boolean {
    throw new Error("Method not implemented.");
  }
  resolveHelperSpecifier(helperName: string, referer: Specifier): Specifier {
    throw new Error("Method not implemented.");
  }
  hasModifierInScope(modifierName: string, referer: Specifier): boolean {
    throw new Error("Method not implemented.");
  }
  resolveModifierSpecifier(modifierName: string, referer: Specifier): Specifier {
    throw new Error("Method not implemented.");
  }
  hasPartialInScope(partialName: string, referer: Specifier): boolean {
    throw new Error("Method not implemented.");
  }
  resolvePartialSpecifier(partialName: string, referer: Specifier): Specifier {
    throw new Error("Method not implemented.");
  }
}