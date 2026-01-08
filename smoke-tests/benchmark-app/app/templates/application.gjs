import { TheTable } from './the-table.gjs';
import { Jumbotron } from './jumbotron.gjs';

<template>
  <div id="main">
    <div class="container">
      <Jumbotron />
      <TheTable />

      <span
        class="preloadicon glyphicon glyphicon-remove"
        aria-hidden="true"
      ></span>
    </div>
  </div>
</template>