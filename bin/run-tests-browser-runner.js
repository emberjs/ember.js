'use strict';
/* eslint-disable no-console, node/no-unsupported-features */
const puppeteer = require('puppeteer');
const chalk = require('chalk');
const fs = require('fs');

module.exports = class BroswerRunner {
  constructor() {
    this.resolveTest = undefined;
    this.rejectTest = undefined;
    this._browser = undefined;
    this._page = undefined;
  }

  async run(url, attempts) {
    let result = await this.getResultWithRetry(url, attempts);
    var failed = !result || !result.total || result.failed;
    if (failed) {
      throw result;
    }
    return result;
  }

  async getResultWithRetry(url, attempts) {
    while (attempts > 0) {
      try {
        return await this.getResult(url);
      } catch (err) {
        attempts--;
        if (attempts > 0) {
          console.log(chalk.red(err.toString()));
          console.log(chalk.yellow('Retrying... ¯\\_(ツ)_/¯'));
        } else {
          console.log(chalk.red('Giving up! (╯°□°)╯︵ ┻━┻'));
          throw err;
        }
      }
    }
  }

  async getResult(url) {
    let test = new Promise((resolve, reject) => {
      this.resolveTest = resolve;
      this.rejectTest = reject;
    });
    let page = await this.page();
    await page.goto(url);
    return await test;
  }

  browser() {
    if (this._browser === undefined) {
      this._browser = this.newBrowser();
    }
    return this._browser;
  }

  page() {
    if (this._page === undefined) {
      this._page = this.newPage();
    }
    return this._page;
  }

  async newBrowser() {
    let browser = await puppeteer.launch({
      dumpio: true,
      args: ['--js-flags=--allow-natives-syntax --expose-gc'],
    });
    return browser;
  }

  async newPage() {
    let browser = await this.browser();
    let oldPages = await browser.pages();
    let newPage = await browser.newPage();

    // close existing pages
    for (let oldPage of oldPages) {
      try {
        await oldPage.close();
      } catch (e) {
        console.error(e);
      }
    }

    // corresponds to Inspector.targetCrashed
    newPage.once('error', this.onError.bind(this));

    await newPage.evaluateOnNewDocument(
      fs.readFileSync(__dirname + '/run-tests-injection.js', 'utf8')
    );

    await newPage.exposeFunction('sendMessageToHost', this.onMessage.bind(this));

    return newPage;
  }

  onMessage(message) {
    if (message && message.name === 'QUnit.done') {
      this.resolveTest(message.data);
    }
  }

  onError(err) {
    // reject current test run and retry
    this.rejectTest(err);
    this._page = undefined;
  }
};
