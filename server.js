import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import rateLimit from "express-rate-limit";
import path from "node:path";
import { fileURLToPath } from "node:url";

dotenv.config();
const app = express();
const __dirname = path.dirname(fileURLToPath(import.meta.url));
app.use(cors());
app.use(express.json({limit:"1mb"}));
app.use(rateLimit({windowMs:60_000,limit:30,standardHeaders:true,legacyHeaders:false}));
app.use(express.static(path.join(__dirname,"public")));

app.get("/health",(_req,res)=>res.json({ok:true,app:"NovaAI"}));

function getProvider(name) {
  if(name==="cometapi") {
    if(!process.env.COMETAPI_API_KEY || !process.env.COMETAPI_MODEL) throw new Error("CometAPI açarı/modeli Render Environment bölməsində qurulmayıb.");
    return {url:"https://api.cometapi.com/v1/chat/completions",key:process.env.COMETAPI_API_KEY,model:process.env.COMETAPI_MODEL};
  }
  if(!process.env.GROQ_API_KEY || !process.env.GROQ_MODEL) throw new Error("Groq açarı/modeli Render Environment bölməsində qurulmayıb.");
  return {url:"https://api.groq.com/openai/v1/chat/completions",key:process.env.GROQ_API_KEY,model:process.env.GROQ_MODEL};
}

app.post("/api/chat",async(req,res)=>{
 try {
  const {messages,provider=process.env.DEFAULT_PROVIDER||"groq",mode="chat"}=req.body||{};
  if(!Array.isArray(messages)||messages.length<1||messages.length>40) return res.status(400).json({error:"Mesaj tarixçəsi düzgün deyil."});
  if(!["groq","cometapi"].includes(provider)) return res.status(400).json({error:"AI provayderi düzgün deyil."});
  const clean=messages.map(m=>({role:m.role==="assistant"?"assistant":"user",content:String(m.content||"").slice(0,12000)}));
  const system=mode==="code"
   ?"You are NovaAI Code Assistant. Write clear, safe code and explain it. Reply in the user's language."
   :"You are NovaAI, a helpful general-purpose assistant. Reply in the user's language. Be accurate and say when uncertain.";
  const cfg=getProvider(provider);
  const upstream=await fetch(cfg.url,{method:"POST",headers:{Authorization:`Bearer ${cfg.key}`,"Content-Type":"application/json"},body:JSON.stringify({model:cfg.model,messages:[{role:"system",content:system},...clean],temperature:.7,max_tokens:1400})});
  const data=await upstream.json().catch(()=>({}));
  if(!upstream.ok) return res.status(upstream.status).json({error:data?.error?.message||data?.message||"AI provayder xətası"});
  res.json({reply:data?.choices?.[0]?.message?.content||"Cavab boş gəldi.",provider,model:data?.model||cfg.model});
 } catch(e) { res.status(500).json({error:e.message||"Server xətası"}); }
});

app.get("*",(req,res)=>res.sendFile(path.join(__dirname,"public","index.html")));
const PORT=Number(process.env.PORT||10000);
app.listen(PORT,"0.0.0.0",()=>console.log(`NovaAI web listening on ${PORT}`));
