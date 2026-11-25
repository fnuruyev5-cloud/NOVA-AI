require("dotenv").config();
const express=require("express"),path=require("path"),app=express();
app.use(express.json({limit:"1mb"}));app.use(express.static(path.join(__dirname,"public")));
app.get("/health",(_,r)=>r.json({ok:true,app:"NovaAI"}));
async function chat(req,res){
 try{
  const {provider="groq",messages=[]}=req.body||{};
  if(!Array.isArray(messages)||!messages.length)return res.status(400).json({error:"Mesaj yoxdur."});
  let answer,key;
  if(provider==="gemini"){
   key=process.env.GEMINI_API_KEY;if(!key)throw Error("GEMINI_API_KEY Render Environment-də əlavə edilməyib.");
   const model=process.env.GEMINI_MODEL||"gemini-2.5-flash",system=messages.find(x=>x.role==="system")?.content;
   const contents=messages.filter(x=>x.role!=="system").slice(-20).map(x=>({role:x.role==="assistant"?"model":"user",parts:[{text:String(x.content||"") }]}));
   const r=await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(key)}`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({...system?{systemInstruction:{parts:[{text:system}]}}:{},contents})});
   const d=await r.json();if(!r.ok)throw Error(d.error?.message||"Gemini xətası");answer=d.candidates?.[0]?.content?.parts?.map(p=>p.text||"").join("");
  }else{
   key=provider==="cometapi"?process.env.COMETAPI_KEY:process.env.GROQ_API_KEY;
   if(!key)throw Error((provider==="cometapi"?"COMETAPI_KEY":"GROQ_API_KEY")+" Render Environment-də əlavə edilməyib.");
   const url=provider==="cometapi"?"https://api.cometapi.com/v1/chat/completions":"https://api.groq.com/openai/v1/chat/completions";
   const model=provider==="cometapi"?(process.env.COMETAPI_MODEL||"llama-3.3-70b-versatile"):(process.env.GROQ_MODEL||"llama-3.3-70b-versatile");
   const r=await fetch(url,{method:"POST",headers:{Authorization:`Bearer ${key}`,"Content-Type":"application/json"},body:JSON.stringify({model,messages:messages.slice(-20),temperature:.7})});
   const d=await r.json();if(!r.ok)throw Error(d.error?.message||"AI provider xətası");answer=d.choices?.[0]?.message?.content;
  }
  res.json({answer:answer||"Cavab alınmadı."});
 }catch(e){res.status(500).json({error:e.message||"Server xətası"});}
}
app.post("/api/chat",chat);app.listen(process.env.PORT||3000,()=>console.log("NovaAI started"));
