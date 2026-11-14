/* global process */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
const dir = fileURLToPath(new URL('.', import.meta.url));
test('journey refuses the RSpec database before starting a browser', () => {
  const result = spawnSync(process.execPath, [dir + 'journey.mjs'], {
    env: { ...process.env, L6_CRM_DIR: '/unused', L6_CAPTURE_DIR: '/unused', POSTGRES_DATABASE: 'evo_l_test' }, encoding: 'utf8',
  });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /POSTGRES_DATABASE must be evo_l_ui_test/);
});
for (const fixture of ['server.rb', 'process.rb']) {
  test(`${fixture} refuses the RSpec database before writing`, () => {
    const code = `require 'ostruct'; Rails = OpenStruct.new(env: OpenStruct.new(test?: true)); module ActiveRecord; Base = OpenStruct.new(connection_db_config: OpenStruct.new(database: 'evo_l_test')); end; load ARGV.fetch(0)`;
    const result = spawnSync('ruby', ['-e', code, dir + fixture], {
      env: { ...process.env, POSTGRES_HOST: '127.0.0.1', REDIS_URL: 'redis://127.0.0.1:56389' }, encoding: 'utf8',
    });
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /synthetic database only/);
  });
}
