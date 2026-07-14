'use strict';

const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const assert = require('node:assert/strict');

const workflowPath = path.join(__dirname, '..', '.github', 'workflows', 'test.yml');

test('pushとプルリクエストでテストと構文チェックを実行する', () => {
    assert.equal(
        fs.existsSync(workflowPath),
        true,
        'GitHub Actionsのテストワークフローが必要です'
    );

    const workflow = fs.readFileSync(workflowPath, 'utf8');

    assert.match(workflow, /push:/);
    assert.match(workflow, /pull_request:/);
    assert.match(workflow, /run: npm test/);
    assert.match(workflow, /run: npm run test:syntax/);
});
