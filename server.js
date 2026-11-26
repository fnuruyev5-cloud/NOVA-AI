require("dotenv").config();
const express=require("express"),path=require("path"),fs=require("fs");
const app=express(),ROOT=__dirname;
app.disable("x-powered-by");
app.use(express.json({limit:"2mb"}));
const candidates=[path.join(ROOT,"public"),ROOT,path.join(ROOT,"dist"),path.join(ROOT,"build")];
for(const dir of candidates){if(fs.existsSync(dir))app.use(express.static(dir,{index:false}));}
function findIndex(){
  const options=[path.join(ROOT,"public","index.html"),path.join(ROOT,"index.html"),path.join(ROOT,"dist","index.html"),path.join(ROOT,"build","index.html")];
  return options.find(p=>fs.existsSync(p));
}
app.get("/health",(_q,s)=>s.status(200).json({ok:true,app:"NovaAI",root:ROOT,index:!!findIndex()}));
app.get("/api/status",(_q,s)=>s.json({groq:!!process.env.GROQ_API_KEY,gemini:!!process.env.GEMINI_API_KEY,cometapi:!!process.env.COMETAPI_KEY}));
app.get("/",(_q,s)=>{const f=findIndex();if(!f)return s.status(500).type("text").send("NovaAI: index.html tapılmadı. Render Root Directory boş olmalı və server.js ilə index.html eyni layihədə olmalıdır.");s.sendFile(f);});
async function compatible(url,key,model,messages){const r=await fetch(url,{method:"POST",headers:{Authorization:"Bearer "+key,"Content-Type":"application/json"},body:JSON.stringify({model,messages,temperature:.7})});const d=await r.json();if(!r.ok)throw Error(d.error?.message||"AI API xətası");return d.choices?.[0]?.message?.content||"Cavab alınmadı."}
async function gemini(messages){const model=process.env.GEMINI_MODEL||"gemini-2.5-flash",system=messages.find(m=>m.role==="system")?.content,contents=messages.filter(m=>m.role!=="system").map(m=>({role:m.role==="assistant"?"model":"user",parts:[{text:m.content}]}));const url="https://generativelanguage.googleapis.com/v1beta/models/"+encodeURIComponent(model)+":generateContent?key="+encodeURIComponent(process.env.GEMINI_API_KEY);const r=await fetch(url,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({...system?{systemInstruction:{parts:[{text:system}]}}:{},contents})});const d=await r.json();if(!r.ok)throw Error(d.error?.message||"Gemini API xətası");return d.candidates?.[0]?.content?.parts?.map(p=>p.text||"").join("")||"Cavab alınmadı."}
app.post("/api/chat",async(q,s)=>{try{const {provider="groq",messages=[]}=q.body||{};if(!Array.isArray(messages)||!messages.length)return s.status(400).json({error:"Mesaj yazın."});const m=messages.slice(-20).map(x=>({role:["system","user","assistant"].includes(x.role)?x.role:"user",content:String(x.content||"").slice(0,12000)}));let answer;if(provider==="gemini"){if(!process.env.GEMINI_API_KEY)throw Error("GEMINI_API_KEY Render Environment-də yoxdur.");answer=await gemini(m)}else if(provider==="cometapi"){if(!process.env.COMETAPI_KEY)throw Error("COMETAPI_KEY Render Environment-də yoxdur.");answer=await compatible("https://api.cometapi.com/v1/chat/completions",process.env.COMETAPI_KEY,process.env.COMETAPI_MODEL||"llama-3.3-70b-versatile",m)}else{if(!process.env.GROQ_API_KEY)throw Error("GROQ_API_KEY Render Environment-də yoxdur.");answer=await compatible("https://api.groq.com/openai/v1/chat/completions",process.env.GROQ_API_KEY,process.env.GROQ_MODEL||"llama-3.3-70b-versatile",m)}s.json({answer})}catch(e){s.status(500).json({error:e.message||"Server xətası"})}});
app.use((q,s)=>s.status(404).send("NovaAI: səhifə tapılmadı."));
const port=process.env.PORT||3000;app.listen(port,()=>console.log("NovaAI on "+port+"; root="+ROOT+"; index="+(findIndex()||"MISSING")));
