// import { CompilationOptions, Program } from '@glimmer/runtime';
// import { Resolver } from "@glimmer/interfaces";
// import { TemplateMeta } from "@glimmer/wire-format";
// import { preprocess, ASTPluginBuilder } from "@glimmer/syntax";

// export interface EagerCompilerOptions<T extends TemplateMeta> {
//   meta: T;
//   plugins: ASTPluginBuilder[];
//   id: string;
// }

// export class EagerCompiler<T extends TemplateMeta, Specifier, R extends Resolver<Specifier, T>> {
//   private program: Program;
//   private resolver: R;

//   constructor(private options: CompilationOptions<T, Specifier, R>) {
//     this.program = options.program;
//     this.resolver = options.resolver;
//   }

//   compile(input: string, options: EagerCompilerOptions<T>) {
//     let ast = preprocess(input, options);
//     let { block, meta } = TemplateCompiler.compile(options, ast);
//     let { id } = options;
//   }
// }
