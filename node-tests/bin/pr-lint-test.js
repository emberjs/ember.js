'use strict';

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const chai = require('ember-cli-blueprint-test-helpers/chai');
const expect = chai.expect;

const SCRIPT_PATH = path.resolve(__dirname, '../../bin/pr-lint.mjs');

function writeJson(filePath, value) {
  fs.writeFileSync(filePath, JSON.stringify(value, null, 2));
}

function runLint({ title, commits }) {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ember-pr-lint-'));
  const eventPath = path.join(tempDir, 'event.json');
  const commitsPath = path.join(tempDir, 'commits.json');

  const eventPayload = {
    pull_request: {
      title,
      number: 123,
      base: {
        repo: {
          owner: { login: 'emberjs' },
          name: 'ember.js',
        },
      },
      head: {
        sha: 'deadbeef',
      },
    },
  };

  writeJson(eventPath, eventPayload);
  writeJson(commitsPath, commits);

  const result = spawnSync(process.execPath, [SCRIPT_PATH], {
    env: {
      ...process.env,
      GITHUB_EVENT_PATH: eventPath,
      GITHUB_EVENT_NAME: 'pull_request',
      PR_LINT_COMMITS_PATH: commitsPath,
    },
    encoding: 'utf8',
  });

  return result;
}

describe('bin/pr-lint', function () {
  it('passes with valid tags', function () {
    const result = runLint({
      title: '[BUGFIX beta] Fix broken thing',
      commits: [
        {
          sha: 'abc1234',
          commit: { message: '[BUGFIX beta] Fix broken thing' },
        },
        {
          sha: 'def5678',
          commit: { message: '[DOC canary] Update docs' },
        },
      ],
    });

    expect(result.status).to.equal(0);
    expect(result.stderr).to.equal('');
    expect(result.stdout).to.contain('PR lint passed');
  });

  it('passes with no tag', function () {
    const result = runLint({
      title: 'Misc cleanup',
      commits: [
        {
          sha: 'abc1234',
          commit: { message: 'Misc cleanup' },
        },
      ],
    });

    expect(result.status).to.equal(0);
    expect(result.stderr).to.equal('');
    expect(result.stdout).to.contain('PR lint passed');
  });

  it('fails on invalid CLEANUP tag in PR title', function () {
    const result = runLint({
      title: '[CLEANUP beta] Cleanup stuff',
      commits: [
        {
          sha: 'abc1234',
          commit: { message: '[CLEANUP] Cleanup stuff' },
        },
      ],
    });

    expect(result.status).to.equal(1);
    expect(result.stderr).to.contain('PR title: invalid CLEANUP tag');
  });

  it('fails on invalid commit tag', function () {
    const result = runLint({
      title: '[DOC beta] Documentation update',
      commits: [
        {
          sha: 'abc1234',
          commit: { message: '[DOC alpha] Documentation update' },
        },
      ],
    });

    expect(result.status).to.equal(1);
    expect(result.stderr).to.contain('Commit abc1234: invalid DOC tag');
  });
});