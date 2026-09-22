import { useRef, useState } from "react";

import {
  ArrowLeft,
  Upload,
  FileText,
  Download,
  Trash2,
  CheckCircle2,
} from "lucide-react";

import mammoth from "mammoth";
import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";

// ==========================================
// FORMAT FILE SIZE
// ==========================================

function formatSize(bytes) {
  if (bytes < 1024) {
    return `${bytes} B`;
  }

  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }

  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

// ==========================================
// DOWNLOAD FILE
// ==========================================

function downloadFile(blob, filename) {
  const url = URL.createObjectURL(blob);

  const link = document.createElement("a");

  link.href = url;
  link.download = filename;

  document.body.appendChild(link);

  link.click();

  link.remove();

  setTimeout(() => {
    URL.revokeObjectURL(url);
  }, 60000);
}

// ==========================================
// WAIT FOR BROWSER RENDERING
// ==========================================

function waitForRender() {
  return new Promise((resolve) => {
    requestAnimationFrame(() => {
      requestAnimationFrame(resolve);
    });
  });
}

// ==========================================
// WAIT FOR IMAGES
// ==========================================

async function waitForImages(element) {
  const images = Array.from(
    element.querySelectorAll("img")
  );

  await Promise.all(
    images.map(async (image) => {
      if (image.complete) {
        return;
      }

      await new Promise((resolve) => {
        image.addEventListener(
          "load",
          resolve,
          { once: true }
        );

        image.addEventListener(
          "error",
          resolve,
          { once: true }
        );
      });
    })
  );
}

// ==========================================
// CHECK WHETHER CANVAS IS BLANK
// ==========================================

function isCanvasBlank(canvas) {
  const context = canvas.getContext("2d", {
    willReadFrequently: true,
  });

  if (!context) {
    return true;
  }

  const { width, height } = canvas;

  const imageData = context.getImageData(
    0,
    0,
    width,
    height
  );

  const pixels = imageData.data;

  // Check every fourth pixel to avoid scanning
  // every pixel of a large document.

  for (let i = 0; i < pixels.length; i += 16) {
    const red = pixels[i];
    const green = pixels[i + 1];
    const blue = pixels[i + 2];

    if (
      red < 245 ||
      green < 245 ||
      blue < 245
    ) {
      return false;
    }
  }

  return true;
}

// ==========================================
// WORD TO PDF COMPONENT
// ==========================================

export default function WordToPdf({ onBack }) {
  const fileInputRef = useRef(null);

  const [selectedFile, setSelectedFile] =
    useState(null);

  const [htmlContent, setHtmlContent] =
    useState("");

  const [outputName, setOutputName] =
    useState("");

  const [isConverting, setIsConverting] =
    useState(false);

  const [error, setError] = useState("");

  const [success, setSuccess] =
    useState(false);

  // ========================================
  // HANDLE WORD FILE
  // ========================================

  const handleFile = async (file) => {
    if (!file || isConverting) {
      return;
    }

    setError("");
    setSuccess(false);

    setSelectedFile(null);
    setHtmlContent("");
    setOutputName("");

    if (
      !file.name.toLowerCase().endsWith(".docx")
    ) {
      setError(
        "Please select a valid .docx Word document."
      );

      return;
    }

    try {
      const arrayBuffer =
        await file.arrayBuffer();

      const result =
        await mammoth.convertToHtml({
          arrayBuffer,
        });

      if (!result.value.trim()) {
        throw new Error(
          "No readable content was found in this Word document."
        );
      }

      setSelectedFile(file);

      setHtmlContent(result.value);

      setOutputName(
        file.name.replace(/\.docx$/i, "") +
          "-Converted"
      );
    } catch (err) {
      console.error(err);

      setError(
        err.message ||
          "Unable to read this Word document."
      );
    }
  };

  // ========================================
  // REMOVE WORD FILE
  // ========================================

  const removeFile = () => {
    if (isConverting) {
      return;
    }

    setSelectedFile(null);
    setHtmlContent("");
    setOutputName("");

    setError("");
    setSuccess(false);

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  // ========================================
  // CONVERT WORD TO PDF
  // ========================================

  const convertWordToPdf = async () => {
    if (
      !selectedFile ||
      isConverting
    ) {
      return;
    }

    setIsConverting(true);

    setError("");
    setSuccess(false);

    let printableElement = null;

    try {
      // ====================================
      // VALIDATE WORD CONTENT
      // ====================================

      if (!htmlContent.trim()) {
        throw new Error(
          "No readable content was found in this Word document."
        );
      }

      // ====================================
      // PREPARE FILENAME
      // ====================================

      const safeName =
        outputName
          .trim()
          .replace(/\.pdf$/i, "")
          .replace(/[\\/:*?"<>|]/g, "-") ||
        "FileToolkit-Converted";

      // ====================================
      // CREATE RENDERABLE DOCUMENT
      // ====================================

      printableElement =
        document.createElement("div");

      printableElement.className =
        "word-to-pdf-printable";

      printableElement.innerHTML =
        htmlContent;

      // A4 width at approximately 96 DPI.

      const documentWidth = 794;

      const pageHeight = 1123;

      printableElement.style.width =
        `${documentWidth}px`;

      printableElement.style.padding =
        "48px";

      printableElement.style.boxSizing =
        "border-box";

      printableElement.style.backgroundColor =
        "#ffffff";

      printableElement.style.color =
        "#111827";

      printableElement.style.fontFamily =
        "Arial, sans-serif";

      printableElement.style.fontSize =
        "14px";

      printableElement.style.lineHeight =
        "1.45";

      // IMPORTANT:
      // Do not move this document offscreen.
      // Do not use z-index: -1.
      //
      // Keep it in the renderable viewport
      // while html2canvas captures it.

      printableElement.style.position =
        "absolute";

      printableElement.style.left = "0";

      printableElement.style.top = "0";

      printableElement.style.zIndex =
        "99999";

      printableElement.style.pointerEvents =
        "none";

      // ====================================
      // DOCUMENT STYLING
      // ====================================

      const styleElement =
        document.createElement("style");

      styleElement.textContent = `
        .word-to-pdf-printable h1 {
          font-size: 26px;
          margin: 0 0 12px;
        }

        .word-to-pdf-printable h2 {
          font-size: 21px;
          margin: 16px 0 8px;
        }

        .word-to-pdf-printable h3 {
          font-size: 17px;
          margin: 14px 0 6px;
        }

        .word-to-pdf-printable p {
          margin: 0 0 8px;
        }

        .word-to-pdf-printable ul,
        .word-to-pdf-printable ol {
          padding-left: 25px;
          margin: 6px 0 10px;
        }

        .word-to-pdf-printable li {
          margin-bottom: 4px;
        }

        .word-to-pdf-printable table {
          width: 100%;
          border-collapse: collapse;
        }

        .word-to-pdf-printable td,
        .word-to-pdf-printable th {
          border: 1px solid #d1d5db;
          padding: 6px;
        }

        .word-to-pdf-printable img {
          max-width: 100%;
          height: auto;
        }
      `;

      printableElement.prepend(
        styleElement
      );

      document.body.appendChild(
        printableElement
      );

      // ====================================
      // WAIT FOR CONTENT TO RENDER
      // ====================================

      await waitForImages(
        printableElement
      );

      await waitForRender();

      // ====================================
      // CHECK DOCUMENT DIMENSIONS
      // ====================================

      const contentHeight = Math.ceil(
        printableElement.scrollHeight
      );

      if (contentHeight <= 0) {
        throw new Error(
          "Unable to render the Word document."
        );
      }

      // ====================================
      // CAPTURE WORD CONTENT
      // ====================================

      const scale = 2;

      const canvas =
        await html2canvas(
          printableElement,
          {
            scale,

            backgroundColor:
              "#ffffff",

            useCORS: true,

            scrollX: 0,

            scrollY: 0,

            windowWidth:
              Math.max(
                document.documentElement
                  .clientWidth,
                documentWidth
              ),

            logging: false,
          }
        );

      // ====================================
      // VERIFY CAPTURED CONTENT
      // ====================================

      if (
        canvas.width === 0 ||
        canvas.height === 0
      ) {
        throw new Error(
          "PDF conversion failed because the document could not be captured."
        );
      }

      if (isCanvasBlank(canvas)) {
        throw new Error(
          "The document rendered as a blank page. PDF download was cancelled."
        );
      }

      // ====================================
      // CREATE PDF
      // ====================================

      const pdf = new jsPDF({
        orientation: "portrait",

        unit: "px",

        format: [
          documentWidth,
          pageHeight,
        ],

        hotfixes: [
          "px_scaling",
        ],

        compress: true,
      });

      // ====================================
      // SPLIT CAPTURE INTO PDF PAGES
      // ====================================

      const pageHeightPixels =
        pageHeight * scale;

      const totalPages =
        Math.ceil(
          canvas.height /
            pageHeightPixels
        );

      for (
        let pageIndex = 0;
        pageIndex < totalPages;
        pageIndex++
      ) {
        if (pageIndex > 0) {
          pdf.addPage(
            [
              documentWidth,
              pageHeight,
            ],
            "portrait"
          );
        }

        const sourceY =
          pageIndex *
          pageHeightPixels;

        const remainingHeight =
          canvas.height - sourceY;

        const sliceHeight =
          Math.min(
            pageHeightPixels,
            remainingHeight
          );

        const pageCanvas =
          document.createElement(
            "canvas"
          );

        pageCanvas.width =
          canvas.width;

        pageCanvas.height =
          pageHeightPixels;

        const pageContext =
          pageCanvas.getContext(
            "2d"
          );

        if (!pageContext) {
          throw new Error(
            "Unable to create a PDF page."
          );
        }

        // White background for each page.

        pageContext.fillStyle =
          "#ffffff";

        pageContext.fillRect(
          0,
          0,
          pageCanvas.width,
          pageCanvas.height
        );

        // Copy the appropriate part
        // of the Word document.

        pageContext.drawImage(
          canvas,

          0,
          sourceY,

          canvas.width,
          sliceHeight,

          0,
          0,

          canvas.width,
          sliceHeight
        );

        const pageImage =
          pageCanvas.toDataURL(
            "image/jpeg",
            0.95
          );

        pdf.addImage(
          pageImage,

          "JPEG",

          0,
          0,

          documentWidth,
          pageHeight
        );
      }

      // ====================================
      // GENERATE PDF BLOB
      // ====================================

      const pdfBlob =
        pdf.output("blob");

      if (
        !pdfBlob ||
        pdfBlob.size < 1000
      ) {
        throw new Error(
          "PDF generation failed."
        );
      }

      // ====================================
      // DOWNLOAD PDF
      // ====================================

      downloadFile(
        pdfBlob,
        `${safeName}.pdf`
      );

      setSuccess(true);
    } catch (err) {
      console.error(err);

      setError(
        err.message ||
          "Unable to convert this Word document to PDF."
      );
    } finally {
      if (printableElement) {
        printableElement.remove();
      }

      setIsConverting(false);
    }
  };

  // ========================================
  // COMPONENT UI
  // ========================================

  return (
    <main className="converter-page">

      {/* BACK BUTTON */}

      <button
        className="back-button"
        type="button"
        onClick={onBack}
      >
        <ArrowLeft size={17} />

        Back to All Tools
      </button>

      {/* PAGE HEADER */}

      <div className="converter-header">
        <h1>Word to PDF</h1>

        <p>
          Convert Word documents into PDF files
          directly in your browser.
        </p>
      </div>

      {/* UPLOAD AREA */}

      <div
        className="upload-area"
        onDragOver={(event) => {
          event.preventDefault();
        }}
        onDrop={(event) => {
          event.preventDefault();

          handleFile(
            event.dataTransfer.files[0]
          );
        }}
      >
        <Upload size={42} />

        <h3>Select Word Document</h3>

        <p>
          Drag and drop a DOCX file
          or select one.
        </p>

        <input
          ref={fileInputRef}
          type="file"
          accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
          hidden
          onChange={(event) => {
            handleFile(
              event.target.files[0]
            );
          }}
        />

        <button
          className="upload-button"
          type="button"
          disabled={isConverting}
          onClick={() => {
            fileInputRef.current?.click();
          }}
        >
          Select Word
        </button>
      </div>

      {/* ERROR MESSAGE */}

      {error && (
        <div className="converter-error">
          {error}
        </div>
      )}

      {/* SELECTED WORD DOCUMENT */}

      {selectedFile && (
        <>

          <div className="selected-images">

            <div className="selected-header">

              <h3>
                Selected Word Document
              </h3>

              <button
                type="button"
                onClick={removeFile}
                disabled={isConverting}
              >
                <Trash2 size={17} />

                Remove Word
              </button>

            </div>

            <div className="pdf-settings">

              <div
                style={{
                  textAlign: "center",
                }}
              >
                <FileText
                  size={42}
                  color="#5b55f7"
                />

                <h3>
                  {selectedFile.name}
                </h3>

                <p>
                  File Size:{" "}
                  {formatSize(
                    selectedFile.size
                  )}
                </p>
              </div>

            </div>

          </div>

          {/* CONVERSION SETTINGS */}

          <div className="pdf-settings">

            <h3>
              Conversion Settings
            </h3>

            <div className="setting-field">

              <label htmlFor="pdf-output-name">
                Output Filename
              </label>

              <input
                id="pdf-output-name"
                type="text"
                value={outputName}
                disabled={isConverting}
                onChange={(event) => {
                  setOutputName(
                    event.target.value
                  );
                }}
              />

            </div>

            <p
              style={{
                marginTop: 16,
                color: "#9a5b15",
              }}
            >
              This version converts DOCX
              content into PDF. Complex Word
              layouts, fonts, headers, footers,
              and page breaks may differ
              from the original.
            </p>

          </div>

          {/* CONVERT BUTTON */}

          <button
            className="convert-button"
            type="button"
            disabled={isConverting}
            onClick={convertWordToPdf}
          >
            <Download size={18} />

            {isConverting
              ? "Converting..."
              : "Convert to PDF"}
          </button>

          {/* SUCCESS MESSAGE */}

          {success && (
            <div className="converter-success">
              <CheckCircle2 size={20} />

              PDF downloaded successfully!
            </div>
          )}

        </>
      )}

      {/* PRIVACY MESSAGE */}

      <p className="converter-privacy">
        Your Word document is processed
        directly in your browser and is
        not uploaded to our servers.
      </p>

    </main>
  );
}