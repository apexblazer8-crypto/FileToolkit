import { useRef, useState } from "react";

import {
  ArrowLeft,
  Upload,
  FileText,
  Download,
  Trash2,
  CheckCircle2,
} from "lucide-react";

import * as pdfjsLib from "pdfjs-dist";
import pdfWorker from "pdfjs-dist/build/pdf.worker.min.mjs?url";

import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  AlignmentType,
} from "docx";

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;

// ==========================================
// FILE HELPERS
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
// TEXT HELPERS
// ==========================================

const SECTION_HEADINGS = new Set([
  "SUMMARY",
  "PROFILE",
  "PROFESSIONAL SUMMARY",
  "OBJECTIVE",
  "CAREER OBJECTIVE",
  "SKILLS",
  "TECHNICAL SKILLS",
  "CORE COMPETENCIES",
  "WORK EXPERIENCE",
  "PROFESSIONAL EXPERIENCE",
  "EXPERIENCE",
  "EMPLOYMENT HISTORY",
  "PROJECTS",
  "KEY PROJECTS",
  "CERTIFICATIONS",
  "CERTIFICATES",
  "EDUCATION",
  "ACHIEVEMENTS",
  "AWARDS",
  "LANGUAGES",
  "INTERESTS",
  "REFERENCES",
]);

function cleanText(text) {
  return text
    .replace(/\u0000/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function isHeading(text) {
  const normalized = cleanText(text)
    .replace(/:$/, "")
    .toUpperCase();

  return SECTION_HEADINGS.has(normalized);
}

function isBullet(text) {
  return /^[•●▪◦‣⁃\-–]\s*/.test(text);
}

function removeBullet(text) {
  return text.replace(/^[•●▪◦‣⁃\-–]\s*/, "").trim();
}

function isLikelyName(text, lineIndex, pageNumber) {
  if (pageNumber !== 1 || lineIndex !== 0) {
    return false;
  }

  const normalized = cleanText(text);

  if (normalized.length < 3 || normalized.length > 60) {
    return false;
  }

  if (normalized.includes("@") || /\d/.test(normalized)) {
    return false;
  }

  return (
    normalized === normalized.toUpperCase() &&
    /^[A-Z][A-Z\s.'-]+$/.test(normalized)
  );
}

function isContactLine(text) {
  return (
    text.includes("@") ||
    /linkedin\.com/i.test(text) ||
    /github\.com/i.test(text)
  );
}

function isExperienceOrProjectTitle(text) {
  const value = cleanText(text);

  if (value.length > 180) {
    return false;
  }

  return (
    /\b(19|20)\d{2}\b/.test(value) ||
    /\bPresent\b/i.test(value) ||
    (
      value.includes("|") &&
      !isContactLine(value)
    )
  );
}

// ==========================================
// PDF TEXT EXTRACTION
// ==========================================

function extractPageLines(textContent) {
  const positionedItems = [];

  for (const item of textContent.items) {
    if (typeof item.str !== "string") {
      continue;
    }

    const text = cleanText(item.str);

    if (!text) {
      continue;
    }

    positionedItems.push({
      text,
      x: item.transform?.[4] ?? 0,
      y: item.transform?.[5] ?? 0,
      width: item.width ?? 0,
    });
  }

  // PDF text is not always returned in visual reading order.
  // Sort by vertical position, then horizontal position.

  positionedItems.sort((a, b) => {
    const verticalDifference = b.y - a.y;

    if (Math.abs(verticalDifference) > 3) {
      return verticalDifference;
    }

    return a.x - b.x;
  });

  const groupedLines = [];

  for (const item of positionedItems) {
    let matchingLine = null;

    for (const line of groupedLines) {
      if (Math.abs(line.y - item.y) <= 3) {
        matchingLine = line;
        break;
      }
    }

    if (matchingLine) {
      matchingLine.items.push(item);
    } else {
      groupedLines.push({
        y: item.y,
        items: [item],
      });
    }
  }

  return groupedLines
    .sort((a, b) => b.y - a.y)
    .map((line) => {
      const items = line.items.sort(
        (a, b) => a.x - b.x
      );

      let text = "";
      let previousItem = null;

      for (const item of items) {
        if (!previousItem) {
          text = item.text;
          previousItem = item;
          continue;
        }

        const previousEnd =
          previousItem.x + previousItem.width;

        const gap = item.x - previousEnd;

        const previousText = previousItem.text;

        const noSpaceBefore =
          /^[,.;:!?%)\]}]/.test(item.text);

        const noSpaceAfter =
          /[(\[{/]$/.test(previousText);

        const needsSpace =
          gap > 1 &&
          !noSpaceBefore &&
          !noSpaceAfter &&
          !text.endsWith(" ");

        text += needsSpace ? ` ${item.text}` : item.text;

        previousItem = item;
      }

      return {
        text: cleanText(text),
        y: line.y,
      };
    })
    .filter((line) => line.text);
}

// ==========================================
// PARAGRAPH RECONSTRUCTION
// ==========================================

function joinWrappedLines(first, second) {
  const left = first.trim();
  const right = second.trim();

  if (!left) return right;
  if (!right) return left;

  // Rejoin words broken across PDF lines.

  if (
    left.endsWith("-") &&
    /^[a-z]/.test(right)
  ) {
    return left.slice(0, -1) + right;
  }

  return `${left} ${right}`;
}

function buildWordBlocks(lines, pageNumber) {
  const blocks = [];

  let currentParagraph = "";

  const flushParagraph = () => {
    if (!currentParagraph.trim()) {
      return;
    }

    blocks.push({
      type: "paragraph",
      text: cleanText(currentParagraph),
    });

    currentParagraph = "";
  };

  for (let index = 0; index < lines.length; index++) {
    const line = lines[index];

    const text = cleanText(line.text);

    if (!text) {
      continue;
    }

    const previousLine =
      index > 0 ? lines[index - 1] : null;

    const verticalGap = previousLine
      ? previousLine.y - line.y
      : 0;

    // SECTION HEADING

    if (isHeading(text)) {
      flushParagraph();

      blocks.push({
        type: "heading",
        text,
      });

      continue;
    }

    // NAME AT TOP OF FIRST PAGE

    if (isLikelyName(text, index, pageNumber)) {
      flushParagraph();

      blocks.push({
        type: "name",
        text,
      });

      continue;
    }

    // CONTACT DETAILS

    if (
      pageNumber === 1 &&
      index <= 2 &&
      isContactLine(text)
    ) {
      flushParagraph();

      blocks.push({
        type: "contact",
        text,
      });

      continue;
    }

    // BULLET POINT

    if (isBullet(text)) {
      flushParagraph();

      currentParagraph = removeBullet(text);

      blocks.push({
        type: "bullet-start",
        text: currentParagraph,
      });

      currentParagraph = "";

      continue;
    }

    // CONTINUATION OF PREVIOUS BULLET

    if (
      blocks.length > 0 &&
      blocks[blocks.length - 1].type === "bullet-start" &&
      verticalGap < 20 &&
      !isExperienceOrProjectTitle(text)
    ) {
      const previousBlock =
        blocks[blocks.length - 1];

      previousBlock.text = joinWrappedLines(
        previousBlock.text,
        text
      );

      continue;
    }

    // EXPERIENCE OR PROJECT TITLE

    if (isExperienceOrProjectTitle(text)) {
      flushParagraph();

      blocks.push({
        type: "subheading",
        text,
      });

      continue;
    }

    // LARGE VERTICAL GAP INDICATES A NEW PARAGRAPH

    if (
      currentParagraph &&
      verticalGap > 20
    ) {
      flushParagraph();
    }

    // NORMAL WRAPPED TEXT

    currentParagraph = joinWrappedLines(
      currentParagraph,
      text
    );
  }

  flushParagraph();

  return blocks;
}

// ==========================================
// WORD DOCUMENT FORMATTING
// ==========================================

function createWordParagraph(block) {
  const text = block.text;

  switch (block.type) {
    case "name":
      return new Paragraph({
        alignment: AlignmentType.CENTER,

        children: [
          new TextRun({
            text,
            bold: true,
            size: 30,
          }),
        ],

        spacing: {
          after: 80,
        },
      });

    case "contact":
      return new Paragraph({
        alignment: AlignmentType.CENTER,

        children: [
          new TextRun({
            text,
            size: 18,
          }),
        ],

        spacing: {
          after: 140,
        },
      });

    case "heading":
      return new Paragraph({
        keepNext: true,

        children: [
          new TextRun({
            text,
            bold: true,
            size: 22,
          }),
        ],

        spacing: {
          before: 180,
          after: 65,
        },
      });

    case "subheading":
      return new Paragraph({
        keepNext: true,

        children: [
          new TextRun({
            text,
            bold: true,
            size: 19,
          }),
        ],

        spacing: {
          before: 90,
          after: 40,
        },
      });

    case "bullet-start":
      return new Paragraph({
        bullet: {
          level: 0,
        },

        children: [
          new TextRun({
            text,
            size: 19,
          }),
        ],

        spacing: {
          after: 45,
          line: 245,
        },
      });

    default:
      return new Paragraph({
        children: [
          new TextRun({
            text,
            size: 19,
          }),
        ],

        spacing: {
          after: 65,
          line: 245,
        },
      });
  }
}

// ==========================================
// MAIN COMPONENT
// ==========================================

export default function PdfToWord({ onBack }) {
  const fileInputRef = useRef(null);

  const [selectedFile, setSelectedFile] =
    useState(null);

  const [totalPages, setTotalPages] =
    useState(0);

  const [outputName, setOutputName] =
    useState("");

  const [isConverting, setIsConverting] =
    useState(false);

  const [progress, setProgress] =
    useState(0);

  const [error, setError] =
    useState("");

  const [success, setSuccess] =
    useState(false);

  // ==========================================
  // UPLOAD PDF
  // ==========================================

  const handleFile = async (file) => {
    if (!file || isConverting) return;

    setError("");
    setSuccess(false);
    setSelectedFile(null);
    setTotalPages(0);
    setProgress(0);

    if (
      file.type !== "application/pdf" &&
      !file.name.toLowerCase().endsWith(".pdf")
    ) {
      setError(
        "Please select a valid PDF document."
      );

      return;
    }

    let loadingTask;

    try {
      const bytes = await file.arrayBuffer();

      loadingTask = pdfjsLib.getDocument({
        data: new Uint8Array(bytes),
      });

      const pdf = await loadingTask.promise;

      setSelectedFile(file);
      setTotalPages(pdf.numPages);

      setOutputName(
        file.name.replace(/\.pdf$/i, "") +
          "-Converted"
      );
    } catch (err) {
      console.error(err);

      setError(
        "Unable to open this PDF. It may be damaged or password protected."
      );
    } finally {
      if (loadingTask) {
        await loadingTask.destroy();
      }
    }
  };

  // ==========================================
  // REMOVE PDF
  // ==========================================

  const removeFile = () => {
    if (isConverting) return;

    setSelectedFile(null);
    setTotalPages(0);
    setOutputName("");
    setError("");
    setSuccess(false);
    setProgress(0);

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  // ==========================================
  // CONVERT PDF TO WORD
  // ==========================================

  const convertPdfToWord = async () => {
    if (!selectedFile || isConverting) {
      return;
    }

    setIsConverting(true);
    setError("");
    setSuccess(false);
    setProgress(0);

    let loadingTask;

    try {
      const bytes =
        await selectedFile.arrayBuffer();

      loadingTask = pdfjsLib.getDocument({
        data: new Uint8Array(bytes),
      });

      const pdf = await loadingTask.promise;

      const paragraphs = [];

      let extractedCharacters = 0;

      for (
        let pageNumber = 1;
        pageNumber <= pdf.numPages;
        pageNumber++
      ) {
        const page =
          await pdf.getPage(pageNumber);

        const textContent =
          await page.getTextContent();

        const lines =
          extractPageLines(textContent);

        const blocks =
          buildWordBlocks(lines, pageNumber);

        for (const block of blocks) {
          extractedCharacters +=
            block.text.length;

          paragraphs.push(
            createWordParagraph(block)
          );
        }

        setProgress(
          Math.round(
            (pageNumber / pdf.numPages) * 90
          )
        );

        page.cleanup();
      }

      if (extractedCharacters === 0) {
        throw new Error(
          "No selectable text was found. This PDF may contain only scanned images. OCR support will be added in a future version."
        );
      }

      // Do not force a page break after every
      // original PDF page. Allow Word to flow
      // content naturally.

      const wordDocument = new Document({
        sections: [
          {
            properties: {
              page: {
                margin: {
                  top: 650,
                  right: 700,
                  bottom: 650,
                  left: 700,
                },
              },
            },

            children: paragraphs,
          },
        ],
      });

      const blob =
        await Packer.toBlob(wordDocument);

      const safeName =
        outputName
          .trim()
          .replace(/\.docx$/i, "")
          .replace(/[<>:"/\\|?*\u0000-\u001F]/g, "") ||
        "FileToolkit-Converted";

      downloadFile(
        blob,
        `${safeName}.docx`
      );

      setProgress(100);
      setSuccess(true);
    } catch (err) {
      console.error(err);

      setError(
        err.message ||
          "Unable to convert this PDF to Word."
      );
    } finally {
      if (loadingTask) {
        await loadingTask.destroy();
      }

      setIsConverting(false);
    }
  };

  // ==========================================
  // USER INTERFACE
  // ==========================================

  return (
    <main className="converter-page">
      <button
        className="back-button"
        type="button"
        onClick={onBack}
      >
        <ArrowLeft size={17} />
        Back to All Tools
      </button>

      <div className="converter-header">
        <h1>PDF to Word</h1>

        <p>
          Convert PDF text into an editable
          Word document.
        </p>
      </div>

      <div
        className="upload-area"
        onDragOver={(event) =>
          event.preventDefault()
        }
        onDrop={(event) => {
          event.preventDefault();

          handleFile(
            event.dataTransfer.files[0]
          );
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
          disabled={isConverting}
          onChange={(event) =>
            handleFile(
              event.target.files[0]
            )
          }
        />

        <button
          className="upload-button"
          type="button"
          disabled={isConverting}
          onClick={() =>
            fileInputRef.current?.click()
          }
        >
          Select PDF
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
                type="button"
                onClick={removeFile}
                disabled={isConverting}
              >
                <Trash2 size={17} />
                Remove PDF
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

                <p>
                  Total Pages:{" "}
                  {totalPages}
                </p>
              </div>
            </div>
          </div>

          <div className="pdf-settings">
            <h3>
              Conversion Settings
            </h3>

            <div className="setting-field">
              <label
                htmlFor="word-output-name"
              >
                Output Filename
              </label>

              <input
                id="word-output-name"
                type="text"
                value={outputName}
                disabled={isConverting}
                onChange={(event) =>
                  setOutputName(
                    event.target.value
                  )
                }
              />
            </div>

            <p
              style={{
                marginTop: 16,
                color: "#9a5b15",
              }}
            >
              This version extracts
              selectable PDF text and
              reconstructs paragraphs,
              headings, and bullet points.
              Scanned PDFs and complex
              layouts may not convert
              accurately.
            </p>
          </div>

          <button
            className="convert-button"
            type="button"
            disabled={isConverting}
            onClick={convertPdfToWord}
          >
            <Download size={18} />

            {isConverting
              ? `Converting... ${progress}%`
              : "Convert to Word"}
          </button>

          {success && (
            <div className="converter-success">
              <CheckCircle2 size={20} />

              Word document downloaded
              successfully!
            </div>
          )}
        </>
      )}

      <p className="converter-privacy">
        Your PDF is processed directly
        in your browser and is not
        uploaded to our servers.
      </p>
    </main>
  );
}