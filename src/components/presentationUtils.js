import { jsPDF } from "jspdf";
import JSZip from "jszip";
import * as pdfjsLib from "pdfjs-dist";
import pdfWorker from "pdfjs-dist/build/pdf.worker.min.mjs?url";

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;
export const PRESENTATION_API = (import.meta.env.VITE_PRESENTATION_API_URL || "").replace(/\/$/, "");
export const MAX_PRESENTATION_SIZE = 25 * 1024 * 1024;
export const MAX_SLIDES = 100;
const MAX_PIXELS = 16_000_000;

export function saveBlob(blob, name) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = name;
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

export function safeName(name) {
  return (name.trim() || "presentation").replace(/\.(pdf|zip|pptx?|png|jpe?g)$/i, "").replace(/[\\/:*?"<>|]/g, "_").slice(0, 140);
}

export async function backendPdf(file) {
  if (!PRESENTATION_API) throw new Error("Legacy .ppt and enhanced chart rendering require a configured PowerPoint conversion server. See README-POWERPOINT.md.");
  const form = new FormData();
  form.append("presentation", file);
  let response;
  try {
    response = await fetch(`${PRESENTATION_API}/api/presentation/pdf`, { method: "POST", body: form });
  } catch {
    throw new Error("Could not reach the PowerPoint conversion server. Check its address and that it is running.");
  }
  if (!response.ok) {
    let message = `Conversion service returned HTTP ${response.status}.`;
    try { message = (await response.json()).error || message; } catch { /* non-JSON error */ }
    throw new Error(message);
  }
  return response.blob();
}

function svgSize(svg) {
  const doc = new DOMParser().parseFromString(svg, "image/svg+xml");
  if (doc.querySelector("parsererror")) throw new Error("Invalid slide SVG.");
  const root = doc.documentElement;
  const view = root.getAttribute("viewBox")?.trim().split(/[\s,]+/).map(Number);
  const width = view?.length === 4 ? view[2] : parseFloat(root.getAttribute("width"));
  const height = view?.length === 4 ? view[3] : parseFloat(root.getAttribute("height"));
  if (!(width > 0 && height > 0)) throw new Error("Slide size is invalid.");
  return { width, height };
}

export async function svgCanvas(svg, scale = 1.5) {
  const { width, height } = svgSize(svg);
  const factor = Math.min(scale, Math.sqrt(MAX_PIXELS / (width * height)));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(width * factor));
  canvas.height = Math.max(1, Math.round(height * factor));
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas rendering is unavailable.");
  ctx.fillStyle = "white";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  const url = URL.createObjectURL(new Blob([svg], { type: "image/svg+xml;charset=utf-8" }));
  try {
    const img = new Image();
    await new Promise((resolve, reject) => {
      img.onload = resolve;
      img.onerror = () => reject(new Error("A slide could not be rendered in your browser."));
      img.src = url;
    });
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    return { canvas, width, height };
  } finally { URL.revokeObjectURL(url); }
}

export async function loadBrowserPptx(file) {
  const { PptxRenderer } = await import("pptx-svg");
  const renderer = new PptxRenderer();
  await renderer.init();
  const result = await renderer.loadPptx(await file.arrayBuffer());
  if (!result.slideCount || result.slideCount > MAX_SLIDES) throw new Error(`Presentations must have 1–${MAX_SLIDES} slides.`);
  return { renderer, count: result.slideCount };
}

export async function browserPdf(renderer, count, progress) {
  let pdf;
  for (let i = 0; i < count; i++) {
    const { canvas, width, height } = await svgCanvas(renderer.renderSlideSvg(i));
    const pw = 720, ph = pw * height / width;
    if (!pdf) pdf = new jsPDF({ orientation: width >= height ? "landscape" : "portrait", unit: "pt", format: [pw, ph], compress: true });
    else pdf.addPage([pw, ph], width >= height ? "landscape" : "portrait");
    pdf.addImage(canvas.toDataURL("image/png"), "PNG", 0, 0, pw, ph, undefined, "FAST");
    canvas.width = canvas.height = 0;
    progress(Math.round((i + 1) * 100 / count));
    await new Promise((resolve) => setTimeout(resolve, 0));
  }
  return pdf.output("blob");
}

function canvasBlob(canvas, format, quality) {
  return new Promise((resolve, reject) => canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error("Image export failed.")), format, quality));
}

export async function slidesToZip({ renderer, pdfBlob, count, format, progress }) {
  const zip = new JSZip();
  let pdf;
  try {
    if (pdfBlob) {
      pdf = await pdfjsLib.getDocument({ data: await pdfBlob.arrayBuffer() }).promise;
      count = pdf.numPages;
    }
    if (!count || count > MAX_SLIDES) throw new Error(`Presentations must have 1–${MAX_SLIDES} slides.`);
    for (let i = 0; i < count; i++) {
      let canvas;
      if (pdf) {
        const page = await pdf.getPage(i + 1);
        const base = page.getViewport({ scale: 1 });
        const scale = Math.min(2, Math.sqrt(MAX_PIXELS / (base.width * base.height)));
        const viewport = page.getViewport({ scale });
        canvas = document.createElement("canvas");
        canvas.width = Math.round(viewport.width);
        canvas.height = Math.round(viewport.height);
        await page.render({ canvasContext: canvas.getContext("2d"), viewport }).promise;
        page.cleanup();
      } else {
        ({ canvas } = await svgCanvas(renderer.renderSlideSvg(i)));
      }
      const mime = format === "jpg" ? "image/jpeg" : "image/png";
      const blob = await canvasBlob(canvas, mime, format === "jpg" ? 0.92 : undefined);
      zip.file(`slide-${String(i + 1).padStart(3, "0")}.${format}`, blob);
      canvas.width = canvas.height = 0;
      progress(Math.round((i + 1) * 95 / count));
      await new Promise((resolve) => setTimeout(resolve, 0));
    }
    const result = await zip.generateAsync({ type: "blob" });
    progress(100);
    return result;
  } finally { if (pdf) await pdf.destroy(); }
}
