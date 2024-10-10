import { ComponentRenderer } from '@ember/-internals/strict-renderer';
import { compile } from './compiler';
import { asModule } from './as-module';
import { TrackedObject } from 'tracked-built-ins';

const owner = {};
const renderer = new ComponentRenderer(owner, document, {
  isInteractive: true,
  hasDOM: true,
});

const componentModule = await compile(/*ts*/ `
  import { TrackedObject } from 'tracked-built-ins';
  import { tracked } from '@glimmer/tracking';

  class Hello {
    @tracked greeting: string;
  }

  export const hello = new Hello()

  export const object = new TrackedObject({
    object: 'world',
  });

  class MyComponent {
    <template>Hi</template>
  }

  <template>
  {{~#let hello.greeting object.object as |greeting object|~}}
    <p><Paragraph @greeting={{greeting}} @kind={{@kind}} @object={{object}} /></p>
  {{~/let~}}
  </template>

  const Paragraph = <template>
    <p>
      <Word @word={{@greeting}} />
      <Word @word={{@kind}} />
      <Word @word={{@object}} />
    </p>
  </template>

  const Word = <template>
    <span>{{@word}}</span>
  </template>
`);

const {
  default: component,
  hello,
  object,
} = await asModule<{
  default: object;
  hello: { greeting: string };
  object: { object: string };
}>(componentModule.code);

hello.greeting = 'hello';
object.object = 'world';
const args = new TrackedObject({ kind: 'great' });

const element = document.createElement('div');
document.body.appendChild(element);

renderer.render(component, { element, args });

await delay(1000);

hello.greeting = 'goodbye';

await delay(1000);

args.kind = 'cruel';

await delay(1000);

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
