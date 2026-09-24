import { useRef, useState } from "react";
import { ArrowLeft, Presentation, Download, Trash2, CheckCircle2 } from "lucide-react";
import { PRESENTATION_API, MAX_PRESENTATION_SIZE, MAX_SLIDES, saveBlob, safeName, backendPdf, loadBrowserPptx, browserPdf, svgCanvas } from "./presentationUtils";

export default function PowerPointToPdf({ onBack }) {
  const input = useRef(null);
  const [file, setFile] = useState(null);
  const [renderer, setRenderer] = useState(null);
  const [count, setCount] = useState(0);
  const [preview, setPreview] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const clear = () => { setFile(null); setRenderer(null); setCount(0); setPreview(""); setError(""); setSuccess(""); setProgress(0); if (input.current) input.current.value = ""; };
  const choose = async (next) => {
    if (!next || busy) return;
    clear();
    if (!/\.pptx?$/i.test(next.name)) { setError("Choose a .ppt or .pptx presentation."); return; }
    if (next.size > MAX_PRESENTATION_SIZE) { setError("Maximum file size is 25 MB."); return; }
    if (/\.ppt$/i.test(next.name) && !PRESENTATION_API) { setError("Old .ppt files need the optional conversion server. See README-POWERPOINT.md; do not rename .ppt to .pptx."); return; }
    setBusy(true);
    try {
      if (!PRESENTATION_API) {
        const loaded = await loadBrowserPptx(next);
        const first = await svgCanvas(loaded.renderer.renderSlideSvg(0), 0.5);
        setPreview(first.canvas.toDataURL("image/png"));
        first.canvas.width = first.canvas.height = 0;
        setRenderer(loaded.renderer); setCount(loaded.count);
      }
      setFile(next); setName(safeName(next.name));
    } catch (e) { setError(e.message || "Could not read presentation."); }
    finally { setBusy(false); }
  };
  const convert = async () => {
    if (!file || busy) return;
    setBusy(true); setError(""); setSuccess(""); setProgress(0);
    try {
      const pdf = PRESENTATION_API ? await backendPdf(file) : await browserPdf(renderer, count, setProgress);
      saveBlob(pdf, `${safeName(name)}.pdf`);
      setProgress(100); setSuccess("PDF ready. Check the exported slides before sharing.");
    } catch (e) { setError(e.message || "Conversion failed."); }
    finally { setBusy(false); }
  };
  return <main className="converter-page">
    <button className="back-button" type="button" onClick={onBack}><ArrowLeft size={18}/> Back to all tools</button>
    <div className="converter-header"><h1>PowerPoint to PDF</h1><p>{PRESENTATION_API ? "Convert .ppt and .pptx presentations using the configured conversion service." : "Convert .pptx in your browser. Older .ppt and higher-fidelity charts require an optional conversion service."}</p></div>
    <input ref={input} hidden type="file" accept=".ppt,.pptx" onChange={(e) => choose(e.target.files?.[0])}/>
    {!file && <div className="upload-area" onDragOver={(e) => e.preventDefault()} onDrop={(e) => {e.preventDefault(); choose(e.dataTransfer.files?.[0]);}}><Presentation size={45}/><h3>{busy ? "Opening presentation..." : "Choose a PowerPoint presentation"}</h3><p>{PRESENTATION_API ? ".ppt and .pptx" : ".pptx (browser mode)"} • Up to 25 MB • Up to {MAX_SLIDES} slides</p><button className="upload-button" disabled={busy} onClick={() => input.current?.click()}>Select PowerPoint</button></div>}
    {file && <section className="selected-images" style={{maxWidth:760,marginInline:"auto"}}><h2>Selected presentation</h2><div className="tool-card" style={{display:"flex",gap:16,alignItems:"center",flexWrap:"wrap"}}><Presentation size={30}/><div style={{flex:1,minWidth:180,overflowWrap:"anywhere"}}><strong>{file.name}</strong><p>{count ? `${count} slides • ` : ""}{(file.size/1048576).toFixed(2)} MB</p></div><button className="remove-image" disabled={busy} onClick={clear}><Trash2 size={17}/> Remove</button></div>{preview && <div className="tool-card" style={{marginTop:20,textAlign:"center"}}><p>First slide preview</p><img src={preview} alt="First slide" style={{maxWidth:"100%",maxHeight:400}}/></div>}<label style={{display:"block",marginTop:22,fontWeight:600}}>Output PDF filename</label><input className="search-input" style={{width:"100%",marginTop:8}} value={name} onChange={(e)=>setName(e.target.value)} disabled={busy}/><button className="convert-button" disabled={busy} onClick={convert}><Download size={19}/>{busy ? `Converting... ${progress}%` : "Convert to PDF"}</button></section>}
    {error && <p role="alert" style={{color:"#b91c1c",textAlign:"center",marginTop:20}}>{error}</p>}{success && <p role="status" style={{color:"#15803d",textAlign:"center",marginTop:20}}><CheckCircle2 size={17}/> {success}</p>}
    <p style={{textAlign:"center",color:"#64748b",fontSize:13,marginTop:28}}>{PRESENTATION_API ? "PowerPoint files are uploaded temporarily to your configured conversion service. Fonts and complex objects may still differ; review the result." : "Files stay in your browser. Charts and complex PowerPoint elements may be omitted or rendered differently. PDF slide content is image-based."}</p>
  </main>;
}
