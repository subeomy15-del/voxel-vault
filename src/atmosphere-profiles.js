const profile=(day,horizon,ground,cloud='#eff0df')=>Object.freeze({day,horizon,ground,cloud});
export const ATMOSPHERES=Object.freeze({
 meadow:profile('#689dca','#a9c6d3','#687252'),forest:profile('#659ab6','#a0b8b5','#465640'),dense_forest:profile('#587f96','#8ca6a1','#344b3c'),
 autumn_forest:profile('#7e9caf','#c3b9a4','#7e6545'),jungle:profile('#629998','#94b5a5','#354f38'),desert:profile('#6ba8c7','#c8c3ad','#97815d'),
 badlands:profile('#719eac','#bdb09c','#875d45'),savanna:profile('#739fab','#bbc3a7','#87784f'),marsh:profile('#769c9b','#a0b8ad','#52614d'),
 snow:profile('#7396b7','#b4c9d6','#748e9e'),snow_plains:profile('#80a5be','#c1d2dc','#83959e'),mountain:profile('#527fae','#a3bfd0','#657786'),
 beach:profile('#66a6c4','#b5d2db','#948864'),ocean:profile('#598fb7','#91bbcd','#526f78')
});
