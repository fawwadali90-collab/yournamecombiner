/* YourNameCombiner shared engine: blending, favorites, share, TTS, sounds */
(function(){
"use strict";
const $=(s,c)=>(c||document).querySelector(s), $$=(s,c)=>Array.from((c||document).querySelectorAll(s));

/* ---------- tiny sound engine ---------- */
const Sfx=(()=>{let ctx=null,on=true;
  try{on=localStorage.getItem('ync_sound')!=='off';}catch(e){}
  function ac(){if(!ctx){ctx=new (window.AudioContext||window.webkitAudioContext)();}if(ctx.state==='suspended')ctx.resume();return ctx;}
  function tone(f,t0,d,type,v){if(!on)return;try{const c=ac(),o=c.createOscillator(),g=c.createGain();o.type=type||'sine';o.frequency.value=f;g.gain.setValueAtTime(0.0001,c.currentTime+t0);g.gain.exponentialRampToValueAtTime(v||.18,c.currentTime+t0+.02);g.gain.exponentialRampToValueAtTime(.0001,c.currentTime+t0+d);o.connect(g);g.connect(c.destination);o.start(c.currentTime+t0);o.stop(c.currentTime+t0+d+.05);}catch(e){}}
  return{
    get on(){return on;},
    toggle(){on=!on;try{localStorage.setItem('ync_sound',on?'on':'off');}catch(e){}return on;},
    pop(){tone(520,0,.12,'triangle');tone(780,.06,.1,'triangle');},
    chime(){[660,880,1174].forEach((f,i)=>tone(f,i*.09,.25,'sine',.14));},
    fanfare(){[523,659,784,1046,784,1046].forEach((f,i)=>tone(f,i*.1,.22,'triangle',.16));},
    click(){tone(880,0,.06,'square',.06);}
  };
})();
window.yncSfx=Sfx;

/* ---------- blending engine ---------- */
const VOW='aeiouy';
function cap(s){return s?s.charAt(0).toUpperCase()+s.slice(1):s;}
function clean(s){return (s||'').trim().replace(/[^a-zA-Z'\- ]/g,'').replace(/\s+/g,' ').slice(0,24);}
function low(s){return s.toLowerCase();}
function isVow(ch){return VOW.indexOf(ch)>=0;}

function score(name){
  const n=low(name).replace(/[^a-z]/g,'');let s=0;const L=n.length;
  if(L>=4&&L<=9)s+=4;else if(L<=12)s+=1;else s-=4;
  let alt=0;for(let i=1;i<L;i++){if(isVow(n[i])!==isVow(n[i-1]))alt++;}
  if(L>2&&alt/(L-1)>.55)s+=3;
  if(/(bc|df|gh|jkl|mnp|qrst|vwxz)/.test(n.replace(/[aeiouy]/g,'#'))){/*noop*/}
  if(/[^aeiouy]{4,}/.test(n))s-=5;else if(/[^aeiouy]{3}/.test(n))s-=2;
  if(/(.)\1\1/.test(n))s-=2;
  if(/^(.)\1/.test(n))s-=3; // stuttered start like "sson"
  return s;
}

function blends(a,b){
  a=low(clean(a)).replace(/[^a-z]/g,'');b=low(clean(b)).replace(/[^a-z]/g,'');
  const out=[];const push=(n,m)=>{if(n&&n.length>=3&&n.length<=16)out.push({n:n,m:m});};
  if(!a||!b)return out;
  const ha=Math.ceil(a.length/2),hb=Math.floor(b.length/2);
  push(a.slice(0,ha)+b.slice(hb),'half-blend');
  push(b.slice(0,Math.ceil(b.length/2))+a.slice(Math.floor(a.length/2)),'half-blend');
  // split sweep (bounded) — require at least 2 letters from each name
  for(let i=2;i<a.length;i++){for(let j=1;j<b.length-1;j++){
    if(out.length>90)break;
    push(a.slice(0,i)+b.slice(j),'syllable-mix');
  }}
  // overlap merge: end of a == start of b
  for(let k=Math.min(5,a.length,b.length);k>=2;k--){
    if(a.slice(-k)===b.slice(0,k)){push(a+b.slice(k),'overlap-merge');break;}
    if(b.slice(-k)===a.slice(0,k)){push(b+a.slice(k),'overlap-merge');break;}
  }
  // first-letter swap
  push(b[0]+a.slice(1),'letter-swap');push(a[0]+b.slice(1),'letter-swap');
  // head+tail
  push(a.slice(0,2)+b.slice(-3),'head-tail');push(b.slice(0,2)+a.slice(-3),'head-tail');
  return out;
}

const BLOCKED=/^(shag|damn|hell|crap|poop|fart|butt|boob|sexy|porn|kill|die|ugly|stupid|dumb|hate)$/;
function dedupe(list){
  const seen={},res=[];
  for(const r of list){const k=r.n;if(!seen[k]&&/^[a-z][a-z'\-]*$/i.test(r.n)&&!BLOCKED.test(k.toLowerCase())){seen[k]=1;res.push(r);}}
  return res;
}

function styleTweaks(name,mode,opts){
  let n=name;
  if(mode==='baby'&&opts&&opts.gender==='girl'&&/[bcdfghjklmnpqrstvwxz]$/.test(n)&&Math.random()<.5){
    n=n+(['a','ia','elle'][Math.floor(Math.random()*3)]);
  }
  return n;
}

/* category-tailored suffixes for brand mode */
const BRAND_CATS={
  tech:['ly','ify','io','hub','lab','stack','sync','os'],
  food:['ery','bite','fresh','oven','brew','table','dish','licious'],
  fashion:['elle','ista','chic','luxe','wear','mode','haus','style'],
  fitness:['fit','flex','pulse','core','peak','thrive','strong','body'],
  finance:['pay','mint','wise','fund','vault','cash','ledger','capital'],
  travel:['go','jet','trip','wander','escape','voyage','trail','roam'],
  home:['nest','haven','dwell','cozy','casa','nook','habit','hearth'],
  pets:['paws','tails','buddy','wags','furry','pup','whisk','paw'],
  edu:['learn','wise','bright','mind','academy','tutor','kiddo','school'],
  creative:['studio','works','lab','craft','pixel','muse','ink','pop']
};

function finalize(list,mode,opts){
  opts=opts||{};
  let res=dedupe(list).map(r=>({n:r.n,m:r.m,s:score(r.n)}));
  // mode extras
  const extras=[];
  const base=res.slice(0,12);
  if(mode==='brand'){
    const suf=(opts.cat&&BRAND_CATS[opts.cat])||['ly','ify','hub','ora','io','lab','wise','nest'];
    base.forEach(r=>{suf.slice(0,4).forEach(s=>extras.push({n:r.n+s,m:'brand-twist',s:score(r.n+s)-1}));});
  }else if(mode==='nickname'){
    base.forEach(r=>{extras.push({n:r.n.replace(/[^a-z]/g,'').slice(0,5)+'y',m:'diminutive',s:2});extras.push({n:r.n.slice(0,3)+'ie',m:'diminutive',s:2});});
  }else if(mode==='pet'){
    const suf=['y','pie','boo','ster'];
    base.forEach(r=>{extras.push({n:r.n+suf[Math.floor(Math.random()*suf.length)],m:'pet-cute',s:2});});
  }else if(mode==='username'){
    base.forEach(r=>{const u=r.n.replace(/[^a-z]/g,'');extras.push({n:u+'_'+Math.floor(10+Math.random()*89),m:'handle',s:1});extras.push({n:'the.'+u,m:'handle',s:1});});
  }else if(mode==='hashtag'){
    base.forEach(r=>{extras.push({n:'#'+r.n.replace(/[^a-z]/g,'')+(opts.year||''),m:'hashtag',s:3});});
  }else if(mode==='fantasy'){
    const suf=['iel','ara','wyn','dor','thia'];
    base.forEach(r=>{extras.push({n:r.n+suf[Math.floor(Math.random()*suf.length)],m:'fantasy',s:2});});
  }else if(mode==='lastname'){
    base.slice(0,6).forEach(r=>{extras.push({n:r.n,m:'blended-surname',s:3});});
  }
  res=res.concat(extras);
  // length filter
  if(opts.len==='short')res=res.filter(r=>r.n.length<=6);
  else if(opts.len==='long')res=res.filter(r=>r.n.length>=9);
  res.sort((x,y)=>y.s-x.s);
  const seen={},final=[];
  for(const r of res){const k=low(r.n);if(!seen[k]){seen[k]=1;final.push(r);}if(final.length>=(opts.limit||24))break;}
  return final;
}

function generate(names,mode,opts){
  names=names.map(clean).filter(Boolean);
  // single-input modes: blend with a playful filler word
  const fillers={nickname:['bear','bean','bug','star','pie','boo','champ'],username:['star','king','queen','nova','rex'],pet:['bean','pie','boo','muffin','paws'],fantasy:['star','moon','wolf','thorn','sage'],word:['orama','tastic']};
  if(names.length===1&&fillers[mode]){names.push(fillers[mode][Math.floor(Math.random()*fillers[mode].length)]);}
  if(names.length<2)return[];
  let all=[];
  for(let i=0;i<names.length;i++)for(let j=0;j<names.length;j++){
    if(i===j)continue;
    blends(names[i],names[j]).forEach(r=>all.push(r));
  }
  // 3+ names: chain blends
  if(names.length>2){
    for(let i=0;i<names.length;i++){
      const others=names.filter((_,k)=>k!==i);
      const mid=blends(others[0],others[1]||'')[0];
      if(mid)blends(names[i],mid.n).slice(0,6).forEach(r=>all.push(r));
    }
  }
  return finalize(all,mode,opts).map(r=>{
    let n=r.n;
    if(mode==='username'||mode==='hashtag'||mode==='word')n=low(n);
    else n=cap(n);
    if(mode==='hashtag'&&n[0]!=='#')n='#'+n;
    return {name:n,method:r.m};
  }).concat(mode==='lastname'&&names.length>=2?[
    {name:cap(names[0])+'-'+cap(names[1]),method:'double-barrel'},
    {name:cap(names[1])+'-'+cap(names[0]),method:'double-barrel'}
  ]:[]);
}
window.NC={generate:generate,cap:cap,clean:clean};

/* ---------- favorites ---------- */
const Favs={
  key:'ync_favs',
  list(){try{return JSON.parse(localStorage.getItem(this.key)||'[]');}catch(e){return[];}},
  save(l){try{localStorage.setItem(this.key,JSON.stringify(l.slice(0,200)));}catch(e){}},
  has(n){return this.list().indexOf(n)>=0;},
  toggle(n){let l=this.list();const i=l.indexOf(n);if(i>=0)l.splice(i,1);else{l.unshift(n);Sfx.pop();}this.save(l);renderFavs();return i<0;},
  clear(){this.save([]);renderFavs();}
};
function renderFavs(){
  const l=Favs.list(),fab=$('#favFab'),body=$('#favBody'),cnt=$('#favCount');
  if(fab){fab.classList.toggle('show',l.length>0);if(cnt)cnt.textContent=l.length;}
  if(body){
    body.innerHTML=l.length?l.map(n=>'<div class="fav-item"><span>'+escapeHtml(n)+'</span><span><button class="icon-btn" data-copy="'+escapeHtml(n)+'" title="Copy">📋</button> <button class="icon-btn" data-speak="'+escapeHtml(n)+'" title="Hear it">🔊</button> <button class="icon-btn" data-unfav="'+escapeHtml(n)+'" title="Remove">✕</button></span></div>').join(''):'<p style="color:var(--mut)">No favorites yet — tap the ⭐ on any result you love.</p>';
  }
  $$('[data-fav]').forEach(b=>b.classList.toggle('starred',Favs.has(b.getAttribute('data-fav'))));
}
function escapeHtml(s){return String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
window.yncFavs=Favs;

/* ---------- share links ---------- */
function shareURL(names,mode){
  const u=new URL(location.href.split('?')[0]);
  names.forEach((n,i)=>{if(i<4)u.searchParams.set('n'+(i+1),n);});
  if(mode&&mode!=='mix')u.searchParams.set('mode',mode);
  return u.toString();
}

/* ---------- TTS ---------- */
function speak(t){
  try{
    t=String(t).replace(/^#/,'');
    const u=new SpeechSynthesisUtterance(t);u.rate=.95;u.pitch=1.05;
    speechSynthesis.cancel();speechSynthesis.speak(u);
  }catch(e){}
}

/* ---------- tool wiring ---------- */
function wireTool(){
  const card=$('#combinerCard');if(!card)return;
  const mode=card.getAttribute('data-mode')||'mix';
  const inputs=$$('.nc-name',card),alert=$('#ncAlert');
  const results=$('#ncResults'),grid=$('#ncGrid'),topPick=$('#topPick');
  // restore from URL
  const qp=new URLSearchParams(location.search);let restored=false;
  inputs.forEach((inp,i)=>{const v=qp.get('n'+(i+1));if(v){inp.value=v.slice(0,24);restored=true;}});
  function currentOpts(){
    const o={mode:mode,limit:24};
    const g=$('.chip-opt.on[data-gender]',card);if(g)o.gender=g.getAttribute('data-gender');
    const l=$('.chip-opt.on[data-len]',card);if(l)o.len=l.getAttribute('data-len');
    const ct=$('.chip-opt.on[data-cat]',card);if(ct)o.cat=ct.getAttribute('data-cat');
    const y=$('#ncYear');if(y&&y.value)o.year=y.value;
    return o;
  }
  function doGenerate(){
    const names=inputs.map(i=>i.value);
    const minN=parseInt(card.getAttribute('data-min')||'2',10);
    if(names.filter(n=>n.trim()).length<minN){
      if(alert){alert.textContent=minN===1?'Please enter a name to remix.':'Please enter at least two names to combine.';alert.classList.add('show');}
      return;
    }
    if(alert)alert.classList.remove('show');
    const res=NC.generate(names,mode,currentOpts());
    if(!res.length){if(alert){alert.textContent='Hmm, those inputs did not blend well — try different spellings.';alert.classList.add('show');}return;}
    grid.innerHTML=res.map((r,i)=>'<div class="name-card" style="animation-delay:'+Math.min(i*30,600)+'ms"><div class="nm">'+escapeHtml(r.name)+'</div><div class="tag">'+escapeHtml(r.method.replace(/-/g,' '))+'</div><div class="acts"><button class="icon-btn" data-copy="'+escapeHtml(r.name)+'" title="Copy">📋</button><button class="icon-btn" data-speak="'+escapeHtml(r.name)+'" title="Hear it">🔊</button><button class="icon-btn" data-fav="'+escapeHtml(r.name)+'" title="Save">⭐</button></div></div>').join('');
    if(topPick){topPick.innerHTML='<div class="lbl">✨ Top pick</div><div class="name">'+escapeHtml(res[0].name)+'</div><div class="acts" style="display:flex;gap:8px;justify-content:center"><button class="icon-btn" data-copy="'+escapeHtml(res[0].name)+'" title="Copy">📋</button><button class="icon-btn" data-speak="'+escapeHtml(res[0].name)+'" title="Hear it">🔊</button><button class="icon-btn" data-fav="'+escapeHtml(res[0].name)+'" title="Save">⭐</button></div>';}
    results.classList.add('show');
    const cnt=res.length;
    $('#ncCount').textContent=cnt+' blend'+(cnt===1?'':'s');
    $('#shareLink').value=shareURL(names.filter(n=>n.trim()),mode);
    Sfx.fanfare();
    renderFavs();
    results.scrollIntoView({behavior:'smooth',block:'nearest'});
  }
  $('#ncGo').addEventListener('click',doGenerate);
  inputs.forEach(i=>i.addEventListener('keydown',e=>{if(e.key==='Enter')doGenerate();}));
  $$('.chip-opt[data-gender],.chip-opt[data-len],.chip-opt[data-cat]',card).forEach(c=>c.addEventListener('click',()=>{
    const attr=c.hasAttribute('data-gender')?'data-gender':(c.hasAttribute('data-len')?'data-len':'data-cat');
    $$('.chip-opt['+attr+']',card).forEach(x=>x.classList.remove('on'));
    c.classList.add('on');Sfx.click();
  }));
  const sh=$('#ncShare');if(sh)sh.addEventListener('click',()=>{
    const ta=$('#shareLink');ta.select();
    try{document.execCommand('copy');}catch(e){}
    if(navigator.clipboard)navigator.clipboard.writeText(ta.value).catch(()=>{});
    sh.textContent='Copied! ✓';Sfx.chime();setTimeout(()=>sh.textContent='Copy share link',1800);
  });
  if(restored)doGenerate();
}

/* ---------- global clicks ---------- */
document.addEventListener('click',e=>{
  const t=e.target.closest('[data-copy],[data-speak],[data-fav],[data-unfav]');
  if(t){
    if(t.hasAttribute('data-copy')){const v=t.getAttribute('data-copy');if(navigator.clipboard)navigator.clipboard.writeText(v).catch(()=>{});Sfx.click();t.textContent='✓';setTimeout(()=>t.textContent='📋',1200);}
    else if(t.hasAttribute('data-speak')){speak(t.getAttribute('data-speak'));Sfx.click();}
    else if(t.hasAttribute('data-fav')){const added=Favs.toggle(t.getAttribute('data-fav'));t.classList.toggle('starred',added);}
    else if(t.hasAttribute('data-unfav')){Favs.toggle(t.getAttribute('data-unfav'));}
    return;
  }
  const st=e.target.closest('[data-sound-toggle]');
  if(st){const on=Sfx.toggle();st.textContent=on?'🔊':'🔇';return;}
});

/* ---------- drawer / misc ---------- */
document.addEventListener('DOMContentLoaded',()=>{
  // year
  $$('[data-year]').forEach(el=>el.textContent=new Date().getFullYear());
  // sound toggles
  $$('[data-sound-toggle]').forEach(b=>b.textContent=Sfx.on?'🔊':'🔇');
  // floating hearts
  $$('.float-hearts').forEach(fh=>{
    for(let i=0;i<10;i++){const s=document.createElement('span');s.textContent=['💜','💗','💖','✨'][i%4];s.style.left=(Math.random()*100)+'%';s.style.animationDelay=(Math.random()*9)+'s';s.style.fontSize=(1+Math.random()*1.4)+'rem';fh.appendChild(s);}
  });
  wireTool();renderFavs();
  const fab=$('#favFab'),drawer=$('#favDrawer'),scrim=$('#scrim');
  if(fab)fab.addEventListener('click',()=>{drawer.classList.add('open');scrim.classList.add('show');});
  const close=()=>{if(drawer)drawer.classList.remove('open');if(scrim)scrim.classList.remove('show');};
  if(scrim)scrim.addEventListener('click',close);
  const x=$('#favClose');if(x)x.addEventListener('click',close);
  const dl=$('#favDownload');
  if(dl)dl.addEventListener('click',()=>{
    const l=Favs.list();if(!l.length)return;
    const blob=new Blob(['My favorite name blends — via YourNameCombiner\n\n'+l.join('\n')],{type:'text/plain'});
    const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='name-blends.txt';a.click();Sfx.chime();
  });
  const ca=$('#favClear');if(ca)ca.addEventListener('click',()=>{if(confirm('Remove all favorites?'))Favs.clear();});
});
})();
