import {ITEMS} from './data.js?v=35';
import {icon} from './icons.js?v=35';
export class PickupFeed {
 constructor(){this.rows=new Map();this.root=document.createElement('aside');this.root.id='pickup-feed';this.root.setAttribute('aria-label','Recently collected items');this.root.setAttribute('aria-live','polite');document.body.append(this.root);}
 add(name,count,now=performance.now()){
  if(!ITEMS[name]||!Number.isFinite(count)||count<=0)return;
  let row=this.rows.get(name);
  if(!row){const node=document.createElement('div');node.className='pickup-item';node.dataset.pickup=name;node.innerHTML=icon(name,32);const label=document.createElement('span'),amount=document.createElement('b');label.textContent=ITEMS[name].name;node.append(label,amount);this.root.append(node);row={node,amount,count:0,expires:0};this.rows.set(name,row);}
  row.count+=count;row.expires=now+5000;row.amount.textContent='+'+row.count;
  while(this.rows.size>5){const[key,old]=this.rows.entries().next().value;old.node.remove();this.rows.delete(key);}
 }
 update(screen,now=performance.now()){
  if(screen==='menu'){for(const row of this.rows.values())row.node.remove();this.rows.clear();}
  this.root.hidden=screen==='menu';for(const[key,row]of this.rows)if(now>=row.expires){row.node.remove();this.rows.delete(key);}
 }
}
