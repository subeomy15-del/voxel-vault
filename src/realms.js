// Only geography lives in a realm. Inventory, equipment and rewards travel with you.
export const REALM_FIELDS=['pos','yaw','pitch','edits','spawn','origin','containers','crops','drops','animals','opened','discovered','waypoint','gate','outposts'];
export function captureRealm(state){return Object.fromEntries(REALM_FIELDS.map(k=>[k,structuredClone(state[k]??null)]));}
export function emptyRealm(){return{pos:null,yaw:0,pitch:0,edits:[],spawn:null,origin:null,containers:{},crops:{},drops:[],animals:[],opened:[],discovered:[],waypoint:'home',gate:null,outposts:[]};}
export const RIFT_ANCHORS=[
 {id:'dawn',name:'Dawn Anchor',x:0,z:-48,color:'#5fe4ee'},
 {id:'ember',name:'Ember Anchor',x:48,z:-48,color:'#ffb868'},
 {id:'dusk',name:'Dusk Anchor',x:48,z:0,color:'#c59aff'},
];
