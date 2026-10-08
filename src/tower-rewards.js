export const TOWER_PROFILE_KEY = 'voxel-vault-tower-profile-v1';

export const TOWER_TROPHIES = Object.freeze({
  'tower-prism': Object.freeze({name:'Prism Crown',title:'Prism Pioneer',icon:'♛'}),
  'tower-aurora': Object.freeze({name:'Aurora Crown',title:'Aurora Acrobat',icon:'❄'}),
  'tower-inferno': Object.freeze({name:'Inferno Crown',title:'Inferno Champion',icon:'♨'}),
});
export const TOWER_MASTER_TITLE = 'Tower Legend';

const WORLD_IDS = Object.keys(TOWER_TROPHIES);
const MEDAL_RANK = {bronze:1,silver:2,gold:3};
const FIRST_REWARDS = {'tower-prism':120,'tower-aurora':180,'tower-inferno':260};
const MAX_CRYSTALS = 999999999;
const MAX_COMPLETIONS = 1000000;
const MAX_TIME = 31536000;
const MAX_FALLS = 1000000;

function emptyProfile() {
  return {version:1,crystals:0,trophies:[],titles:[],worlds:{}};
}

function validNumber(value, max) {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= max;
}

function validRun(time, falls) {
  return validNumber(time, MAX_TIME) && validNumber(falls, MAX_FALLS) && Number.isInteger(falls);
}

function refreshCollection(profile) {
  profile.trophies = WORLD_IDS.filter(id => Object.hasOwn(profile.worlds,id));
  profile.titles = profile.trophies.map(id => TOWER_TROPHIES[id].title);
  if(profile.trophies.length === WORLD_IDS.length) profile.titles.push(TOWER_MASTER_TITLE);
  return profile;
}

function sanitizeProfile(value) {
  const profile = emptyProfile();
  if(!value || typeof value !== 'object' || Array.isArray(value)) return profile;
  if(validNumber(value.crystals,MAX_CRYSTALS)) profile.crystals = Math.floor(value.crystals);
  const worlds = value.worlds;
  if(worlds && typeof worlds === 'object' && !Array.isArray(worlds)) {
    for(const id of WORLD_IDS) {
      if(!Object.hasOwn(worlds,id)) continue;
      const record = worlds[id];
      if(!record || typeof record !== 'object' || Array.isArray(record)) continue;
      if(!Number.isInteger(record.completions) || record.completions < 1 || record.completions > MAX_COMPLETIONS) continue;
      if(!validRun(record.bestTime,record.leastFalls)) continue;
      profile.worlds[id] = {
        completions:record.completions,
        bestTime:record.bestTime,
        leastFalls:record.leastFalls,
        medal:typeof record.medal === 'string' && Object.hasOwn(MEDAL_RANK,record.medal) ? record.medal : 'bronze',
      };
    }
  }
  return refreshCollection(profile);
}

function loadProfile(storage) {
  try {
    if(typeof storage?.getItem !== 'function') return {profile:emptyProfile(),storageFailed:true};
    const raw = storage.getItem(TOWER_PROFILE_KEY);
    if(typeof raw !== 'string' || !raw) return {profile:emptyProfile(),storageFailed:false};
    let value;
    try { value = JSON.parse(raw); }
    catch { return {profile:emptyProfile(),storageFailed:false}; }
    return {profile:sanitizeProfile(value),storageFailed:false};
  } catch {
    return {profile:emptyProfile(),storageFailed:true};
  }
}

/** Local mode collection only; it never reads or changes a survival save. */
export function readTowerProfile(storage) {
  return loadProfile(storage).profile;
}

/** Every summit earns bronze. Faster runs with fewer falls earn better medals. */
export function towerMedal(course,time,falls) {
  if(!validRun(time,falls)) return null;
  const times = course?.medalTimes;
  const gold = validNumber(times?.gold,MAX_TIME) ? times.gold : 180;
  const silver = validNumber(times?.silver,MAX_TIME) && times.silver >= gold ? times.silver : Math.max(gold,300);
  if(time <= gold && falls === 0) return 'gold';
  if(time <= silver && falls <= 3) return 'silver';
  return 'bronze';
}

/** Call once per finished run. A failed save still returns the earned in-memory result. */
export function awardTowerSummit(storage,course,stats = {}) {
  const loaded = loadProfile(storage);
  const {profile} = loaded;
  const time = stats?.time;
  const falls = stats?.falls;
  const id = course?.id;
  if(typeof id !== 'string' || !Object.hasOwn(TOWER_TROPHIES,id) || !validRun(time,falls)) {
    return {profile,reward:0,medal:null,first:false,best:false,timeBest:false,fallsBest:false,record:null,storageFailed:loaded.storageFailed,invalid:true};
  }
  const previous = Object.hasOwn(profile.worlds,id) ? profile.worlds[id] : null;
  const first = !previous;
  const medal = towerMedal(course,time,falls);
  const timeBest = first || time < previous.bestTime;
  const fallsBest = first || falls < previous.leastFalls;
  const medalBest = first || MEDAL_RANK[medal] > MEDAL_RANK[previous.medal];
  const record = {
    completions:Math.min(MAX_COMPLETIONS,(previous?.completions || 0) + 1),
    bestTime:timeBest ? time : previous.bestTime,
    leastFalls:fallsBest ? falls : previous.leastFalls,
    medal:medalBest ? medal : previous.medal,
  };
  profile.worlds[id] = record;
  const configuredReward = course.crystalReward;
  const firstReward = validNumber(configuredReward,10000) && Number.isInteger(configuredReward) && configuredReward > 0 ? configuredReward : FIRST_REWARDS[id];
  const reward = Math.min(first ? firstReward : 20,MAX_CRYSTALS - profile.crystals);
  profile.crystals += reward;
  refreshCollection(profile);
  let storageFailed = loaded.storageFailed;
  // A failed read may hide a valid existing profile, so do not overwrite it.
  if(!storageFailed) {
    try {
      if(typeof storage?.setItem !== 'function') storageFailed = true;
      else storage.setItem(TOWER_PROFILE_KEY,JSON.stringify(profile));
    } catch { storageFailed = true; }
  }
  return {profile,reward,medal,first,best:timeBest || fallsBest || medalBest,timeBest,fallsBest,record,storageFailed};
}
