import { CompileTimeProgram } from '@glimmer/interfaces';
import {
  LazyOpcodeBuilder,
  Macros,
  OpcodeBuilderConstructor,
  TemplateOptions
} from '@glimmer/opcode-compiler';
import { LazyConstants, Program } from '@glimmer/program';
import { getOwner } from 'ember-utils';
import { TemplateMeta } from 'ember-views';
import CompileTimeLookup from './compile-time-lookup';
import RuntimeResolver from './resolver';
import { populateMacros } from './syntax';

export default class CompileOptions implements TemplateOptions<TemplateMeta> {
  program: CompileTimeProgram;
  macros: Macros;
  Builder: OpcodeBuilderConstructor;
  resolver: CompileTimeLookup;

  constructor(resolver: RuntimeResolver) {
    const program = new Program(new LazyConstants(resolver));
    const macros = new Macros();
    populateMacros(macros.blocks, macros.inlines);
    this.program = program;
    this.macros = macros;
    this.resolver = new CompileTimeLookup(resolver);
    this.Builder = LazyOpcodeBuilder as OpcodeBuilderConstructor;
  }

  static create(injections: any) {
    const resolver = new RuntimeResolver(getOwner(injections));
    return new this(resolver);
  }
}
