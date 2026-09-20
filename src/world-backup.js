import {VERSION,BLOCKS,ITEMS} from './data.js?v=35';
import {loadState,slotKey} from './save.js?v=35';
export const BACKUP_VERSION=1;
export function exportWorld(state){return JSON.stringify({format:'voxel-vault-world',backupVersion:BACKUP_VERSION,exportedAt:new Date().toISOString(),state});}
export function parseWorldBackup(text){
  if(typeof text!=='string'||text.length>100*1024*1024)throw Error('Choose a world JSON backup smaller than 100 MB.');
  let envelope;try{envelope=JSON.parse(text);}catch{throw Error('This file is not valid JSON. Your current world has not changed.');}
  if(envelope?.format==='voxel-vault-world'&&envelope.backupVersion!==BACKUP_VERSION)throw Error('This backup was made by an unsupported version.');
  const raw=envelope?.format==='voxel-vault-world'?envelope.state:envelope;
  if(!raw||raw.version!==VERSION||!['adventure','creative','daily','ender'].includes(raw.mode)||!Number.isFinite(raw.seed))throw Error('This is not a supported Voxel Vault world.');
  if(!raw.inv||typeof raw.inv!=='object'||Array.isArray(raw.inv)||Object.entries(raw.inv).some(([k,n])=>!Object.hasOwn(ITEMS,k)||!Number.isFinite(n)||n<0))throw Error('The backup contains invalid inventory data.');
  const validEdits=edits=>Array.isArray(edits)&&edits.every(e=>Array.isArray(e)&&e.length===2&&/^-?\d+,-?\d+,-?\d+$/.test(e[0])&&(e[1]===null||Object.hasOwn(BLOCKS,e[1])));
  if(!validEdits(raw.edits)||Object.values(raw.realms||{}).some(realm=>!realm||!validEdits(realm.edits)))throw Error('The backup contains invalid world edits.');
  const state=loadState({getItem:key=>key===slotKey(raw.mode)?JSON.stringify(raw):null},raw.mode);
  if(!state)throw Error('The backup could not be read. Your current world has not changed.');
  return state;
}
