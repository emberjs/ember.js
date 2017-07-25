import { RenderTests, module, test } from "@glimmer/test-helpers";

class SyntaxErrors extends RenderTests {
  @test "context switching using ../ is not allowed"() {
    this.assert.throws(() => {
      this.env.compile('<div><p>{{../value}}</p></div>');
    }, new Error("Changing context using \"../\" is not supported in Glimmer: \"../value\" on line 1."));
  }

  @test "mixing . and / is not allowed"() {
    this.assert.throws(() => {
      this.env.compile('<div><p>{{a/b.c}}</p></div>');
    }, new Error("Mixing '.' and '/' in paths is not supported in Glimmer; use only '.' to separate property paths: \"a/b.c\" on line 1."));
  }

  @test "explicit self ref with ./ is not allowed"() {
    this.assert.throws(() => {
      this.env.compile('<div><p>{{./value}}</p></div>');
    }, new Error("Using \"./\" is not supported in Glimmer and unnecessary: \"./value\" on line 1."));
  }

  @test "helper invocation with dot-paths are not allowed"() {
    this.assert.throws(() => {
      this.env.compile('{{foo.bar some="args"}}');
    }, new Error("`foo.bar` is not a valid name for a helper on line 1."));
  }

  @test "sub-expression helper invocation with dot-paths are not allowed"() {
    this.assert.throws(() => {
      this.env.compile('{{log (foo.bar some="args")}}');
    }, new Error("`foo.bar` is not a valid name for a helper on line 1."));
  }

  @test "sub-expression modifier invocation with dot-paths are not allowed"() {
    this.assert.throws(() => {
      this.env.compile('<div {{foo.bar some="args"}} />');
    }, new Error("`foo.bar` is not a valid name for a modifier on line 1."));
  }

  @test "Block params in HTML syntax - Throws exception if given zero parameters"() {
    this.assert.throws(() => {
      this.env.compile('<x-bar as ||>foo</x-bar>');
    }, /Cannot use zero block parameters: 'as \|\|'/);

    this.assert.throws(() => {
      this.env.compile('<x-bar as | |>foo</x-bar>');
    }, /Cannot use zero block parameters: 'as \| \|'/);
  }

  @test "Block params in HTML syntax - Throws an error on invalid block params syntax"() {
    this.assert.throws(() => {
      this.env.compile('<x-bar as |x y>{{x}},{{y}}</x-bar>');
    }, /Invalid block parameters syntax: 'as |x y'/);

    this.assert.throws(() => {
      this.env.compile('<x-bar as |x| y>{{x}},{{y}}</x-bar>');
    }, /Invalid block parameters syntax: 'as \|x\| y'/);

    this.assert.throws(() => {
      this.env.compile('<x-bar as |x| y|>{{x}},{{y}}</x-bar>');
    }, /Invalid block parameters syntax: 'as \|x\| y\|'/);
  }

  @test "Block params in HTML syntax - Throws an error on invalid identifiers for params"() {
    this.assert.throws(() => {
      this.env.compile('<x-bar as |x foo.bar|></x-bar>');
    }, /Invalid identifier for block parameters: 'foo\.bar' in 'as \|x foo\.bar|'/);

    this.assert.throws(() => {
      this.env.compile('<x-bar as |x "foo"|></x-bar>');
    }, /Syntax error at line 1 col 17: " is not a valid character within attribute names/);

    this.assert.throws(() => {
      this.env.compile('<x-bar as |foo[bar]|></x-bar>');
    }, /Invalid identifier for block parameters: 'foo\[bar\]' in 'as \|foo\[bar\]\|'/);
  }
}

module('Syntax Errors', SyntaxErrors);
