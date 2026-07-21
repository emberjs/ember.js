import { LinkTo } from '@ember/routing';

<template>
  <h3 data-test-sort>{{@controller.sort}}</h3>
  <LinkTo @route="about" data-test-to-about>About</LinkTo>
</template>
