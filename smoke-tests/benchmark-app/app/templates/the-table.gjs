import Component from '@glimmer/component';
import { fn } from '@ember/helper';
import { service } from '@ember/service';

/**
 * We currently don't have a way to emit HTML with no invisible characters
 * and have the template look nice.
 *
 * The krausest benchmark markup has no whitespace between the cells of a row,
 * so the `<template>`s below are deliberately written as single (long) lines --
 * any newline/indentation inside `<tr>` or `<td>` would emit extra text nodes
 * that aren't in the reference implementation.
 */

/**
 * One `@glimmer/component` per `<td>`.
 */
export class Td extends Component {
  <template><td ...attributes>{{yield}}</td></template>
}

/**
 * One `@glimmer/component` per `<tr>`.
 *
 * `@state` is threaded down from `TheTable` rather than injected here so that
 * the per-row cost stays component instantiation, not owner/service lookup.
 */
export class Row extends Component {
  get isSelected() {
    return this.args.state.isSelected(this.args.row);
  }

  <template><tr class={{if this.isSelected "danger"}}><Td class="col-md-1">{{@row.id}}</Td><Td class="col-md-4"><a data-test-select onclick={{fn @state.select @row}}>{{@row.label.current}}</a></Td><Td class="col-md-1"><a data-test-remove onclick={{fn @state.remove @row}}><span class="glyphicon glyphicon-remove" aria-hidden="true" /></a></Td><Td class="col-md-6" /></tr></template>
}

export class TheTable extends Component {
  @service state;

  <template>
    <table class="table table-hover table-striped test-data">
      <tbody>
        {{#each this.state.data as |row|}}
          <Row @row={{row}} @state={{this.state}} />
        {{/each}}
      </tbody>
    </table>
  </template>
}
