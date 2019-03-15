- [x] isEager shouldn't need to be passed around so much
  - [x] pushYieldableBlock
  - [x] invokeComponent
- [x] resolve handle as an encoder case (instead of passing around the resolver)
- [ ] conditionals and loops in the opcode builder
  - [x] hand-crafted conditionals
  - [ ] generic conditionals?
  - [ ] loops
- [x] more ergonomic solution for concatActions
- [ ] function build in stdlib.ts shouldn't have anys
- [x] do we really need the Locator generic?

- [x] Remove stuff from Compiler
- [x] Remove compiler from CompileTime
- [x] Reorient CompilableTemplate around Context
- [x] Remove OldTemplateCompilationContext
- [ ] Figure out how to correctly cache CompilableTemplates
      based on the input TemplateCompilationContext
- [ ] s/locator/template meta/
