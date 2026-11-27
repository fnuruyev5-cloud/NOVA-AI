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
 $('#msgs').innerHTML=c.msgs.length?c.msgs.map((m,i)=>`<div class="m ${m.role}">${m.img?`<img class="gi" src="${esc(m.img)}" alt=""><div class="acts"><a href="${esc(m.img)}" download="nova.png">${t('dl')}</a><button data-a="fix">${t('fix')}</button></div>`:md(m.content)}${m.role==='assistant'&&!m.img?`<div class="acts"><button data-a="say" data-i="${i}">🔊</button></div>`:''}</div>`).join(''):'<div class="empty"><img class="lg" alt=""><h2>Nova AI</h2></div>';
 theme();$('#msgs').scrollTop=1e9}

async function post(p,b){
 const r=await fetch((S.server||'').replace(/\/$/,'')+p,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(b)});
 if(!r.ok)throw Error(r.status+' '+(await r.text().catch(()=>'')).slice(0,150));return p==='/tts'?r.blob():r.json()}

async function send(txt,mode,speak){const c=cur();c.msgs.push({role:'user',content:txt});if(!c.title)c.title=txt.slice(0,30);save();draw();$('#st').textContent='…';
 try{
  if(mode==='img'){const r=await post('/image',{prompt:txt,history:c.msgs.slice(-6).map(({role,content})=>({role,content}))});c.msgs.push({role:'assistant',content:'',img:r.image||r.url})}
  else{const r=await post('/chat',{provider:S.prov,lang:S.lang,messages:c.msgs.map(({role,content})=>({role,content:content||'[image]'}))});c.msgs.push({role:'assistant',content:r.text})}
 }catch(e){$('#st').textContent=t('err')+e.message;return}
 $('#st').textContent='';save();draw();const l=c.msgs[c.msgs.length-1];if(speak&&l.content)say(l.content)}

async function say(x){x=x.replace(/```[\s\S]*?```/g,'');
 try{new Audio(URL.createObjectURL(await post('/tts',{text:x,lang:S.lang}))).play()}
 catch(e){$('#st').textContent=t('fb');const u=new SpeechSynthesisUtterance(x);u.lang=RL[S.lang];speechSynthesis.cancel();speechSynthesis.speak(u)}}

function go(m){const v=inp.value.trim();if(v){inp.value='';send(v,m)}}
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
 if(a==='fix'){inp.value=t('fix')+': ';inp.focus()}
 if(a==='say')say(cur().msgs[b.dataset.i].content);
 if(a==='copy')navigator.clipboard.writeText(box.querySelector('code').textContent);
 if(a==='prev'){let f=box.querySelector('iframe');if(f)f.remove();else{f=document.createElement('iframe');f.sandbox='allow-scripts';f.srcdoc=box.querySelector('code').textContent;box.append(f)}}};

[['theme','theme'],['lang','lang'],['prov','prov'],['srv','server']].forEach(([id,k])=>{const el=$('#s-'+id);el.value=S[k];el.onchange=()=>{S[k]=el.value.trim();save();draw()}});
if(!S.chats.length)newChat();else{if(!cur())S.cur=S.chats[0].id;draw()}
