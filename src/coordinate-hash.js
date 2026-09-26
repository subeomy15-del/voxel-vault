// Fold every word of safe-integer coordinates before the 32-bit avalanche.
// Bitwise operations apply only to words, never to whole logical coordinates.
const mix=n=>{n=Math.imul(n^(n>>>16),0x7feb352d);n=Math.imul(n^(n>>>15),0x846ca68b);return n^(n>>>16);};
const word=(value,salt)=>{const n=Math.trunc(value),high=Math.floor(n/4294967296),low=n-high*4294967296;return mix((low>>>0)^mix(high)^salt);};
export function coordinateHash(x,z,seed=1){
 if(![x,z,seed].every(Number.isFinite))throw RangeError('Coordinates and seed must be finite');
 return (mix(word(x,0x165667b1)^word(z,0x9e3779b9)^word(seed,0x85ebca6b))>>>0)/4294967296;
}
