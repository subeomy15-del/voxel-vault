export class Audio {
  constructor(settings){this.settings=settings;this.context=null;this.ambientTimer=0;this.birdTimer=4;}
  start(){
    try{
      if(!this.context){
        this.context=new (window.AudioContext||window.webkitAudioContext)();
        const c=this.context;this.noiseBuffer=c.createBuffer(1,c.sampleRate*2,c.sampleRate);const data=this.noiseBuffer.getChannelData(0);let brown=0;
        for(let i=0;i<data.length;i++){brown=(brown+(Math.random()*2-1)*.02)/1.02;data[i]=brown*3.5;}
        const source=c.createBufferSource();source.buffer=this.noiseBuffer;source.loop=true;
        this.windFilter=c.createBiquadFilter();this.windFilter.type='lowpass';this.windFilter.frequency.value=650;
        this.windGain=c.createGain();this.windGain.gain.value=0;source.connect(this.windFilter);this.windFilter.connect(this.windGain);this.windGain.connect(c.destination);source.start();
      }
      this.context.resume();
    }catch{}
  }
  quiet(){if(this.context&&this.windGain)this.windGain.gain.setTargetAtTime(0,this.context.currentTime,.12);}
  update(game,dt){
    if(!this.context)return;this.ambientTimer-=dt;this.birdTimer-=dt;if(this.ambientTimer>0)return;this.ambientTimer=.4;
    const c=this.context,column=game.world.column(Math.floor(game.pos.x),Math.floor(game.pos.z)),surface=game.pos.y>column.h-3,river=surface&&column.river<13,active=!game.screen;
    const wind=active?(game.gliding?.13:river?.095:surface?.033:.006)*this.settings.volume:0;this.windGain.gain.setTargetAtTime(wind,c.currentTime,.8);this.windFilter.frequency.setTargetAtTime(game.gliding?1100:river?1600:surface?650:140,c.currentTime,.8);
    if(this.birdTimer<=0){this.birdTimer=8+Math.random()*13;if(active&&surface&&game.state.time%600<330&&!['desert','snow'].includes(column.biome)){this.tone(1900,.09,'sine',.016,750);setTimeout(()=>this.tone(2300,.09,'sine',.01,-650),160);}}
  }
  tone(freq=440,time=.1,type='sine',volume=.15,slide=0){
    if(!this.context||!this.settings.volume)return;const c=this.context,o=c.createOscillator(),g=c.createGain();o.type=type;o.frequency.setValueAtTime(freq,c.currentTime);if(slide)o.frequency.exponentialRampToValueAtTime(Math.max(30,freq+slide),c.currentTime+time);g.gain.setValueAtTime(volume*this.settings.volume,c.currentTime);g.gain.exponentialRampToValueAtTime(.001,c.currentTime+time);o.connect(g);g.connect(c.destination);o.start();o.stop(c.currentTime+time);o.onended=()=>{o.disconnect();g.disconnect();};
  }
  noise(duration=.1,volume=.1,frequency=1300){
    if(!this.context||!this.settings.volume)return;const c=this.context,s=c.createBufferSource(),f=c.createBiquadFilter(),g=c.createGain();s.buffer=this.noiseBuffer;f.type='highpass';f.frequency.value=frequency;g.gain.setValueAtTime(volume*this.settings.volume,c.currentTime);g.gain.exponentialRampToValueAtTime(.001,c.currentTime+duration);s.connect(f);f.connect(g);g.connect(c.destination);s.start(c.currentTime,Math.random(),duration);s.onended=()=>{s.disconnect();f.disconnect();g.disconnect();};
  }
  play(name,surface='stone'){
    const wood=/wood|plank|birch|pine|oak|chest|bench/.test(surface),soft=/grass|dirt|sand|snow|leaf|fern|wool/.test(surface),pitch=1+(Math.random()-.5)*.13;
    if(name==='mine'){this.noise(.15,soft?.35:.6,soft?650:1800);this.tone((wood?175:soft?95:260)*pitch,.065,'triangle',.15,-65);}
    if(name==='step'){this.noise(.09,soft?.26:.15,soft?800:2200);this.tone((wood?110:soft?65:155)*pitch,.045,'triangle',.055,-40);}
    if(name==='place'){this.noise(.07,.2,900);this.tone((wood?165:soft?95:220)*pitch,.08,'triangle',.13,-80);}
    if(name==='hit'){this.noise(.11,.45,180);this.tone(95,.1,'triangle',.16,-55);}
    if(name==='portal'){this.tone(110,.7,'sine',.1,440);this.tone(220,.8,'triangle',.04,330);}
    if(name==='launch'){this.tone(220,.35,'sine',.09,550);this.noise(.2,.1,900);}
    if(name==='hurt')this.tone(125,.17,'triangle',.2,-80);
    if(name==='click')this.tone(510,.035,'sine',.06);
    if(name==='jump')this.noise(.08,.12,600);
    if(name==='shoot'){this.noise(.13,.35,900);this.tone(340,.07,'triangle',.08,-180);}
    if(name==='craft'){this.tone(310,.1,'triangle',.1,-70);setTimeout(()=>this.tone(620,.13,'sine',.05),70);}
    if(name==='heal')this.tone(380,.22,'sine',.065,130);
    if(name==='reward')this.tone(660,.22,'sine',.06,110);
    if(name==='warning')this.tone(110,.5,'triangle',.07,50);
    if(name==='firecracker'){this.noise(.22,.45,1200);this.tone(180,.18,'triangle',.12,720);setTimeout(()=>this.tone(720,.22,'sine',.08,-90),90);}
  }
}
