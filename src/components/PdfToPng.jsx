import { useEffect, useRef, useState } from "react";

import {
  ArrowLeft,
  Upload,
  FileImage,
  Download,
  Trash2,
  CheckCircle2,
} from "lucide-react";

import * as pdfjsLib from "pdfjs-dist";
import pdfWorker from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import JSZip from "jszip";

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;

const MAX_FILE_SIZE = 50 * 1024 * 1024;
const PREVIEW_LIMIT = 12;
const MAX_CANVAS_PIXELS = 32_000_000;

function formatSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;

  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(2)} KB`;
  }

  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);

  const link = document.createElement("a");
  link.href = url;
  link.download = filename;

  document.body.appendChild(link);
  link.click();
  link.remove();

  setTimeout(() => URL.revokeObjectURL(url), 60000);
}

function canvasToPng(canvas) {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error("Unable to generate the PNG image."));
        return;
      }

      resolve(blob);
    }, "image/png");
  });
}

function parsePageRange(value, totalPages) {
  const cleaned = value.trim();

  if (!cleaned) {
    throw new Error("Please enter the pages you want to convert.");
  }

  const pages = new Set();

  for (const part of cleaned.split(",")) {
    const item = part.trim();

    if (/^\d+$/.test(item)) {
      const page = Number(item);

      if (page < 1 || page > totalPages) {
        throw new Error(
          `Page ${page} is outside the PDF's page range.`
        );
      }

      pages.add(page);
      continue;
    }

    const match = item.match(/^(\d+)\s*-\s*(\d+)$/);

    if (!match) {
      throw new Error(
        'Invalid page selection. Use a format like "1,3,5-8".'
      );
    }

    const start = Number(match[1]);
    const end = Number(match[2]);

    if (start < 1 || end > totalPages || start > end) {
      throw new Error(
        `Invalid range "${item}". This PDF has ${totalPages} pages.`
      );
    }

    for (let page = start; page <= end; page++) {
      pages.add(page);
    }
  }

  return [...pages].sort((a, b) => a - b);
}

export default function PdfToPng({ onBack }) {
  const fileInputRef = useRef(null);
  const previewsRef = useRef([]);

  const [selectedFile, setSelectedFile] = useState(null);
  const [totalPages, setTotalPages] = useState(0);
  const [previews, setPreviews] = useState([]);

  const [pageMode, setPageMode] = useState("all");
  const [pageRange, setPageRange] = useState("");

  const [resolution, setResolution] = useState("2");
  const [outputName, setOutputName] = useState("");

  const [isLoading, setIsLoading] = useState(false);
  const [isConverting, setIsConverting] = useState(false);

  const [progress, setProgress] = useState(0);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    previewsRef.current = previews;
  }, [previews]);

  useEffect(() => {
    return () => {
      previewsRef.current.forEach((preview) => {
        URL.revokeObjectURL(preview.url);
      });
    };
  }, []);

  const clearPreviews = () => {
    previewsRef.current.forEach((preview) => {
      URL.revokeObjectURL(preview.url);
    });

    previewsRef.current = [];
    setPreviews([]);
  };

  const removeFile = () => {
    if (isLoading || isConverting) return;

    clearPreviews();

    setSelectedFile(null);
    setTotalPages(0);
    setPageMode("all");
    setPageRange("");
    setOutputName("");
    setProgress(0);
    setError("");
    setSuccess("");

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleFile = async (file) => {
    if (!file || isLoading || isConverting) return;

    removeFile();

    const isPdf =
      file.type === "application/pdf" ||
      file.name.toLowerCase().endsWith(".pdf");

    if (!isPdf) {
      setError("Please select a PDF document.");
      return;
    }

    if (file.size > MAX_FILE_SIZE) {
      setError("Maximum supported PDF size is 50 MB.");
      return;
    }

    setIsLoading(true);
    setError("");
    setSuccess("");

    let loadingTask;
    const generatedPreviews = [];

    try {
      const bytes = await file.arrayBuffer();

      loadingTask = pdfjsLib.getDocument({
        data: new Uint8Array(bytes),
      });

      const pdf = await loadingTask.promise;

      setTotalPages(pdf.numPages);

      setOutputName(
        file.name.replace(/\.pdf$/i, "") + "-PNG"
      );

      const previewCount = Math.min(
        pdf.numPages,
        PREVIEW_LIMIT
      );

      for (
        let pageNumber = 1;
        pageNumber <= previewCount;
        pageNumber++
      ) {
        const page = await pdf.getPage(pageNumber);

        try {
          const viewport = page.getViewport({
            scale: 0.5,
          });

          const canvas = document.createElement("canvas");

          canvas.width = Math.ceil(viewport.width);
          canvas.height = Math.ceil(viewport.height);

          const context = canvas.getContext("2d");

          if (!context) {
            throw new Error(
              "Your browser cannot create image previews."
            );
          }

          context.fillStyle = "#ffffff";
          context.fillRect(
            0,
            0,
            canvas.width,
            canvas.height
          );

          await page.render({
            canvasContext: context,
            canvas,
            viewport,
            background: "#ffffff",
          }).promise;

          const blob = await canvasToPng(canvas);

          generatedPreviews.push({
            pageNumber,
            url: URL.createObjectURL(blob),
          });

          canvas.width = 0;
          canvas.height = 0;
        } finally {
          page.cleanup();
        }
      }

      previewsRef.current = generatedPreviews;
      setPreviews(generatedPreviews);
      setSelectedFile(file);
    } catch (err) {
      console.error(err);

      generatedPreviews.forEach((preview) => {
        URL.revokeObjectURL(preview.url);
      });

      setError(
        err.name === "PasswordException"
          ? "This PDF is password protected. Unlock it first using FileToolkit's Unlock PDF tool."
          : err.message || "Unable to open this PDF."
      );
    } finally {
      if (loadingTask) {
        await loadingTask.destroy();
      }

      setIsLoading(false);
    }
  };

  const convertPdfToPng = async () => {
    if (!selectedFile || isLoading || isConverting) {
      return;
    }

    setError("");
    setSuccess("");
    setProgress(0);

    let selectedPages;

    try {
      selectedPages =
        pageMode === "all"
          ? Array.from(
              { length: totalPages },
              (_, index) => index + 1
            )
          : parsePageRange(pageRange, totalPages);
    } catch (err) {
      setError(err.message);
      return;
    }

    const safeName =
      outputName
        .trim()
        .replace(/\.(png|zip)$/i, "")
        .replace(/[<>:"/\\|?*\u0000-\u001F]/g, "") ||
      "FileToolkit-Converted";

    setIsConverting(true);

    let loadingTask;

    try {
      const bytes = await selectedFile.arrayBuffer();

      loadingTask = pdfjsLib.getDocument({
        data: new Uint8Array(bytes),
      });

      const pdf = await loadingTask.promise;
      const zip = new JSZip();

      let singleImage = null;
      let singleFilename = "";

      for (
        let index = 0;
        index < selectedPages.length;
        index++
      ) {
        const pageNumber = selectedPages[index];
        const page = await pdf.getPage(pageNumber);

        try {
          const viewport = page.getViewport({
            scale: Number(resolution),
          });

          const width = Math.ceil(viewport.width);
          const height = Math.ceil(viewport.height);

          if (width * height > MAX_CANVAS_PIXELS) {
            throw new Error(
              `Page ${pageNumber} is too large at the selected resolution. Try a lower resolution.`
            );
          }

          const canvas = document.createElement("canvas");

          canvas.width = width;
          canvas.height = height;

          const context = canvas.getContext("2d");

          if (!context) {
            throw new Error(
              "Your browser cannot create the PNG image."
            );
          }

          context.fillStyle = "#ffffff";
          context.fillRect(0, 0, width, height);

          await page.render({
            canvasContext: context,
            canvas,
            viewport,
            background: "#ffffff",
          }).promise;

          const pngBlob = await canvasToPng(canvas);

          const filename =
            `${safeName}-page-${pageNumber}.png`;

          if (selectedPages.length === 1) {
            singleImage = pngBlob;
            singleFilename = filename;
          } else {
            zip.file(filename, pngBlob);
          }

          canvas.width = 0;
          canvas.height = 0;
        } finally {
          page.cleanup();
        }

        setProgress(
          Math.round(
            ((index + 1) / selectedPages.length) * 100
          )
        );
      }

      if (singleImage) {
        downloadBlob(singleImage, singleFilename);

        setSuccess(
          "PNG image downloaded successfully!"
        );
      } else {
        const zipBlob = await zip.generateAsync({
          type: "blob",
          compression: "STORE",
        });

        downloadBlob(
          zipBlob,
          `${safeName}.zip`
        );

        setSuccess(
          `${selectedPages.length} PNG images downloaded as a ZIP file!`
        );
      }
    } catch (err) {
      console.error(err);

      setError(
        err.message ||
          "Unable to convert this PDF to PNG."
      );
    } finally {
      if (loadingTask) {
        await loadingTask.destroy();
      }

      setIsConverting(false);
    }
  };

  return (
    <main className="converter-page">
      <button
        className="back-button"
        type="button"
        onClick={onBack}
        disabled={isLoading || isConverting}
      >
        <ArrowLeft size={17} />
        Back to All Tools
      </button>

      <div className="converter-header">
        <h1>PDF to PNG</h1>

        <p>
          Convert PDF pages into high-quality PNG images.
        </p>
      </div>

      <div
        className="upload-area"
        onDragOver={(event) => {
          event.preventDefault();
        }}
        onDrop={(event) => {
          event.preventDefault();

          handleFile(event.dataTransfer.files[0]);
        }}
      >
        <Upload size={42} />

        <h3>Select PDF Document</h3>

        <p>
          Drag and drop a PDF or select a file.
        </p>

        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,application/pdf"
          hidden
          disabled={isLoading || isConverting}
          onChange={(event) => {
            handleFile(event.target.files[0]);
          }}
        />

        <button
          className="upload-button"
          type="button"
          disabled={isLoading || isConverting}
          onClick={() => {
            fileInputRef.current?.click();
          }}
        >
          {isLoading
            ? "Loading PDF..."
            : "Select PDF"}
        </button>
      </div>

      {error && (
        <div className="converter-error">
          {error}
        </div>
      )}

      {selectedFile && (
        <>
          <div className="selected-images">
            <div className="selected-header">
              <h3>Selected PDF</h3>

              <button
                className="remove-image"
                type="button"
                onClick={removeFile}
                disabled={isLoading || isConverting}
              >
                <Trash2 size={16} />
                Remove PDF
              </button>
            </div>

            <div className="pdf-settings">
              <div
                style={{
                  textAlign: "center",
                }}
              >
                <FileImage
                  size={42}
                  color="#5b55f7"
                />

                <h3>
                  {selectedFile.name}
                </h3>

                <p>
                  File Size:{" "}
                  {formatSize(selectedFile.size)}
                </p>

                <p>
                  Total Pages: {totalPages}
                </p>
              </div>
            </div>
          </div>

          {previews.length > 0 && (
            <div className="pdf-settings">
              <h3>Page Preview</h3>

              <p>
                {totalPages > PREVIEW_LIMIT
                  ? `Showing the first ${PREVIEW_LIMIT} of ${totalPages} pages. All pages remain available for conversion.`
                  : `Showing all ${totalPages} pages.`}
              </p>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns:
                    "repeat(auto-fit, minmax(140px, 1fr))",
                  gap: "16px",
                  marginTop: "20px",
                }}
              >
                {previews.map((preview) => (
                  <div
                    key={preview.pageNumber}
                    style={{
                      textAlign: "center",
                      border: "1px solid #e2e8f0",
                      padding: "10px",
                      borderRadius: "8px",
                    }}
                  >
                    <img
                      src={preview.url}
                      alt={`PDF page ${preview.pageNumber}`}
                      style={{
                        width: "100%",
                        maxHeight: "180px",
                        objectFit: "contain",
                      }}
                    />

                    <p>
                      Page {preview.pageNumber}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="pdf-settings">
            <h3>Conversion Settings</h3>

            <div className="setting-field">
              <label htmlFor="png-page-mode">
                Pages to Convert
              </label>

              <select
                id="png-page-mode"
                value={pageMode}
                disabled={isConverting}
                onChange={(event) => {
                  setPageMode(event.target.value);
                }}
              >
                <option value="all">
                  All Pages
                </option>

                <option value="custom">
                  Selected Pages
                </option>
              </select>
            </div>

            {pageMode === "custom" && (
              <div className="setting-field">
                <label htmlFor="png-page-range">
                  Page Numbers
                </label>

                <input
                  id="png-page-range"
                  type="text"
                  placeholder="Example: 1,3,5-8"
                  value={pageRange}
                  disabled={isConverting}
                  onChange={(event) => {
                    setPageRange(event.target.value);
                  }}
                />

                <p>
                  Enter individual pages or ranges
                  separated by commas.
                </p>
              </div>
            )}

            <div className="setting-field">
              <label htmlFor="png-resolution">
                Image Resolution
              </label>

              <select
                id="png-resolution"
                value={resolution}
                disabled={isConverting}
                onChange={(event) => {
                  setResolution(event.target.value);
                }}
              >
                <option value="1">
                  Standard (1×)
                </option>

                <option value="1.5">
                  High (1.5×)
                </option>

                <option value="2">
                  Very High (2×)
                </option>

                <option value="3">
                  Maximum (3×)
                </option>
              </select>
            </div>

            <div className="setting-field">
              <label htmlFor="png-output-name">
                Output Filename
              </label>

              <input
                id="png-output-name"
                type="text"
                value={outputName}
                disabled={isConverting}
                onChange={(event) => {
                  setOutputName(event.target.value);
                }}
              />
            </div>

            <p
              style={{
                color: "#64748b",
                marginTop: "15px",
              }}
            >
              PNG is a lossless image format. A single
              selected page downloads as PNG. Multiple
              pages download together as a ZIP file.
            </p>
          </div>

          <button
            className="convert-button"
            type="button"
            disabled={isConverting}
            onClick={convertPdfToPng}
          >
            <Download size={18} />

            {isConverting
              ? `Converting... ${progress}%`
              : "Convert to PNG"}
          </button>

          {success && (
            <div className="converter-success">
              <CheckCircle2 size={20} />
              {success}
            </div>
          )}
        </>
      )}

      <p className="converter-privacy">
        Your PDF is processed directly in your browser
        and is not uploaded to our servers.
      </p>
    </main>
  );
}