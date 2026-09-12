export class Audio {
  constructor(settings){this.settings=settings;this.context=null;}
  start(){try{this.context??=new (window.AudioContext||window.webkitAudioContext)();this.context.resume();}catch{}}
  tone(freq=440,time=.1,type='sine',volume=.15,slide=0){
    if(!this.context||!this.settings.volume)return;const c=this.context,o=c.createOscillator(),g=c.createGain();o.type=type;o.frequency.setValueAtTime(freq,c.currentTime);if(slide)o.frequency.exponentialRampToValueAtTime(Math.max(30,freq+slide),c.currentTime+time);g.gain.setValueAtTime(volume*this.settings.volume,c.currentTime);g.gain.exponentialRampToValueAtTime(.001,c.currentTime+time);o.connect(g);g.connect(c.destination);o.start();o.stop(c.currentTime+time);
  }
  play(name){
    if(name==='mine')this.tone(130,.09,'triangle',.3,-70);
    if(name==='hit')this.tone(95,.14,'sawtooth',.13,-60);
    if(name==='hurt')this.tone(145,.22,'triangle',.3,-90);
    if(name==='step')this.tone(75,.035,'triangle',.07,-30);
    if(name==='place')this.tone(230,.1,'triangle',.17,-100);
    if(name==='click')this.tone(550,.045,'sine',.11);
    if(name==='jump')this.tone(180,.12,'sine',.1,150);
    if(name==='shoot')this.tone(600,.14,'triangle',.12,-480);
    if(['reward','craft','heal'].includes(name)){[0,4,7,12].forEach((n,i)=>setTimeout(()=>this.tone(330*2**(n/12),.25,'sine',.13),i*75));}
    if(name==='warning')this.tone(110,.8,'sawtooth',.08,70);
  }
}
