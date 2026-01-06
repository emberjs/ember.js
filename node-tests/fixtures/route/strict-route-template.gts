import type { TOC } from '@ember/component/template-only';
import { pageTitle } from 'ember-page-title';

interface FooSignature {
  Args: {
    model: unknown;
    controller: unknown;
  };
}

<template>
  {{pageTitle "Foo"}}
  {{outlet}}
</template> satisfies TOC<FooSignature>;
