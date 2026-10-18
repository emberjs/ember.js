import { LinkTo } from '@ember/routing';

<template>
  <nav>
    <LinkTo @route="index" data-test-link-index>Home</LinkTo>
    <LinkTo @route="about" data-test-link-about>About</LinkTo>
  </nav>
  <main>{{outlet}}</main>
</template>
