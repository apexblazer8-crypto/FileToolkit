import { useEffect, useRef, useState } from "react";
import { PDFDocument } from "pdf-lib";

import {
  Upload,
  Download,
  Trash2,
  ArrowLeft,
  ArrowUp,
  ArrowDown,
  Files,
  CheckCircle,
} from "lucide-react";

function MergePdf({ onBack }) {

  const [pdfFiles, setPdfFiles] = useState([]);

  const [merging, setMerging] = useState(false);

  const [progress, setProgress] = useState(0);

  const [error, setError] = useState("");

  const [success, setSuccess] = useState(false);

  const [dragging, setDragging] = useState(false);

  const [filename, setFilename] = useState(
    "FileToolkit-Merged"
  );

  const filesRef = useRef([]);

  useEffect(() => {
    filesRef.current = pdfFiles;
  }, [pdfFiles]);

  useEffect(() => {
    return () => {
      filesRef.current.forEach((item) => {
        URL.revokeObjectURL(item.preview);
      });
    };
  }, []);

  // =====================================
  // ADD PDF FILES
  // =====================================

  const addFiles = async (files) => {

    const selectedFiles = Array.from(files);

    const validFiles = selectedFiles.filter(
      (file) =>
        file.type === "application/pdf" ||
        /\.pdf$/i.test(file.name)
    );

    if (validFiles.length === 0) {
      setError("Please select valid PDF files.");
      return;
    }

    const newFiles = [];

    const invalidFiles = [];

    for (const file of validFiles) {

      try {

        const bytes = await file.arrayBuffer();

        const pdf = await PDFDocument.load(bytes);

        const pageCount = pdf.getPageCount();

        newFiles.push({
          id: crypto.randomUUID(),
          file,
          name: file.name,
          size: file.size,
          pages: pageCount,
          preview: URL.createObjectURL(file),
        });

      } catch (error) {

        console.error(error);

        invalidFiles.push(file.name);

      }

    }

    setPdfFiles((previous) => [
      ...previous,
      ...newFiles,
    ]);

    if (invalidFiles.length > 0) {

      setError(
        `Unable to read: ${invalidFiles.join(", ")}. Password-protected or damaged PDFs may not be supported.`
      );

    } else {

      setError("");

    }

    setSuccess(false);

  };

  // =====================================
  // FILE UPLOAD
  // =====================================

  const handleUpload = async (event) => {

    await addFiles(event.target.files);

    event.target.value = "";

  };

  // =====================================
  // DRAG AND DROP
  // =====================================

  const handleDrop = async (event) => {

    event.preventDefault();

    setDragging(false);

    await addFiles(event.dataTransfer.files);

  };

  // =====================================
  // REMOVE FILE
  // =====================================

  const removeFile = (id) => {

    const selectedFile = pdfFiles.find(
      (item) => item.id === id
    );

    if (selectedFile) {

      URL.revokeObjectURL(selectedFile.preview);

    }

    setPdfFiles((previous) =>
      previous.filter((item) => item.id !== id)
    );

    setSuccess(false);

  };

  // =====================================
  // CLEAR ALL
  // =====================================

  const clearAll = () => {

    pdfFiles.forEach((item) => {
      URL.revokeObjectURL(item.preview);
    });

    setPdfFiles([]);

    setProgress(0);

    setError("");

    setSuccess(false);

  };

  // =====================================
  // REORDER FILES
  // =====================================

  const moveFile = (index, direction) => {

    const newIndex = index + direction;

    if (
      newIndex < 0 ||
      newIndex >= pdfFiles.length
    ) {
      return;
    }

    const updated = [...pdfFiles];

    [updated[index], updated[newIndex]] = [
      updated[newIndex],
      updated[index],
    ];

    setPdfFiles(updated);

    setSuccess(false);

  };

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
  // MERGE PDF
  // =====================================

  const mergePdf = async () => {

    if (pdfFiles.length < 2 || merging) {
      return;
    }

    setMerging(true);

    setProgress(0);

    setError("");

    setSuccess(false);

    try {

      const mergedPdf = await PDFDocument.create();

      for (
        let index = 0;
        index < pdfFiles.length;
        index++
      ) {

        const item = pdfFiles[index];

        const bytes = await item.file.arrayBuffer();

        const sourcePdf = await PDFDocument.load(bytes);

        const pages = await mergedPdf.copyPages(
          sourcePdf,
          sourcePdf.getPageIndices()
        );

        pages.forEach((page) => {

          mergedPdf.addPage(page);

        });

        setProgress(
          Math.round(
            ((index + 1) / pdfFiles.length) * 100
          )
        );

      }

      const mergedBytes = await mergedPdf.save();

      const blob = new Blob(
        [mergedBytes],
        {
          type: "application/pdf",
        }
      );

      const url = URL.createObjectURL(blob);

      const link = document.createElement("a");

      const safeFilename =
        filename
          .trim()
          .replace(/[\\/:*?"<>|]/g, "-") ||
        "FileToolkit-Merged";

      link.href = url;

      link.download =
        safeFilename.toLowerCase().endsWith(".pdf")
          ? safeFilename
          : `${safeFilename}.pdf`;

      document.body.appendChild(link);

      link.click();

      link.remove();

      setTimeout(() => {

        URL.revokeObjectURL(url);

      }, 60000);

      setSuccess(true);

    } catch (mergeError) {

      console.error(mergeError);

      setError(
        "Unable to merge PDF files. Please check your documents and try again."
      );

    } finally {

      setMerging(false);

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

        <h1>Merge PDF</h1>

        <p>
          Combine multiple PDF documents into
          one file in your preferred order.
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

        <h3>Select PDF Files</h3>

        <p>
          Drag and drop PDF files here
          or select documents.
        </p>

        <label className="upload-button">

          Select PDF Files

          <input
            type="file"
            accept=".pdf,application/pdf"
            multiple
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

      {/* SELECTED FILES */}

      {pdfFiles.length > 0 && (

        <div className="selected-images">

          <div className="selected-header">

            <h2>
              Selected PDFs ({pdfFiles.length})
            </h2>

            <button
              className="clear-all-button"
              onClick={clearAll}
              disabled={merging}
              type="button"
            >

              <Trash2 size={16} />

              Clear All

            </button>

          </div>

          {/* PDF FILE CARDS */}

          <div className="merge-files-grid">

            {pdfFiles.map((item, index) => (

              <div
                className="merge-file-card"
                key={item.id}
              >

                <div className="merge-file-icon">

                  <Files size={35} />

                </div>

                <h3>{item.name}</h3>

                <p>
                  {item.pages} pages
                </p>

                <p>
                  {formatSize(item.size)}
                </p>

                {/* FILE ORDER */}

                <div className="image-order">

                  <button
                    onClick={() =>
                      moveFile(index, -1)
                    }
                    disabled={
                      index === 0 || merging
                    }
                    type="button"
                    title="Move up"
                  >

                    <ArrowUp size={17} />

                  </button>

                  <span>
                    {index + 1}
                  </span>

                  <button
                    onClick={() =>
                      moveFile(index, 1)
                    }
                    disabled={
                      index ===
                        pdfFiles.length - 1 ||
                      merging
                    }
                    type="button"
                    title="Move down"
                  >

                    <ArrowDown size={17} />

                  </button>

                </div>

                {/* REMOVE */}

                <button
                  className="remove-image"
                  onClick={() =>
                    removeFile(item.id)
                  }
                  disabled={merging}
                  type="button"
                >

                  <Trash2 size={16} />

                  Remove

                </button>

              </div>

            ))}

          </div>

          {/* MERGE SETTINGS */}

          <div className="pdf-settings">

            <h2>Merge Settings</h2>

            <div className="settings-grid">

              <div className="setting-field">

                <label htmlFor="merge-filename">
                  Output Filename
                </label>

                <input
                  id="merge-filename"
                  type="text"
                  value={filename}
                  onChange={(event) =>
                    setFilename(event.target.value)
                  }
                  placeholder="Enter filename"
                />

              </div>

              <div className="setting-field">

                <label>Total Pages</label>

                <div className="merge-total-pages">

                  {pdfFiles.reduce(
                    (total, item) =>
                      total + item.pages,
                    0
                  )}

                </div>

              </div>

            </div>

          </div>

          {/* PROGRESS */}

          {merging && (

            <div className="conversion-progress">

              <div
                className="progress-bar"
                style={{
                  width: `${progress}%`,
                }}
              />

              <p>
                Merging... {progress}%
              </p>

            </div>

          )}

          {/* MERGE BUTTON */}

          <button
            className="convert-button"
            onClick={mergePdf}
            disabled={
              merging ||
              pdfFiles.length < 2
            }
            type="button"
          >

            <Download size={19} />

            {merging
              ? "Merging..."
              : "Merge PDF"}
          </button>

          {/* SUCCESS */}

          {success && (

            <div className="converter-success">

              <CheckCircle size={20} />

              PDF files merged successfully!

            </div>

          )}

        </div>

      )}

      {/* PRIVACY */}

      <div className="converter-privacy">

        <Files size={18} />

        Your PDF files are processed directly
        in your browser and are not uploaded
        to our servers.

      </div>

    </div>

  );

}

export default MergePdf;