import {
  CompilableProgram,
  CompileTimeResolverDelegate,
  ComponentCapabilities,
  OpaqueTemplateMeta,
  Option,
} from '@glimmer/interfaces';

export class TutorialResolver implements CompileTimeResolverDelegate {
  getCapabilities(_handle: number): ComponentCapabilities {
    throw new Error('Method not implemented.');
  }

  getLayout(_handle: number): Option<CompilableProgram> {
    throw new Error('Method not implemented.');
  }

  lookupHelper(_name: string, _referrer: OpaqueTemplateMeta): Option<number> {
    throw new Error('Method not implemented.');
  }

  lookupModifier(_name: string, _referrer: OpaqueTemplateMeta): Option<number> {
    throw new Error('Method not implemented.');
  }

  lookupComponentDefinition(_name: string, _referrer: Option<OpaqueTemplateMeta>): Option<number> {
    throw new Error('Method not implemented.');
  }

  lookupPartial(_name: string, _referrer: OpaqueTemplateMeta): Option<number> {
    throw new Error('Method not implemented.');
  }

  resolve(_handle: number): OpaqueTemplateMeta {
    throw new Error('Method not implemented.');
  }
}
