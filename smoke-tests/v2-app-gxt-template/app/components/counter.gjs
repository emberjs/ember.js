<template>
  <p data-test-bt-count>BT Count: {{@count}}</p>
  <button
    type="button"
    data-test-bt-increment
    {{on "click" @increment}}
  >+1 (build-time)</button>
</template>
