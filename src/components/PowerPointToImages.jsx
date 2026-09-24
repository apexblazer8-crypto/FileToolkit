import { useRef, useState } from "react";
import { ArrowLeft, Presentation, Download, Trash2, CheckCircle2 } from "lucide-react";
import { PRESENTATION_API, MAX_PRESENTATION_SIZE, saveBlob, safeName, backendPdf, loadBrowserPptx, slidesToZip } from "./presentationUtils";

export default function PowerPointToImages({ onBack }) {
  const input = useRef(null);
  const [file,setFile] = useState(null);
  const [renderer,setRenderer] = useState(null);
  const [count,setCount] = useState(0);
  const [format,setFormat] = useState("png");
  const [busy,setBusy] = useState(false);
  const [progress,setProgress] = useState(0);
  const [error,setError] = useState("");
  const [success,setSuccess] = useState("");
  const clear = () => {setFile(null);setRenderer(null);setCount(0);setProgress(0);setError("");setSuccess("");if(input.current)input.current.value="";};
  const choose = async (next) => {
    if (!next || busy) return;
    clear();
    if (!/\.pptx?$/i.test(next.name)) {setError("Choose a .ppt or .pptx presentation.");return;}
    if (next.size > MAX_PRESENTATION_SIZE) {setError("Maximum file size is 25 MB.");return;}
    if (/\.ppt$/i.test(next.name) && !PRESENTATION_API) {setError("Older .ppt files need the optional conversion server. See README-POWERPOINT.md.");return;}
    setBusy(true);
    try {if (!PRESENTATION_API) {const result = await loadBrowserPptx(next);setRenderer(result.renderer);setCount(result.count);}setFile(next);}
    catch(e){setError(e.message||"Could not read presentation.");}
    finally{setBusy(false);}
  };
  const convert = async () => {
    if(!file||busy)return;
    setBusy(true);setError("");setSuccess("");setProgress(0);
    try {const pdfBlob = PRESENTATION_API ? await backendPdf(file) : null;const zip = await slidesToZip({renderer,pdfBlob,count,format,progress:setProgress});saveBlob(zip,`${safeName(file.name)}-${format}-slides.zip`);setSuccess("Slide images ZIP ready.");}
    catch(e){setError(e.message||"Slide export failed.");}
    finally{setBusy(false);}
  };
  return <main className="converter-page"><button className="back-button" type="button" onClick={onBack}><ArrowLeft size={18}/> Back to all tools</button><div className="converter-header"><h1>PowerPoint to Images</h1><p>Export every slide as a PNG or JPG image in one ZIP file.</p></div><input ref={input} type="file" accept=".ppt,.pptx" hidden onChange={(e)=>choose(e.target.files?.[0])}/>{!file && <div className="upload-area" onDragOver={(e)=>e.preventDefault()} onDrop={(e)=>{e.preventDefault();choose(e.dataTransfer.files?.[0]);}}><Presentation size={45}/><h3>Choose a PowerPoint presentation</h3><p>{PRESENTATION_API?".ppt and .pptx":".pptx (browser mode)"} • Up to 25 MB • Up to 100 slides</p><button className="upload-button" disabled={busy} onClick={()=>input.current?.click()}>{busy?"Opening...":"Select PowerPoint"}</button></div>}{file && <section className="selected-images" style={{maxWidth:760,marginInline:"auto"}}><div className="tool-card" style={{display:"flex",alignItems:"center",gap:16,flexWrap:"wrap"}}><Presentation size={30}/><div style={{flex:1,minWidth:180,overflowWrap:"anywhere"}}><strong>{file.name}</strong><p>{count?`${count} slides • `:""}{(file.size/1048576).toFixed(2)} MB</p></div><button className="remove-image" disabled={busy} onClick={clear}><Trash2 size={17}/> Remove</button></div><label style={{display:"block",marginTop:24,fontWeight:600}}>Image format</label><select className="search-input" style={{width:"100%",marginTop:8}} value={format} disabled={busy} onChange={(e)=>setFormat(e.target.value)}><option value="png">PNG (lossless)</option><option value="jpg">JPG (smaller files)</option></select><button className="convert-button" disabled={busy} onClick={convert}><Download size={19}/>{busy?`Exporting... ${progress}%`:"Download slide images ZIP"}</button></section>}{error&&<p role="alert" style={{color:"#b91c1c",textAlign:"center",marginTop:20}}>{error}</p>}{success&&<p role="status" style={{color:"#15803d",textAlign:"center",marginTop:20}}><CheckCircle2 size={17}/> {success}</p>}<p style={{textAlign:"center",color:"#64748b",fontSize:13,marginTop:28}}>{PRESENTATION_API?"Presentations are sent to the configured conversion service. Review exported slides for layout differences.":"Browser rendering may omit charts and complex PowerPoint objects. Use the optional conversion service for legacy .ppt and improved fidelity."}</p></main>;
}
