import test from 'node:test';
import assert from 'node:assert/strict';
import {startupFailure} from '../src/startup-errors.js?v=34';
test('startup errors distinguish unsupported graphics, shaders, workers, assets and unrelated bugs',()=>{
  assert.equal(startupFailure(Error('Error creating WebGL context.')).title,'WebGL is unavailable');
  assert.equal(startupFailure(Error('shader compile failure')).title,'The renderer could not start');
  assert.equal(startupFailure(Error('Failed to construct Worker')).title,'Terrain could not load');
  assert.equal(startupFailure(Error('Failed to fetch dynamically imported module')).title,'A game file could not load');
  assert.equal(startupFailure(Error('Cannot read property state')).title,'Voxel Vault could not start');
  assert.equal(startupFailure(Error('bad JSON'),'save').title,'Your world could not be opened');
});
