import { useEffect, useRef, useState } from "react";
import { PDFDocument } from "pdf-lib";
import * as pdfjsLib from "pdfjs-dist";
import pdfWorker from "pdfjs-dist/build/pdf.worker.min.mjs?url";

import {
  ArrowLeft,
  Upload,
  FileText,
  Trash2,
  Download,
  CheckCircle,
  Minimize2,
} from "lucide-react";

// Configure PDF.js worker for Vite
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;

const COMPRESSION_OPTIONS = {
  lossless: {
    label: "Lossless Optimization",
    description:
      "Preserve text and page content. File size reduction is not guaranteed.",
  },

  low: {
    label: "Low Compression",
    description:
      "Higher visual quality with moderate image compression.",
    scale: 1.5,
    quality: 0.85,
  },

  medium: {
    label: "Medium Compression",
    description:
      "Balanced visual quality and file size.",
    scale: 1.2,
    quality: 0.65,
  },

  high: {
    label: "High Compression",
    description:
      "Smaller images and lower visual quality.",
    scale: 0.9,
    quality: 0.45,
  },
};

function CompressPdf({ onBack }) {
  const [pdfFile, setPdfFile] = useState(null);

  const [pageCount, setPageCount] = useState(0);

  const [compressionLevel, setCompressionLevel] =
    useState("medium");

  const [filename, setFilename] = useState(
    "FileToolkit-Compressed"
  );

  const [processing, setProcessing] = useState(false);

  const [progress, setProgress] = useState(0);

  const [error, setError] = useState("");

  const [success, setSuccess] = useState(false);

  const [result, setResult] = useState(null);

  const [dragging, setDragging] = useState(false);

  const previewRef = useRef(null);

  const resultRef = useRef(null);

  const busyRef = useRef(false);

  // =====================================
  // CLEANUP
  // =====================================

  useEffect(() => {
    return () => {
      if (previewRef.current) {
        URL.revokeObjectURL(previewRef.current);
      }

      if (resultRef.current) {
        URL.revokeObjectURL(resultRef.current);
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
  // RESET PREVIOUS RESULT
  // =====================================

  const clearResult = () => {
    if (resultRef.current) {
      URL.revokeObjectURL(resultRef.current);

      resultRef.current = null;
    }

    setResult(null);

    setSuccess(false);

    setProgress(0);
  };

  // =====================================
  // UPLOAD PDF
  // =====================================

  const addPdf = async (file) => {
    if (!file || busyRef.current) return;

    setError("");

    if (
      file.type !== "application/pdf" &&
      !/\.pdf$/i.test(file.name)
    ) {
      setError("Please select a valid PDF file.");

      return;
    }

    let loadingTask = null;

    let document = null;

    try {
      const bytes = await file.arrayBuffer();

      loadingTask = pdfjsLib.getDocument({
        data: new Uint8Array(bytes),
      });

      document = await loadingTask.promise;

      const totalPages = document.numPages;

      if (totalPages < 1) {
        throw new Error(
          "This PDF does not contain any pages."
        );
      }

      if (previewRef.current) {
        URL.revokeObjectURL(previewRef.current);
      }

      const previewUrl = URL.createObjectURL(file);

      previewRef.current = previewUrl;

      clearResult();

      setPdfFile({
        file,
        name: file.name,
        size: file.size,
        preview: previewUrl,
      });

      setPageCount(totalPages);

      setFilename(
        `${file.name.replace(/\.pdf$/i, "")}-Compressed`
      );
    } catch (uploadError) {
      console.error(uploadError);

      setError(
        "Unable to open this PDF. It may be password-protected or damaged."
      );
    } finally {
      if (document) {
        await document.destroy();
      } else if (loadingTask) {
        await loadingTask.destroy();
      }
    }
  };

  // =====================================
  // INPUT HANDLER
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
    if (busyRef.current) return;

    if (previewRef.current) {
      URL.revokeObjectURL(previewRef.current);

      previewRef.current = null;
    }

    clearResult();

    setPdfFile(null);

    setPageCount(0);

    setError("");
  };

  // =====================================
  // DOWNLOAD FILE
  // =====================================

  const downloadFile = (url, name) => {
    const link = document.createElement("a");

    link.href = url;

    link.download = name;

    document.body.appendChild(link);

    link.click();

    link.remove();
  };

  // =====================================
  // LOSSLESS OPTIMIZATION
  // =====================================

  const optimizeLossless = async (bytes) => {
    const pdf = await PDFDocument.load(bytes);

    setProgress(45);

    const optimizedBytes = await pdf.save({
      useObjectStreams: true,
      objectsPerTick: 50,
    });

    setProgress(90);

    return optimizedBytes;
  };

  // =====================================
  // IMAGE-BASED COMPRESSION
  // =====================================

  const compressAsImages = async (
    bytes,
    option
  ) => {
    const loadingTask = pdfjsLib.getDocument({
      data: new Uint8Array(bytes),
    });

    let sourcePdf = null;

    try {
      sourcePdf = await loadingTask.promise;

      const outputPdf = await PDFDocument.create();

      for (
        let pageNumber = 1;
        pageNumber <= sourcePdf.numPages;
        pageNumber++
      ) {
        const page = await sourcePdf.getPage(
          pageNumber
        );
        if (!page) {
        throw new Error(
            `Unable to read page ${pageNumber}.`
        );
        }

        const viewport = page.getViewport({
          scale: option.scale,
        });

        const canvas = document.createElement(
          "canvas"
        );

        const context = canvas.getContext(
          "2d",
          { alpha: false }
        );

        if (!context) {
          throw new Error(
            "Unable to initialize PDF rendering."
          );
        }

        canvas.width = Math.ceil(
          viewport.width
        );

        canvas.height = Math.ceil(
          viewport.height
        );

        // White background for PDF transparency
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
          background: "rgb(255,255,255)",
        }).promise;

        const jpegDataUrl =
          canvas.toDataURL(
            "image/jpeg",
            option.quality
          );

        const jpegImage =
          await outputPdf.embedJpg(
            jpegDataUrl
          );

        // Preserve original page dimensions
        const originalViewport =
          page.getViewport({
            scale: 1,
          });

        const outputPage =
          outputPdf.addPage([
            originalViewport.width,
            originalViewport.height,
          ]);

        outputPage.drawImage(
          jpegImage,
          {
            x: 0,
            y: 0,
            width:
              originalViewport.width,
            height:
              originalViewport.height,
          }
        );

        // Release canvas memory
        canvas.width = 0;

        canvas.height = 0;

        page.cleanup();

        setProgress(
          Math.round(
            (pageNumber /
              sourcePdf.numPages) *
              85
          )
        );
      }

      const compressedBytes =
        await outputPdf.save({
          useObjectStreams: true,
        });

      setProgress(95);

      return compressedBytes;
    } finally {
    await loadingTask.destroy();
    }
  };

  // =====================================
  // COMPRESS PDF
  // =====================================

  const compressPdf = async () => {
    if (!pdfFile || busyRef.current) {
      return;
    }

    busyRef.current = true;

    setProcessing(true);

    setProgress(0);

    setError("");

    clearResult();

    try {
      const bytes =
        await pdfFile.file.arrayBuffer();

      const option =
        COMPRESSION_OPTIONS[
          compressionLevel
        ];

      let compressedBytes;

      if (
        compressionLevel === "lossless"
      ) {
        compressedBytes =
          await optimizeLossless(
            bytes
          );
      } else {
        compressedBytes =
          await compressAsImages(
            bytes,
            option
          );
      }

      const blob = new Blob(
        [compressedBytes],
        {
          type: "application/pdf",
        }
      );

      const outputSize = blob.size;

      const originalSize =
        pdfFile.size;

      const savedBytes =
        originalSize - outputSize;

      const savedPercent =
        originalSize > 0
          ? (
              (savedBytes /
                originalSize) *
              100
            ).toFixed(1)
          : "0.0";

      const safeFilename =
        filename
          .trim()
          .replace(
            /[\\/:*?"<>|]/g,
            "-"
          )
          .replace(
            /\.pdf$/i,
            ""
          ) ||
        "FileToolkit-Compressed";

      const outputName =
        `${safeFilename}.pdf`;

      const outputUrl =
        URL.createObjectURL(
          blob
        );

      resultRef.current =
        outputUrl;

      setResult({
        url: outputUrl,
        name: outputName,
        originalSize,
        outputSize,
        savedBytes,
        savedPercent,
        isSmaller:
          outputSize < originalSize,
      });

      setProgress(100);

        setSuccess(true);

        // Automatically download only when compression reduces file size.
        if (outputSize < originalSize) {
        downloadFile(outputUrl, outputName);
        }
    } catch (compressionError) {
      console.error(
        compressionError
      );

      setError(
        compressionError.message ||
          "Unable to compress this PDF."
      );
    } finally {
      busyRef.current = false;

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

        <h1>Compress PDF</h1>

        <p>
          Reduce PDF file size with
          flexible compression options.
        </p>

      </div>

      {/* UPLOAD */}

      <div
        className={`upload-area ${
          dragging
            ? "upload-dragging"
            : ""
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
          Drag and drop a PDF or
          select a file.
        </p>

        <label className="upload-button">

          Select PDF

          <input
            type="file"
            accept=".pdf,application/pdf"
            onChange={handleUpload}
            disabled={processing}
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

      {/* SELECTED PDF */}

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
              Original Size:{" "}
              {formatSize(
                pdfFile.size
              )}
            </p>

            <p>
              Total Pages:{" "}
              {pageCount}
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

          {/* COMPRESSION SETTINGS */}

          <div className="pdf-settings">

            <h2>
              Compression Settings
            </h2>

            <div className="compress-options">

              {Object.entries(
                COMPRESSION_OPTIONS
              ).map(
                ([
                  key,
                  option,
                ]) => (

                  <label
                    key={key}
                    className={`compress-option ${
                      compressionLevel ===
                      key
                        ? "compress-option-active"
                        : ""
                    }`}
                  >

                    <input
                      type="radio"
                      name="compressionLevel"
                      value={key}
                      checked={
                        compressionLevel ===
                        key
                      }
                      disabled={processing}
                      onChange={() => {
                        setCompressionLevel(
                          key
                        );

                        clearResult();
                      }}
                    />

                    <div>

                      <strong>
                        {option.label}
                      </strong>

                      <p>
                        {
                          option.description
                        }
                      </p>

                    </div>

                  </label>

                )
              )}

            </div>

            {compressionLevel !==
              "lossless" && (

              <div className="compress-warning">

                Image-based compression
                converts pages into
                images. Searchable text,
                links, and form fields
                may be lost.

              </div>

            )}

            {/* OUTPUT FILENAME */}

            <div className="setting-field split-filename">

              <label htmlFor="compress-filename">
                Output Filename
              </label>

              <input
                id="compress-filename"
                type="text"
                value={filename}
                disabled={processing}
                onChange={(event) => {
                  setFilename(
                    event.target.value
                  );

                  clearResult();
                }}
              />

            </div>

          </div>

          {/* PROGRESS */}

          {processing && (
            <div className="compress-progress">

              <div className="compress-progress-track">

                <div
                  className="compress-progress-fill"
                  style={{
                    width:
                      `${progress}%`,
                  }}
                />

              </div>

              <p>
                Compressing PDF...{" "}
                {progress}%
              </p>

            </div>
          )}

          {/* COMPRESS BUTTON */}

          <button
            className="convert-button"
            onClick={compressPdf}
            disabled={processing}
            type="button"
          >

            <Minimize2 size={19} />

            {processing
              ? "Compressing..."
              : "Compress PDF"}

          </button>

          {/* RESULT */}

          {success && result && (
            <div className="compress-result">

              <div className="compress-result-title">

                <CheckCircle
                  size={23}
                />

                <h3>
                  PDF Processing Complete!
                </h3>

              </div>

              <div className="compress-result-stats">

                <div>

                  <span>
                    Original Size
                  </span>

                  <strong>
                    {formatSize(
                      result.originalSize
                    )}
                  </strong>

                </div>

                <div>

                  <span>
                    Output Size
                  </span>

                  <strong>
                    {formatSize(
                      result.outputSize
                    )}
                  </strong>

                </div>

                <div>

                  <span>
                    Size Change
                  </span>

                  <strong>

                    {result.isSmaller
                      ? `${result.savedPercent}% smaller`
                      : result.savedBytes === 0
                        ? "No change"
                        : `${Math.abs(
                            Number(
                              result.savedPercent
                            )
                          ).toFixed(1)}% larger`}

                  </strong>

                </div>

              </div>

              {!result.isSmaller && (
                <p className="compress-result-note">
                    <strong>Compression did not reduce the file size.</strong>
                    <br />
                    <br />

                    {result.savedBytes === 0
                    ? "The processed PDF is the same size as the original."
                    : `The processed PDF is ${formatSize(
                        result.outputSize - result.originalSize
                        )} larger than the original.`}

                    <br />
                    <br />

                    Your original PDF may already be efficiently compressed.
                    Try another compression level, or keep your original file.

                    <br />
                    <br />

                    No file has been downloaded automatically.
                    You can still download this processed version if you want.
                </p>
                )}

                <button
                className="convert-button"
                onClick={() =>
                    downloadFile(
                    result.url,
                    result.name
                    )
                }
                type="button"
                >
                <Download size={19} />

                {result.isSmaller
                    ? "Download PDF Again"
                    : "Download Anyway"}
                </button>

            </div>
          )}

        </div>
      )}

      {/* PRIVACY */}

      <div className="converter-privacy">

        <FileText size={18} />

        Your PDF is processed
        directly in your browser
        and is not uploaded
        to our servers.

      </div>

    </div>
  );
}

export default CompressPdf;