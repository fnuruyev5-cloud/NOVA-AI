require("dotenv").config();
const express = require("express");
const path = require("path");
const fs = require("fs");
const app = express();
const PUBLIC = path.join(__dirname, "public");
const INDEX = path.join(PUBLIC, "index.html");

app.disable("x-powered-by");
app.use(express.json({limit:"2mb"}));
app.use(express.static(PUBLIC, {extensions:["html"]}));

app.get("/health", (_req,res)=>res.status(200).json({ok:true,name:"NovaAI"}));
app.get("/", (_req,res)=>{
  if (!fs.existsSync(INDEX)) return res.status(500).type("text").send("NovaAI deploy xətası: public/index.html tapılmadı. Fayl quruluşunu README-dəki kimi düzəldin.");
  res.sendFile(INDEX);
});
app.get("/api/status", (_req,res)=>res.json({
  groq:!!process.env.GROQ_API_KEY,
  gemini:!!process.env.GEMINI_API_KEY,
  cometapi:!!process.env.COMETAPI_KEY
}));

async function openAICompatible(url,key,model,messages){
  const r=await fetch(url,{method:"POST",headers:{Authorization:`Bearer ${key}`,"Content-Type":"application/json"},
    body:JSON.stringify({model,messages,temperature:.7})});
  const d=await r.json();
  if(!r.ok) throw new Error(d.error?.message || `AI provayder xətası (${r.status})`);
  return d.choices?.[0]?.message?.content || "Cavab boş gəldi.";
}
async function gemini(messages){
  const model=process.env.GEMINI_MODEL||"gemini-2.5-flash";
  const system=messages.find(m=>m.role==="system")?.content;
  const contents=messages.filter(m=>m.role!=="system").map(m=>({
    role:m.role==="assistant"?"model":"user",parts:[{text:String(m.content||"")}]}));
  const url=`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(process.env.GEMINI_API_KEY)}`;
  const r=await fetch(url,{method:"POST",headers:{"Content-Type":"application/json"},
    body:JSON.stringify({...system?{systemInstruction:{parts:[{text:system}]}}:{},contents,generationConfig:{temperature:.7}})});
  const d=await r.json();
  if(!r.ok) throw new Error(d.error?.message || `Gemini xətası (${r.status})`);
  return d.candidates?.[0]?.content?.parts?.map(p=>p.text||"").join("") || "Cavab boş gəldi.";
}
app.post("/api/chat",async(req,res)=>{
  try{
    const {provider="groq",messages=[]}=req.body||{};
    if(!Array.isArray(messages)||!messages.length) return res.status(400).json({error:"Mesaj daxil edin."});
    const safe=messages.slice(-24).map(m=>({role:["system","user","assistant"].includes(m.role)?m.role:"user",content:String(m.content||"").slice(0,16000)}));
    let answer;
    if(provider==="gemini"){
      if(!process.env.GEMINI_API_KEY) throw new Error("GEMINI_API_KEY Render → Environment bölməsinə əlavə edilməyib.");
      answer=await gemini(safe);
    }else if(provider==="groq"){
      if(!process.env.GROQ_API_KEY) throw new Error("GROQ_API_KEY Render → Environment bölməsinə əlavə edilməyib.");
      answer=await openAICompatible("https://api.groq.com/openai/v1/chat/completions",process.env.GROQ_API_KEY,process.env.GROQ_MODEL||"llama-3.3-70b-versatile",safe);
    }else if(provider==="cometapi"){
      if(!process.env.COMETAPI_KEY) throw new Error("COMETAPI_KEY Render → Environment bölməsinə əlavə edilməyib.");
      answer=await openAICompatible("https://api.cometapi.com/v1/chat/completions",process.env.COMETAPI_KEY,process.env.COMETAPI_MODEL||"llama-3.3-70b-versatile",safe);
    }else return res.status(400).json({error:"Naməlum AI provayderi."});
    res.json({answer});
  }catch(e){res.status(500).json({error:e.message||"Server xətası."});}
});
app.use((req,res)=>res.status(404).json({error:"Bu ünvan mövcud deyil."}));
const port=process.env.PORT||3000;
app.listen(port,()=>console.log(`NovaAI running on ${port}; homepage=${fs.existsSync(INDEX)}`));
