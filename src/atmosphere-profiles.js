const profile=(day,horizon,ground,cloud='#eff0df')=>Object.freeze({day,horizon,ground,cloud});
export const ATMOSPHERES=Object.freeze({
 spectral_forest:profile('#658397','#a1b4bb','#40535a'),maple_forest:profile('#78a1b3','#bbc5ae','#716044'),aspen_forest:profile('#81abc0','#c7d5bf','#758159'),pear_forest:profile('#78a5bb','#b7ccaf','#687d47'),plum_forest:profile('#7894b0','#bbc0c6','#64604b'),bluebell_forest:profile('#7097b3','#b6c5d0','#566348'),cedar_forest:profile('#698f9b','#a3bcb5','#3d5946'),snow_cedar:profile('#7798b4','#bed0d7','#698879'),red_sand_desert:profile('#78a6bd','#d6bba0','#9b6644'),oasis:profile('#6ca9c0','#c2d2b9','#728951'),

 conifer:profile('#709caf','#b3c8c5','#566752'),cherry:profile('#82b2cf','#dfd0cf','#798a62'),frozen_badlands:profile('#7797bb','#bdcedb','#82919e'),river:profile('#78aac6','#b7d1cf','#687f5e'),
 meadow:profile('#689dca','#a9c6d3','#687252'),forest:profile('#659ab6','#a0b8b5','#465640'),dense_forest:profile('#587f96','#8ca6a1','#344b3c'),
 autumn_forest:profile('#7e9caf','#c3b9a4','#7e6545'),jungle:profile('#629998','#94b5a5','#354f38'),desert:profile('#6ba8c7','#c8c3ad','#97815d'),
 badlands:profile('#719eac','#bdb09c','#875d45'),savanna:profile('#739fab','#bbc3a7','#87784f'),marsh:profile('#769c9b','#a0b8ad','#52614d'),
 snow:profile('#7396b7','#b4c9d6','#748e9e'),snow_plains:profile('#80a5be','#c1d2dc','#83959e'),mountain:profile('#527fae','#a3bfd0','#657786'),
 beach:profile('#66a6c4','#b5d2db','#948864'),ocean:profile('#598fb7','#91bbcd','#526f78')
});
