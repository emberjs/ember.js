import { LinkTo } from '@ember/routing';
import { hash } from '@ember/helper';

<template>
  <h3 data-test-about>About</h3>
  <LinkTo @route="index" @query={{hash sort="desc"}} data-test-back-sorted>
    Back
  </LinkTo>
</template>
