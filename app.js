let fixSrc='';
const $=s=>document.querySelector(s),esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const K='new,ph,set,theme,auto,day,night,lang,prov,srv,warn,copy,prev,dl,fix,err,vid,fb'.split(',');
const L={
az:'Yeni söhbət|Mesaj yaz…|Ayarlar|Tema|Telefon|Gündüz|Gecə|Dil|Model|Server ünvanı|Şifrə və gizli məlumat yazma, pulsuz servislər sorğuları saxlaya bilər.|Kopyala|Önizləmə|Yüklə|Düzəlt|Xəta: |Video (tezliklə)|Səs limiti doldu, brauzer səsi işlədilir.'.split('|'),
tr:'Yeni sohbet|Mesaj yaz…|Ayarlar|Tema|Telefon|Gündüz|Gece|Dil|Model|Sunucu adresi|Şifre ve gizli bilgi yazma, ücretsiz servisler istekleri kaydedebilir.|Kopyala|Önizleme|İndir|Düzelt|Hata: |Video (yakında)|Ses limiti doldu, tarayıcı sesi kullanılıyor.'.split('|'),
ru:'Новый чат|Напишите сообщение…|Настройки|Тема|Как в телефоне|День|Ночь|Язык|Модель|Адрес сервера|Не пишите пароли и секреты: бесплатные сервисы могут сохранять запросы.|Копировать|Просмотр|Скачать|Исправить|Ошибка: |Видео (скоро)|Лимит голоса исчерпан, используется голос браузера.'.split('|'),
en:'New chat|Type a message…|Settings|Theme|Phone|Day|Night|Language|Model|Server address|Don\'t type passwords or secrets; free services may store requests.|Copy|Preview|Download|Fix|Error: |Video (soon)|Voice limit reached, using browser voice.'.split('|'),
pt:'Nova conversa|Escreva uma mensagem…|Definições|Tema|Telemóvel|Dia|Noite|Idioma|Modelo|Endereço do servidor|Não escreva palavras-passe ou segredos; serviços gratuitos podem guardar pedidos.|Copiar|Pré-visualizar|Transferir|Corrigir|Erro: |Vídeo (em breve)|Limite de voz atingido, a usar a voz do navegador.'.split('|')};
const RL={az:'az-AZ',tr:'tr-TR',ru:'ru-RU',en:'en-US',pt:'pt-PT'};
const nl=(navigator.language||'az').slice(0,2);
let S=JSON.parse(localStorage.getItem('nova')||'null')||{chats:[],cur:null,theme:'auto',lang:L[nl]?nl:'az',prov:'groq',server:''};
const t=k=>L[S.lang][K.indexOf(k)],inp=$('#in');
const save=()=>{try{localStorage.setItem('nova',JSON.stringify(S))}catch(e){}};
const cur=()=>S.chats.find(c=>c.id===S.cur);

function newChat(){const c={id:Date.now(),title:'',msgs:[]};S.chats.unshift(c);S.cur=c.id;save();draw()}
function theme(){const d=S.theme==='dark'||(S.theme==='auto'&&matchMedia('(prefers-color-scheme: dark)').matches);document.documentElement.dataset.theme=d?'dark':'light';document.documentElement.lang=S.lang;document.querySelectorAll('.lg,.logo').forEach(i=>i.src=d?'logo.png':'logo-dark.png')}
matchMedia('(prefers-color-scheme: dark)').addEventListener('change',theme);
function labels(){$('#nc').textContent='+ '+t('new');inp.placeholder=t('ph');$('#vid').title=t('vid');$('#gear').title=t('set');
 [['theme','l-theme'],['lang','l-lang'],['prov','l-prov'],['srv','l-srv']].forEach(([k,i])=>$('#'+i).textContent=t(k));
 $('#warn').textContent=t('warn');[...$('#s-theme').options].forEach((o,i)=>o.textContent=t(['auto','day','night'][i]))}

function md(s){return s.split('```').map((p,i)=>{
 if(i%2){const m=p.match(/^(\w*)\n?([\s\S]*)$/);return `<div class="code"><div class="ch"><span>${esc(m[1])}</span><span><button data-a="copy">${t('copy')}</button>${/^(html|svg)$/i.test(m[1])?`<button data-a="prev">${t('prev')}</button>`:''}</span></div><pre><code>${esc(m[2])}</code></pre></div>`}
 return esc(p).replace(/`([^`]+)`/g,'<code>$1</code>').replace(/\*\*([^*]+)\*\*/g,'<b>$1</b>').replace(/\n/g,'<br>')}).join('')}

function draw(){const c=cur();labels();
 $('#list').innerHTML=S.chats.map(x=>`<li class="${x.id===S.cur?'on':''}" data-id="${x.id}"><span>${esc(x.title||t('new'))}</span><button data-del="${x.id}">×</button></li>`).join('');
 $('#msgs').innerHTML=c.msgs.length?c.msgs.map((m,i)=>`<div class="m ${m.role}">${m.img?`${m.vid?`<video class="gi" src="${esc(m.img)}" controls playsinline></video>`:`<img class="gi" src="${esc(m.img)}" alt="">`}<div class="acts"><a href="${esc(m.img)}" download="nova.png">${t('dl')}</a><button data-a="fix">${t('fix')}</button></div>`:md(m.content)}${m.role==='assistant'&&!m.img?`<div class="acts"><button data-a="say" data-i="${i}">🔊</button></div>`:''}</div>`).join(''):'<div class="empty"><img class="lg" alt=""><h2>Nova AI</h2></div>';
 theme();$('#msgs').scrollTop=1e9}

async function post(p,b){
 const r=await fetch((S.server||'').replace(/\/$/,'')+p,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(b)});
 if(!r.ok)throw Error(r.status+' '+(await r.text().catch(()=>'')).slice(0,150));return p==='/tts'?r.blob():r.json()}

async function send(txt,mode,speak){const c=cur();c.msgs.push({role:'user',content:txt});if(!c.title)c.title=txt.slice(0,30);save();draw();$('#st').textContent='…';
 try{
  if(mode==='img'){const r=await post(fixSrc?'/image-edit':'/image',{image:fixSrc,prompt:txt,history:c.msgs.slice(-6).map(({role,content})=>({role,content}))});c.msgs.push({role:'assistant',content:'',img:r.image||r.url});fixSrc=''}
  else{const r=await post('/chat',{provider:S.prov,voice:!!speak,lang:S.lang,messages:c.msgs.map(({role,content})=>({role,content:content||'[image]'}))});c.msgs.push({role:'assistant',content:r.text})}
 }catch(e){$('#st').textContent=t('err')+e.message;return}
 $('#st').textContent='';save();draw();const l=c.msgs[c.msgs.length-1];if(speak&&l.content)say(l.content)}

const HINT={az:'Əvvəl təsviri yaz, sonra düyməyə bas.',tr:'Önce açıklamayı yaz, sonra düğmeye bas.',ru:'Сначала напиши описание, затем нажми кнопку.',en:'Type a description first, then tap the button.',pt:'Escreva primeiro a descrição e toque no botão.'};
const hint=()=>HINT[S.lang];
function go(m){const v=inp.value.trim();if(!v){if(m){$('#st').textContent=hint();inp.focus()}return}inp.value='';send(v,m)}
$('#go').onclick=()=>go();$('#img').onclick=()=>go('img');
inp.onkeydown=e=>{if(e.key==='Enter'&&!e.shiftKey&&!matchMedia('(pointer:coarse)').matches){e.preventDefault();go()}};
$('#mic').onclick=()=>{const R=window.SpeechRecognition||window.webkitSpeechRecognition;if(!R)return;const r=new R();r.lang=RL[S.lang];r.onresult=e=>send(e.results[0][0].transcript,0,true);r.start()};
$('#nc').onclick=()=>{newChat();$('#side').classList.remove('open')};
$('#menu').onclick=()=>$('#side').classList.toggle('open');
$('#gear').onclick=()=>$('#dlg').showModal();
$('#list').onclick=e=>{const d=e.target.dataset.del;
 if(d){S.chats=S.chats.filter(c=>c.id!=d);if(!S.chats.length)return newChat();if(S.cur==d)S.cur=S.chats[0].id;save();return draw()}
 const li=e.target.closest('li');if(li){S.cur=+li.dataset.id;save();draw();$('#side').classList.remove('open')}};
$('#msgs').onclick=e=>{const b=e.target.closest('button');if(!b)return;const a=b.dataset.a,box=b.closest('.code');
 if(a==='fix'){fixSrc=b.closest('.m').querySelector('.gi').getAttribute('src');inp.value=t('fix')+': ';inp.focus()}
 if(a==='say')say(cur().msgs[b.dataset.i].content);
 if(a==='copy')navigator.clipboard.writeText(box.querySelector('code').textContent);
 if(a==='prev'){let f=box.querySelector('iframe');if(f)f.remove();else{f=document.createElement('iframe');f.sandbox='allow-scripts';f.srcdoc=box.querySelector('code').textContent;box.append(f)}}};

[['theme','theme'],['lang','lang'],['prov','prov'],['srv','server']].forEach(([id,k])=>{const el=$('#s-'+id);el.value=S[k];el.onchange=()=>{S[k]=el.value.trim();save();draw()}});
if(!S.chats.length)newChat();else{if(!cur())S.cur=S.chats[0].id;draw()}

/* v2: natural voice, voice chat, camera, video */
let au,sayDone;
function stopSay(){try{au&&au.pause()}catch(e){}speechSynthesis.cancel();sayDone&&sayDone()}
async function say(x){x=x.replace(/```[\s\S]*?```/g,'').replace(/[*_#`>]/g,'');stopSay();
 return new Promise(async ok=>{let d=0,mx;const fin=()=>{if(!d){d=1;clearTimeout(mx);sayDone=null;ok()}};sayDone=fin;
  mx=setTimeout(fin,Math.min(90000,x.length*120+5000));
  try{au=new Audio(URL.createObjectURL(await post('/tts',{text:x})));au.onended=fin;au.onerror=fin;await au.play()}
  catch(e){$('#st').textContent=t('fb');const u=new SpeechSynthesisUtterance(x);u.lang=RL[S.lang];u.onend=fin;u.onerror=fin;speechSynthesis.speak(u)}})}

async function listen(max=15000){
 const st=await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:true,noiseSuppression:true,autoGainControl:true}}),ac=new AudioContext(),an=ac.createAnalyser();
 ac.createMediaStreamSource(st).connect(an);
 const buf=new Uint8Array(an.fftSize),rec=new MediaRecorder(st),ch=[];
 rec.ondataavailable=e=>ch.push(e.data);rec.start();
 let spoke=0,quiet=0;const t0=Date.now();
 await new Promise(ok=>{const tk=setInterval(()=>{an.getByteTimeDomainData(buf);
  const v=Math.max(...buf.map(x=>Math.abs(x-128)));
  if(v>8){spoke=1;quiet=0}else if(spoke)quiet+=100;
  if((spoke&&quiet>1500)||Date.now()-t0>max||(!spoke&&Date.now()-t0>7000)||!listen.on){clearInterval(tk);ok()}},100)});
 const done=new Promise(r=>rec.onstop=r);rec.stop();await done;st.getTracks().forEach(x=>x.stop());ac.close();
 if(!spoke||!listen.on)return'';
 const f=new FormData();f.append('audio',new Blob(ch,{type:'audio/webm'}),'a.webm');
 const r=await fetch((S.server||'').replace(/\/$/,'')+'/transcribe',{method:'POST',body:f});
 if(!r.ok)throw Error(r.status+' '+(await r.text().catch(()=>'')).slice(0,120));
 return(await r.json()).text||''}

const mic=$('#mic');
mic.onclick=async()=>{if(mic.classList.contains('active')){listen.on=0;return}
 mic.classList.add('active');listen.on=1;
 try{const q=await listen();if(q)send(q,0,true)}catch(e){$('#st').textContent=t('err')+e.message}
 mic.classList.remove('active')};

async function voiceChat(){const o=$('#vo');if(!o.hidden)return;o.hidden=false;listen.on=1;
 while(listen.on){try{
  o.dataset.s='listen';$('#vt').textContent='…';
  const q=await listen();if(!listen.on)break;if(!q)continue;
  o.dataset.s='think';$('#vt').textContent=q;
  const c=cur();c.msgs.push({role:'user',content:q});if(!c.title)c.title=q.slice(0,30);save();draw();
  const r=await post('/chat',{provider:S.prov,voice:true,messages:c.msgs.map(({role,content})=>({role,content:content||'[image]'}))});
  c.msgs.push({role:'assistant',content:r.text});save();draw();
  o.dataset.s='talk';await say(r.text)
 }catch(e){if(e.name==='NotAllowedError')break;$('#vt').textContent=t('err')+e.message;await new Promise(r=>setTimeout(r,2500))}}
 o.hidden=true}
$('#vc').onclick=voiceChat;$('#vx').onclick=()=>{listen.on=0;stopSay()};$('#orb').onclick=stopSay;

let cs;
$('#cam').onclick=async()=>{try{cs=await navigator.mediaDevices.getUserMedia({video:{facingMode:'environment'}});$('#cv').srcObject=cs;await $('#cv').play().catch(()=>{});$('#ct').textContent='';$('#co').hidden=false}catch(e){$('#st').textContent=t('err')+e.message}};
function shot(){const v=$('#cv');if(!v.videoWidth)throw Error('camera not ready');const c=document.createElement('canvas'),k=Math.min(1,768/v.videoWidth);c.width=v.videoWidth*k;c.height=v.videoHeight*k;c.getContext('2d').drawImage(v,0,0,c.width,c.height);return c.toDataURL('image/jpeg',.7)}
async function see(q){const o=$('#ct');o.textContent='…';try{const r=await post('/vision',{image:shot(),prompt:q});o.textContent=r.text;await say(r.text)}catch(e){o.textContent=t('err')+e.message}}
$('#cd').onclick=()=>see('Describe what you see and name the main objects. Answer in language code: '+S.lang);
$('#cm').onclick=async()=>{listen.on=1;$('#ct').textContent='…';try{const q=await listen();if(q)await see(q+'\n(Answer in the same language as this question.)');else $('#ct').textContent=''}catch(e){$('#ct').textContent=t('err')+e.message}};
$('#cx').onclick=()=>{listen.on=0;cs&&cs.getTracks().forEach(x=>x.stop());$('#co').hidden=true;stopSay()};

$('#vid').onclick=async()=>{const p=inp.value.trim();if(!p){$('#st').textContent=hint();inp.focus();return}inp.value='';const c=cur();
 c.msgs.push({role:'user',content:p});if(!c.title)c.title=p.slice(0,30);draw();$('#st').textContent='🎬 …';
 try{const j=await post('/video',{prompt:p,seconds:5});
  for(let i=0;i<60;i++){await new Promise(r=>setTimeout(r,5000));
   const s=await(await fetch((S.server||'').replace(/\/$/,'')+'/video/'+j.id)).json();
   if(s.status==='completed'&&s.videoUrl){c.msgs.push({role:'assistant',content:'',img:s.videoUrl,vid:1});break}
   if(s.status==='failed')throw Error(s.error||'video')}
  $('#st').textContent=''}catch(e){$('#st').textContent=t('err')+e.message}
 save();draw()};

/* v5: Logo Studio */
const LC=['Esports Gaming','Clan Logo','Company Logo','Minimalist Logo','Mascot Logo','3D Logo'],
 LS=['Flat vector','Gradient','Neon glow','Metallic chrome','3D render','Line art'],
 COL=[['Cyan','#00e5ff'],['Purple','#8b5cf6'],['Magenta','#ff2bd6'],['Red','#ff3b3b'],['Gold','#ffc83d'],['Green','#22e08a'],['Blue','#3b82f6'],['White','#ffffff'],['Black','#111111']];
const lg={c:0,s:0,k:[0,1],last:null};
let gal=[];try{gal=JSON.parse(localStorage.getItem('nova_logos')||'[]')}catch(e){}
const gsave=()=>{try{localStorage.setItem('nova_logos',JSON.stringify(gal));return 1}catch(e){return 0}};
function lgDraw(){
 $('#lc').innerHTML=LC.map((x,i)=>`<button class="chip${i===lg.c?' on':''}" data-c="${i}">${x}</button>`).join('');
 $('#ls').innerHTML=LS.map((x,i)=>`<button class="chip${i===lg.s?' on':''}" data-s="${i}">${x}</button>`).join('');
 $('#lk').innerHTML=COL.map((x,i)=>`<button class="chip sw${lg.k.includes(i)?' on':''}" data-k="${i}" title="${esc(x[0])}" style="--c:${x[1]}"></button>`).join('')+'<label class="cc">+<input type="color" id="lcc"></label>';
 $('#lgal').innerHTML=gal.map((g,i)=>`<div class="gi2"><img src="${g.src}" data-v="${i}" alt="${esc(g.name)}"><button data-d="${i}">×</button></div>`).join('')||'<span>—</span>'}
function lgShow(src,p){lg.last={src,p,n:$('#ln').value.trim()};$('#lbox').innerHTML=`<img src="${src}" alt="logo">`;$('#lp').textContent=p||'';['#lre','#ldl','#lsv'].forEach(i=>$(i).disabled=false)}
async function lgGo(again){
 const name=$('#ln').value.trim(),st=$('#lst'),b=$('#lgo');
 if(!name){st.textContent='Enter a name first.';$('#ln').focus();return}
 if(again&&lg.last?.n!==name)again=false;
 b.disabled=$('#lre').disabled=true;st.textContent='Designing your logo… this can take up to a minute.';$('#lbox').classList.add('busy');
 try{const r=await post('/logo',{name,desc:$('#ld').value.trim(),category:LC[lg.c],style:LS[lg.s],colors:lg.k.map(i=>COL[i][0]+' '+COL[i][1]),prompt:again?lg.last.p:undefined});
  lgShow(r.image,r.prompt);st.textContent=''}
 catch(e){st.textContent='Error: '+e.message}
 b.disabled=false;$('#lre').disabled=!lg.last;$('#lbox').classList.remove('busy')}
$('#lgb').onclick=()=>{lgDraw();$('#lg').hidden=false};
$('#lgx').onclick=()=>$('#lg').hidden=true;
$('#lgo').onclick=()=>lgGo(0);$('#lre').onclick=()=>lgGo(1);
$('#lc').onclick=e=>{const i=e.target.dataset.c;if(i!=null){lg.c=+i;lgDraw()}};
$('#ls').onclick=e=>{const i=e.target.dataset.s;if(i!=null){lg.s=+i;lgDraw()}};
$('#lk').onclick=e=>{const b=e.target.closest('[data-k]');if(!b)return;const i=+b.dataset.k;lg.k=lg.k.includes(i)?lg.k.filter(x=>x!==i):[...lg.k,i].slice(-3);lgDraw()};
$('#lk').onchange=e=>{if(e.target.id==='lcc'){COL.push([e.target.value,e.target.value]);lg.k=[...lg.k,COL.length-1].slice(-3);lgDraw()}};
$('#ldl').onclick=()=>{const a=document.createElement('a');a.href=lg.last.src;a.download=($('#ln').value.trim()||'logo').replace(/[^\w-]+/g,'_')+'_nova-logo.'+(lg.last.src.match(/^data:image\/(\w+)/)||[0,'png'])[1];document.body.append(a);a.click();a.remove()};
$('#lsv').onclick=async()=>{const i=new Image();i.src=lg.last.src;await i.decode();const c=document.createElement('canvas'),k=Math.min(1,768/i.width);c.width=i.width*k;c.height=i.height*k;c.getContext('2d').drawImage(i,0,0,c.width,c.height);
 gal.unshift({name:$('#ln').value.trim()||'Logo',src:c.toDataURL('image/webp',.9),p:lg.last.p});gal=gal.slice(0,20);
 if(gsave())$('#lst').textContent='Saved to your gallery.';else{gal.shift();$('#lst').textContent='Storage is full: delete a saved logo first.'}lgDraw()};
$('#lgal').onclick=e=>{const v=e.target.dataset.v,d=e.target.dataset.d;
 if(v!=null){$('#ln').value=gal[v].name;lgShow(gal[v].src,gal[v].p)}
 if(d!=null){gal.splice(d,1);gsave();lgDraw()}};
