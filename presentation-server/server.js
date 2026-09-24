import express from "express";
import multer from "multer";
import { spawn } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

const app = express();
const port = Number(process.env.PORT || 8787);
const allowedOrigins = (process.env.ALLOWED_ORIGINS || "http://localhost:5173,http://localhost:5174,http://localhost:5175,http://localhost:5176,http://localhost:5177").split(",").map(x=>x.trim());
const soffice = process.env.LIBREOFFICE_PATH || (process.platform === "win32" ? "C:\\Program Files\\LibreOffice\\program\\soffice.exe" : "libreoffice");
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 25 * 1024 * 1024, files: 1 } });
let running = false;
app.use((req,res,next)=>{
  const origin = req.headers.origin;
  if (origin && allowedOrigins.includes(origin)) {res.setHeader("Access-Control-Allow-Origin",origin);res.setHeader("Vary","Origin");}
  if (req.method === "OPTIONS") {res.setHeader("Access-Control-Allow-Methods","POST,GET,OPTIONS");res.setHeader("Access-Control-Allow-Headers","Content-Type");return res.sendStatus(204);}
  next();
});
app.get("/health",(_req,res)=>res.json({ok:true}));
app.post("/api/presentation/pdf",upload.single("presentation"),async(req,res)=>{
  const origin = req.headers.origin;
  if (origin && !allowedOrigins.includes(origin)) return res.status(403).json({error:"Origin is not allowed."});
  if (!req.file || !/\.pptx?$/i.test(req.file.originalname)) return res.status(400).json({error:"Upload a .ppt or .pptx presentation."});
  if (running) return res.status(503).json({error:"Conversion server is busy. Try again shortly."});
  running = true;
  const folder = await mkdtemp(join(tmpdir(),"filetoolkit-ppt-"));
  try {
    const ext = /\.pptx$/i.test(req.file.originalname) ? ".pptx" : ".ppt";
    const input = join(folder,`input${ext}`);
    await writeFile(input,req.file.buffer);
    const output = join(folder,"input.pdf");
    const profile = join(folder,"lo-profile");
    await new Promise((resolve,reject)=>{
      const child = spawn(soffice,[`-env:UserInstallation=file:///${profile.replaceAll("\\","/")}`,"--headless","--convert-to","pdf:impress_pdf_Export","--outdir",folder,input],{windowsHide:true,stdio:["ignore","ignore","pipe"]});
      let stderr="";
      const timer=setTimeout(()=>child.kill(),120000);
      child.stderr.on("data",d=>{stderr+=d.toString().slice(0,2000);});
      child.on("error",e=>{clearTimeout(timer);reject(new Error(`LibreOffice failed to start: ${e.message}`));});
      child.on("close",code=>{clearTimeout(timer);code===0?resolve():reject(new Error(`LibreOffice conversion failed (${code}). ${stderr.slice(0,200)}`));});
    });
    const info=await stat(output);
    if (!info.size || info.size > 150*1024*1024) throw new Error("Invalid or oversized output PDF.");
    const bytes=await readFile(output);
    res.type("application/pdf").setHeader("Cache-Control","no-store");
    res.send(bytes);
  } catch(e){console.error(e);res.status(500).json({error:"Unable to convert this presentation. Check that LibreOffice is installed and the file is valid."});}
  finally {running=false;await rm(folder,{recursive:true,force:true}).catch(()=>{});}
});
app.use((err,_req,res,_next)=>{
  if (err instanceof multer.MulterError) return res.status(413).json({error:"Maximum presentation size is 25 MB."});
  res.status(500).json({error:"Conversion request failed."});
});
app.listen(port,()=>console.log(`Presentation service running on port ${port}`));
