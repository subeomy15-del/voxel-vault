const vectorItems=new Set(['spectral_leaf','pear_leaf','plum_leaf']);
export const itemAssetPath=name=>'../assets/items/'+name+(vectorItems.has(name)?'.svg':'.png');
