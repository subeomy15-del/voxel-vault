import test from 'node:test';
import assert from 'node:assert/strict';
import { FieldGoals, DAILY_GOALS, DAILY_REWARD, dailyGoalsKey, dailyGoalsComplete, normalizeDailyGoals, advanceDailyGoals, dailyGoalsMarkup } from '../src/field-goals.js?v=35';
import { freshState, loadState, saveState } from '../src/save.js?v=35';

const seed = 20260918;
const storage = () => ({ data: new Map(), getItem(key) { return this.data.get(key) || null; }, setItem(key, value) { this.data.set(key, value); } });
const completeStats = { mined: 30, crafted: 5, built: 20 };
function makeGame(store = storage(), state = freshState(seed, 'daily')) {
  return {
    storage: store, state, screen: null, events: [], saves: 0, creative: state.mode === 'creative',
    add(item, n) { this.state.inv[item] = (this.state.inv[item] || 0) + n; },
    emit(type, data = {}) { this.events.push({ type, ...data }); },
    toast(title, text, kind) { this.emit('toast', { title, text, kind }); },
    save() { this.saves++; return saveState(this.storage, this.state); },
    audio: { play() {} }
  };
}

test('daily records reject mismatched worlds and malformed progress', () => {
  const raw = { version: 1, seed, progress: { mined: Infinity, crafted: '5', built: -20, kills: 200 }, rewarded: 'true' };
  assert.deepEqual(normalizeDailyGoals(raw, seed).progress, { mined: 0, crafted: 0, built: 0 });
  assert.equal(normalizeDailyGoals(raw, seed).rewarded, false);
  const valid = { ...raw, progress: { mined: 400, crafted: 4.9, built: 22 }, rewarded: true };
  assert.deepEqual(normalizeDailyGoals(valid, seed).progress, { mined: 30, crafted: 4, built: 20 });
  assert.equal(normalizeDailyGoals(valid, seed).rewarded, false, 'incomplete records cannot claim a reward');
  assert.deepEqual(normalizeDailyGoals(valid, seed + 1).progress, { mined: 0, crafted: 0, built: 0 });
  assert.deepEqual(normalizeDailyGoals({ ...valid, version: 0 }, seed).progress, { mined: 0, crafted: 0, built: 0 });
  assert.equal(normalizeDailyGoals(null, seed).seed, seed);
});

test('goals can finish in any order and never lose progress after resetting a daily world', () => {
  const initial = normalizeDailyGoals(null, seed);
  const built = advanceDailyGoals(initial, { built: 20 });
  assert.equal(built.progress.built, 20);
  assert.equal(initial.progress.built, 0, 'advancing does not mutate its input');
  const reset = advanceDailyGoals(built, { mined: 3, crafted: 2, built: 0 });
  assert.deepEqual(reset.progress, { mined: 3, crafted: 2, built: 20 });
  assert.equal(dailyGoalsComplete(reset), false);
  assert.equal(dailyGoalsComplete(advanceDailyGoals(reset, completeStats)), true);
});

test('daily HUD has accurate, accessible progress and an actionable next step', () => {
  const record = advanceDailyGoals(normalizeDailyGoals(null, seed), { mined: 30, crafted: 2 });
  const html = dailyGoalsMarkup(record);
  assert.match(html, /DAILY EXPEDITION · 1 \/ 3/);
  assert.match(html, /aria-label="Craft 5 batches: 2 of 5"/);
  assert.match(html, /<progress max="5" value="2"/);
  assert.match(html, /data-action="craft"/);
  assert.match(html, /\+45 aura & 3 bread/);
  const malformed = dailyGoalsMarkup({ version: 1, seed: '<script>', progress: { mined: '<img>' } });
  assert.doesNotMatch(malformed, /<script>|<img>/);
});

test('adventure and creative worlds do not acquire daily goals or rewards', () => {
  for (const mode of ['adventure', 'creative', 'ender']) {
    const game = makeGame(storage(), freshState(seed, mode));
    Object.assign(game.state.stats, completeStats);
    const goals = new FieldGoals(game);
    goals.update(.1);
    assert.equal(goals.active, false);
    assert.equal(goals.markup(), '');
    assert.equal(game.storage.data.size, 0);
    assert.equal(game.saves, 0);
    assert.equal(game.events.length, 0);
  }
});

test('completed expedition awards food and aura exactly once, including after reload', () => {
  const game = makeGame(), bread = game.state.inv.bread || 0;
  const goals = new FieldGoals(game);
  Object.assign(game.state.stats, completeStats);
  goals.update(.1);
  assert.equal(game.state.inv.bread, bread + DAILY_REWARD.bread);
  assert.equal(game.state.aura, DAILY_REWARD.aura);
  assert.equal(game.saves, 1);
  goals.update(.1);
  goals.update(.1);
  assert.equal(game.saves, 1);
  const restoredState = loadState(game.storage, 'daily');
  assert.ok(restoredState);
  const reloaded = makeGame(game.storage, restoredState);
  new FieldGoals(reloaded).update(.1);
  assert.equal(reloaded.saves, 0);
  assert.equal(reloaded.state.inv.bread, bread + DAILY_REWARD.bread);
  assert.equal(reloaded.state.aura, DAILY_REWARD.aura);
  assert.equal(game.events.filter(event => event.type === 'dailyComplete').length, 1);
});

test('completion marker is durable before the inventory reward is granted', () => {
  const game = makeGame();
  Object.assign(game.state.stats, completeStats);
  const originalAdd = game.add;
  game.add = function(item, n) {
    assert.equal(JSON.parse(this.storage.getItem(dailyGoalsKey(seed))).rewarded, true);
    originalAdd.call(this, item, n);
  };
  new FieldGoals(game).update(.1);
  assert.match(dailyGoalsMarkup(JSON.parse(game.storage.getItem(dailyGoalsKey(seed)))), /reward collected/);
});

test('restarting the same daily seed cannot farm rewards; a new day has fresh goals', () => {
  const game = makeGame(), goals = new FieldGoals(game);
  Object.assign(game.state.stats, completeStats);
  goals.update(.1);
  game.state = freshState(seed, 'daily');
  goals.update(.1);
  Object.assign(game.state.stats, completeStats);
  goals.update(.1);
  assert.equal(game.state.aura, 0);
  game.state = freshState(seed + 1, 'daily');
  goals.update(.1);
  assert.deepEqual(goals.record.progress, { mined: 0, crafted: 0, built: 0 });
  Object.assign(game.state.stats, completeStats);
  goals.update(.1);
  assert.equal(game.state.aura, DAILY_REWARD.aura);
});

test('old daily saves credit existing stats without needing new world-save fields', () => {
  const game = makeGame();
  game.state.stats = { mined: 18, crafted: 3, built: 9 };
  const goals = new FieldGoals(game);
  goals.update(.1);
  assert.deepEqual(goals.record.progress, { mined: 18, crafted: 3, built: 9 });
  assert.equal(game.state.aura, 0);
  assert.equal(game.state.fieldGoals, undefined);
  assert.deepEqual(JSON.parse(game.storage.getItem(dailyGoalsKey(seed))).progress, goals.record.progress);
});

test('paused screens defer completion and do not flood storage on unchanged frames', () => {
  const game = makeGame(), goals = new FieldGoals(game);
  let writes = 0;
  const originalSet = game.storage.setItem;
  game.storage.setItem = function(...args) { writes++; originalSet.apply(this, args); };
  game.screen = 'craft';
  Object.assign(game.state.stats, completeStats);
  goals.update(.1);
  assert.equal(writes, 0);
  game.screen = null;
  goals.update(.1);
  const completionWrites = writes;
  for (let i = 0; i < 200; i++) goals.update(.016);
  assert.equal(writes, completionWrites);
  assert.equal(game.state.aura, DAILY_REWARD.aura);
});

test('corrupt or unavailable storage still supports one reward per seed in the current session', () => {
  const blocked = { getItem() { throw Error('Blocked'); }, setItem() { throw Error('Blocked'); } };
  for (const store of [blocked, { getItem: () => '{oops', setItem() {} }]) {
    const game = makeGame(store), goals = new FieldGoals(game);
    Object.assign(game.state.stats, completeStats);
    assert.doesNotThrow(() => goals.update(.1));
    goals.update(.1);
    game.screen = 'pause'; goals.update(.1);
    game.screen = null; goals.update(.1);
    assert.equal(game.state.aura, DAILY_REWARD.aura);
    assert.equal(goals.record.rewarded, true);
  }
  assert.equal(DAILY_GOALS.length, 3);
});
