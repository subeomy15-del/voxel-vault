import { awardAura } from './enchanting.js?v=38';

export const DAILY_GOALS = Object.freeze([
  Object.freeze({ stat: 'mined', target: 30, title: 'Gather 30 blocks', hint: 'Equip your axe or pickaxe. Hold mine on timber and stone to gather building supplies.', action: 'inventory', button: 'Choose a tool' }),
  Object.freeze({ stat: 'crafted', target: 5, title: 'Craft 5 batches', hint: 'Open crafting and turn timber into planks. Each batch counts, including Craft All.', action: 'craft', button: 'Open crafting' }),
  Object.freeze({ stat: 'built', target: 20, title: 'Place 20 blocks', hint: 'Equip blocks from your backpack. Use right click or E to place them and build a foothold.', action: 'inventory', button: 'Choose building blocks' })
]);
export const DAILY_REWARD = Object.freeze({ aura: 45, bread: 3 });
const VERSION = 1;
const seedNumber = seed => Number.isSafeInteger(seed) && seed >= 0 ? seed : 0;
const count = (value, target) => Number.isFinite(value) ? Math.max(0, Math.min(target, Math.floor(value))) : 0;

export const dailyGoalsKey = seed => `voxel-vault-daily-expedition-v${VERSION}-${seedNumber(seed)}`;
export const dailyGoalsComplete = record => DAILY_GOALS.every(goal => record?.progress?.[goal.stat] >= goal.target);

// Kept separately from world saves so older saves work and resetting today's
// world cannot issue today's reward again.
export function normalizeDailyGoals(raw, seed) {
  const record = { version: VERSION, seed: seedNumber(seed), progress: { mined: 0, crafted: 0, built: 0 }, rewarded: false };
  if (!raw || raw.version !== VERSION || raw.seed !== record.seed) return record;
  for (const goal of DAILY_GOALS) record.progress[goal.stat] = count(raw.progress?.[goal.stat], goal.target);
  record.rewarded = raw.rewarded === true && dailyGoalsComplete(record);
  return record;
}

export function advanceDailyGoals(record, stats) {
  const next = normalizeDailyGoals(record, record?.seed);
  for (const goal of DAILY_GOALS) next.progress[goal.stat] = Math.max(next.progress[goal.stat], count(stats?.[goal.stat], goal.target));
  return next;
}

export function dailyGoalsMarkup(raw) {
  const record = normalizeDailyGoals(raw, raw?.seed);
  const complete = dailyGoalsComplete(record);
  const next = DAILY_GOALS.find(goal => record.progress[goal.stat] < goal.target);
  const done = DAILY_GOALS.filter(goal => record.progress[goal.stat] === goal.target).length;
  return `<span class="rift-kicker">DAILY EXPEDITION · ${done} / 3</span><strong>${complete ? 'A foothold in the wilds' : 'Make today’s world yours'}</strong><ol class="daily-goals" aria-label="Daily expedition goals">${DAILY_GOALS.map(goal => {
    const value = record.progress[goal.stat], achieved = value === goal.target;
    return `<li class="${achieved ? 'complete' : ''}"><div><span>${achieved ? '✓ ' : ''}${goal.title}</span><b>${value}/${goal.target}</b></div><progress max="${goal.target}" value="${value}" aria-label="${goal.title}: ${value} of ${goal.target}"></progress></li>`;
  }).join('')}</ol><small class="daily-reward">${record.rewarded ? '✓ Expedition complete · reward collected' : `Finish all three · +${DAILY_REWARD.aura} aura & ${DAILY_REWARD.bread} bread`}</small><small>${complete ? 'Keep building, follow your adventure, or return for a fresh world tomorrow. New daily worlds arrive at 00:00 UTC.' : next.hint}</small><button data-action="${complete ? 'journal' : next.action}">${complete ? 'Continue the adventure' : next.button}</button>`;
}

export class FieldGoals {
  constructor(game) {
    this.game = game;
    this.records = new Map();
    this.lastSignature = '';
  }

  get active() {
    return this.game.state?.mode === 'daily' && Number.isSafeInteger(this.game.state.seed);
  }

  get record() {
    if (!this.active) return null;
    const seed = this.game.state.seed;
    if (!this.records.has(seed)) {
      let raw = null;
      try { raw = JSON.parse(this.game.storage?.getItem(dailyGoalsKey(seed)) || 'null'); } catch { /* Storage may be unavailable. */ }
      this.records.set(seed, normalizeDailyGoals(raw, seed));
    }
    return this.records.get(seed);
  }

  persist(record) {
    this.records.set(record.seed, record);
    try { this.game.storage?.setItem(dailyGoalsKey(record.seed), JSON.stringify(record)); } catch { /* Continue for this session. */ }
  }

  update(_dt) {
    const game = this.game;
    if (!this.active || game.screen) { this.lastSignature = ''; return; }
    const previous = this.record;
    const record = advanceDailyGoals(previous, game.state.stats);
    const signature = `${record.seed}:${record.progress.mined}:${record.progress.crafted}:${record.progress.built}`;
    if (signature === this.lastSignature) return;
    this.lastSignature = signature;
    if (dailyGoalsComplete(record) && !record.rewarded) {
      // Claim before granting: repeated frames, reloads, and restarting the same
      // daily world must never duplicate the completion reward.
      record.rewarded = true;
      this.persist(record);
      game.add('bread', DAILY_REWARD.bread);
      awardAura(game, DAILY_REWARD.aura);
      game.save();
      game.audio.play('reward');
      game.toast('DAILY EXPEDITION COMPLETE', `+${DAILY_REWARD.aura} aura · +${DAILY_REWARD.bread} bread. Your adventure continues!`, 'reward');
      game.emit('dailyComplete', { seed: record.seed });
    } else if (DAILY_GOALS.some(goal => previous.progress[goal.stat] !== record.progress[goal.stat])) {
      this.persist(record);
    }
  }

  markup() { return this.active ? dailyGoalsMarkup(this.record) : ''; }
}
