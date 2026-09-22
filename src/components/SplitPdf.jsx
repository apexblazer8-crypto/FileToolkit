import { useEffect, useRef, useState } from "react";
import { PDFDocument } from "pdf-lib";
import JSZip from "jszip";

import {
  Upload,
  Download,
  Trash2,
  ArrowLeft,
  Scissors,
  CheckCircle,
  FileText,
} from "lucide-react";

function SplitPdf({ onBack }) {
  const [pdfFile, setPdfFile] = useState(null);
  const [pageCount, setPageCount] = useState(0);

  const [splitMode, setSplitMode] = useState("selected");
  const [selectedPages, setSelectedPages] = useState("");
  const [rangeStart, setRangeStart] = useState("");
  const [rangeEnd, setRangeEnd] = useState("");

  const [filename, setFilename] = useState(
    "FileToolkit-Split"
  );

  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const [dragging, setDragging] = useState(false);

  const previewRef = useRef(null);

  // =====================================
  // CLEANUP
  // =====================================

  useEffect(() => {
    return () => {
      if (previewRef.current) {
        URL.revokeObjectURL(previewRef.current);
      }
    };
  }, []);

  // =====================================
  // FORMAT FILE SIZE
  // =====================================

  const formatSize = (bytes) => {
    if (bytes < 1024) {
      return `${bytes} B`;
    }

    if (bytes < 1024 * 1024) {
      return `${(bytes / 1024).toFixed(1)} KB`;
    }

    return `${(
      bytes / (1024 * 1024)
    ).toFixed(2)} MB`;
  };

  // =====================================
  // UPLOAD PDF
  // =====================================

  const addPdf = async (file) => {
    if (!file) return;

    setError("");
    setSuccess(false);

    if (
      file.type !== "application/pdf" &&
      !/\.pdf$/i.test(file.name)
    ) {
      setError("Please select a valid PDF file.");
      return;
    }

    try {
      const bytes = await file.arrayBuffer();

      const pdf = await PDFDocument.load(bytes);

      const totalPages = pdf.getPageCount();

      if (totalPages === 0) {
        throw new Error("PDF contains no pages.");
      }

      if (previewRef.current) {
        URL.revokeObjectURL(previewRef.current);
      }

      const preview = URL.createObjectURL(file);

      previewRef.current = preview;

      setPdfFile({
        file,
        name: file.name,
        size: file.size,
        preview,
      });

      setPageCount(totalPages);

      setSelectedPages("");
      setRangeStart("");
      setRangeEnd("");

      setProgress(0);
    } catch (uploadError) {
      console.error(uploadError);

      setError(
        "Unable to read this PDF. Password-protected or damaged files may not be supported."
      );
    }
  };

  // =====================================
  // FILE INPUT
  // =====================================

  const handleUpload = async (event) => {
    await addPdf(event.target.files[0]);

    event.target.value = "";
  };

  // =====================================
  // DRAG AND DROP
  // =====================================

  const handleDrop = async (event) => {
    event.preventDefault();

    setDragging(false);

    await addPdf(event.dataTransfer.files[0]);
  };

  // =====================================
  // REMOVE PDF
  // =====================================

  const removePdf = () => {
    if (previewRef.current) {
      URL.revokeObjectURL(previewRef.current);
      previewRef.current = null;
    }

    setPdfFile(null);
    setPageCount(0);

    setSelectedPages("");
    setRangeStart("");
    setRangeEnd("");

    setError("");
    setSuccess(false);
    setProgress(0);
  };

  // =====================================
  // DOWNLOAD FILE
  // =====================================

  const downloadFile = (blob, name) => {
    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");

    link.href = url;
    link.download = name;

    document.body.appendChild(link);

    link.click();
    link.remove();

    setTimeout(() => {
      URL.revokeObjectURL(url);
    }, 60000);
  };

  // =====================================
  // VALIDATE SELECTED PAGES
  // =====================================

  const getSelectedPageIndices = () => {
    const input = selectedPages.trim();

    if (!input) {
      throw new Error(
        "Please enter page numbers, such as 1,3,5."
      );
    }

    const pageNumbers = input.split(",");

    const indices = [];

    for (const value of pageNumbers) {
      const trimmed = value.trim();

      if (!/^\d+$/.test(trimmed)) {
        throw new Error(
          "Enter valid page numbers separated by commas."
        );
      }

      const pageNumber = Number(trimmed);

      if (
        pageNumber < 1 ||
        pageNumber > pageCount
      ) {
        throw new Error(
          `Page ${pageNumber} is outside the valid range of 1 to ${pageCount}.`
        );
      }

      const index = pageNumber - 1;

      if (!indices.includes(index)) {
        indices.push(index);
      }
    }

    return indices;
  };

  // =====================================
  // VALIDATE PAGE RANGE
  // =====================================

  const getRangePageIndices = () => {
    const start = Number(rangeStart);
    const end = Number(rangeEnd);

    if (
      !/^\d+$/.test(rangeStart.trim()) ||
      !/^\d+$/.test(rangeEnd.trim()) ||
      start < 1 ||
      end > pageCount ||
      start > end
    ) {
      throw new Error(
        `Enter a valid page range between 1 and ${pageCount}.`
      );
    }

    return Array.from(
      { length: end - start + 1 },
      (_, index) => start - 1 + index
    );
  };

  // =====================================
  // SPLIT PDF
  // =====================================

  const splitPdf = async () => {
    if (!pdfFile || processing) return;

    setProcessing(true);
    setProgress(0);
    setError("");
    setSuccess(false);

    try {
      const bytes = await pdfFile.file.arrayBuffer();

      const sourcePdf = await PDFDocument.load(bytes);

      const safeFilename =
        filename
          .trim()
          .replace(/[\\/:*?"<>|]/g, "-")
          .replace(/\.pdf$/i, "") ||
        "FileToolkit-Split";

      // =================================
      // SPLIT ALL PAGES INTO ZIP
      // =================================

      if (splitMode === "all") {
        const zip = new JSZip();

        for (
          let index = 0;
          index < pageCount;
          index++
        ) {
          const newPdf = await PDFDocument.create();

          const [page] = await newPdf.copyPages(
            sourcePdf,
            [index]
          );

          newPdf.addPage(page);

          const pdfBytes = await newPdf.save();

          zip.file(
            `${safeFilename}-Page-${index + 1}.pdf`,
            pdfBytes
          );

          setProgress(
            Math.round(
              ((index + 1) / pageCount) * 90
            )
          );
        }

        const zipBlob = await zip.generateAsync(
          {
            type: "blob",
            compression: "DEFLATE",
          },
          (metadata) => {
            setProgress(
              90 + Math.round(
                metadata.percent * 0.1
              )
            );
          }
        );

        downloadFile(
          zipBlob,
          `${safeFilename}.zip`
        );
      } else {
        // =================================
        // EXTRACT SELECTED PAGES
        // =================================

        const pageIndices =
          splitMode === "selected"
            ? getSelectedPageIndices()
            : getRangePageIndices();

        const newPdf = await PDFDocument.create();

        const pages = await newPdf.copyPages(
          sourcePdf,
          pageIndices
        );

        pages.forEach((page) => {
          newPdf.addPage(page);
        });

        setProgress(80);

        const pdfBytes = await newPdf.save();

        const blob = new Blob(
          [pdfBytes],
          {
            type: "application/pdf",
          }
        );

        downloadFile(
          blob,
          `${safeFilename}.pdf`
        );
      }

      setProgress(100);
      setSuccess(true);
    } catch (splitError) {
      console.error(splitError);

      setError(
        splitError.message ||
        "Unable to split PDF."
      );
    } finally {
      setProcessing(false);
    }
  };

  // =====================================
  // USER INTERFACE
  // =====================================

  return (
    <div className="converter-page">

      {/* BACK BUTTON */}

      <button
        className="back-button"
        onClick={onBack}
        type="button"
      >
        <ArrowLeft size={18} />
        Back to All Tools
      </button>

      {/* HEADER */}

      <div className="converter-header">

        <h1>Split PDF</h1>

        <p>
          Extract selected pages or split a PDF
          into separate documents.
        </p>

      </div>

      {/* UPLOAD AREA */}

      <div
        className={`upload-area ${
          dragging ? "upload-dragging" : ""
        }`}
        onDragOver={(event) => {
          event.preventDefault();
          setDragging(true);
        }}
        onDragLeave={(event) => {
          event.preventDefault();
          setDragging(false);
        }}
        onDrop={handleDrop}
      >

        <Upload size={42} />

        <h3>Select PDF Document</h3>

        <p>
          Drag and drop a PDF or select a file.
        </p>

        <label className="upload-button">

          Select PDF

          <input
            type="file"
            accept=".pdf,application/pdf"
            onChange={handleUpload}
            hidden
          />

        </label>

      </div>

      {/* ERROR */}

      {error && (
        <div className="converter-error">
          {error}
        </div>
      )}

      {/* PDF DETAILS */}

      {pdfFile && (
        <div className="selected-images">

          <div className="selected-header">

            <h2>Selected PDF</h2>

            <button
              className="clear-all-button"
              onClick={removePdf}
              disabled={processing}
              type="button"
            >
              <Trash2 size={16} />
              Remove PDF
            </button>

          </div>

          {/* FILE INFORMATION */}

          <div className="split-file-info">

            <div className="merge-file-icon">
              <FileText size={35} />
            </div>

            <h3>{pdfFile.name}</h3>

            <p>
              File Size: {formatSize(pdfFile.size)}
            </p>

            <p>
              Total Pages: {pageCount}
            </p>

            <a
              href={pdfFile.preview}
              target="_blank"
              rel="noopener noreferrer"
              className="split-preview-link"
            >
              Preview PDF
            </a>

          </div>

          {/* SPLIT SETTINGS */}

          <div className="pdf-settings">

            <h2>Split Settings</h2>

            <div className="split-mode-options">

              <label>
                <input
                  type="radio"
                  name="splitMode"
                  value="selected"
                  checked={
                    splitMode === "selected"
                  }
                  onChange={(event) =>
                    setSplitMode(
                      event.target.value
                    )
                  }
                />

                Extract Selected Pages
              </label>

              <label>
                <input
                  type="radio"
                  name="splitMode"
                  value="range"
                  checked={
                    splitMode === "range"
                  }
                  onChange={(event) =>
                    setSplitMode(
                      event.target.value
                    )
                  }
                />

                Extract Page Range
              </label>

              <label>
                <input
                  type="radio"
                  name="splitMode"
                  value="all"
                  checked={
                    splitMode === "all"
                  }
                  onChange={(event) =>
                    setSplitMode(
                      event.target.value
                    )
                  }
                />

                Split All Pages
              </label>

            </div>

            {/* SELECTED PAGES */}

            {splitMode === "selected" && (
              <div className="setting-field">

                <label htmlFor="selected-pages">
                  Page Numbers
                </label>

                <input
                  id="selected-pages"
                  type="text"
                  value={selectedPages}
                  onChange={(event) =>
                    setSelectedPages(
                      event.target.value
                    )
                  }
                  placeholder="Example: 1,3,5"
                />

                <small>
                  Enter page numbers between
                  1 and {pageCount}.
                </small>

              </div>
            )}

            {/* PAGE RANGE */}

            {splitMode === "range" && (
              <div className="settings-grid">

                <div className="setting-field">

                  <label htmlFor="range-start">
                    From Page
                  </label>

                  <input
                    id="range-start"
                    type="number"
                    min="1"
                    max={pageCount}
                    value={rangeStart}
                    onChange={(event) =>
                      setRangeStart(
                        event.target.value
                      )
                    }
                    placeholder="1"
                  />

                </div>

                <div className="setting-field">

                  <label htmlFor="range-end">
                    To Page
                  </label>

                  <input
                    id="range-end"
                    type="number"
                    min="1"
                    max={pageCount}
                    value={rangeEnd}
                    onChange={(event) =>
                      setRangeEnd(
                        event.target.value
                      )
                    }
                    placeholder={String(pageCount)}
                  />

                </div>

              </div>
            )}

            {/* SPLIT ALL */}

            {splitMode === "all" && (
              <p className="split-description">
                Each page will become a separate PDF.
                All files will be downloaded together
                as a ZIP archive.
              </p>
            )}

            {/* OUTPUT FILENAME */}

            <div className="setting-field split-filename">

              <label htmlFor="split-filename">
                Output Filename
              </label>

              <input
                id="split-filename"
                type="text"
                value={filename}
                onChange={(event) =>
                  setFilename(
                    event.target.value
                  )
                }
              />

            </div>

          </div>

          {/* PROGRESS */}

          {processing && (
            <div className="conversion-progress">

              <div
                className="progress-bar"
                style={{
                  width: `${progress}%`,
                }}
              />

              <p>
                Processing... {progress}%
              </p>

            </div>
          )}

          {/* SPLIT BUTTON */}

          <button
            className="convert-button"
            onClick={splitPdf}
            disabled={processing}
            type="button"
          >

            {splitMode === "all"
              ? <Download size={19} />
              : <Scissors size={19} />}

            {processing
              ? "Processing..."
              : splitMode === "all"
                ? "Split & Download ZIP"
                : "Extract Pages"}

          </button>

          {/* SUCCESS */}

          {success && (
            <div className="converter-success">

              <CheckCircle size={20} />

              PDF processed successfully!

            </div>
          )}

        </div>
      )}

      {/* PRIVACY */}

      <div className="converter-privacy">

        <FileText size={18} />

        Your PDF is processed directly
        in your browser and is not uploaded
        to our servers.

      </div>

    </div>
  );
}

export default SplitPdf;