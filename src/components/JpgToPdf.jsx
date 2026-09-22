import { useEffect, useRef, useState } from "react";
import { PDFDocument } from "pdf-lib";

import {
  Upload,
  Download,
  Trash2,
  ArrowLeft,
  ArrowUp,
  ArrowDown,
  CheckCircle,
  Image as ImageIcon,
} from "lucide-react";

function JpgToPdf({ onBack }) {
  const [images, setImages] = useState([]);
  const [converting, setConverting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");
  const [dragging, setDragging] = useState(false);

  const [pageSize, setPageSize] = useState("A4");
  const [orientation, setOrientation] = useState("portrait");
  const [margin, setMargin] = useState("small");
  const [quality, setQuality] = useState("high");
  const [filename, setFilename] = useState("FileToolkit-Converted");

  const imagesRef = useRef([]);

  useEffect(() => {
    imagesRef.current = images;
  }, [images]);

  useEffect(() => {
    return () => {
      imagesRef.current.forEach((image) => {
        URL.revokeObjectURL(image.preview);
      });
    };
  }, []);

  // =====================================
  // ADD IMAGES
  // =====================================

  const addImages = (files) => {
    const validFiles = Array.from(files).filter(
      (file) =>
        file.type === "image/jpeg" ||
        /\.(jpg|jpeg)$/i.test(file.name)
    );

    if (validFiles.length === 0) {
      setError("Please select JPG or JPEG images.");
      return;
    }

    const newImages = validFiles.map((file) => ({
      id: crypto.randomUUID(),
      file,
      preview: URL.createObjectURL(file),
    }));

    setImages((previous) => [...previous, ...newImages]);

    setError("");
    setSuccess(false);
  };

  const handleUpload = (event) => {
    addImages(event.target.files);
    event.target.value = "";
  };

  // =====================================
  // DRAG AND DROP
  // =====================================

  const handleDrop = (event) => {
    event.preventDefault();

    setDragging(false);

    addImages(event.dataTransfer.files);
  };

  // =====================================
  // REMOVE IMAGE
  // =====================================

  const removeImage = (id) => {
    const image = images.find((item) => item.id === id);

    setImages((previous) =>
      previous.filter((item) => item.id !== id)
    );

    if (image) {
      URL.revokeObjectURL(image.preview);
    }

    setSuccess(false);
  };

  // =====================================
  // CLEAR ALL
  // =====================================

  const clearAll = () => {
    images.forEach((image) => {
      URL.revokeObjectURL(image.preview);
    });

    setImages([]);
    setSuccess(false);
    setProgress(0);
    setError("");
  };

  // =====================================
  // MOVE IMAGE
  // =====================================

  const moveImage = (index, direction) => {
    const newIndex = index + direction;

    if (newIndex < 0 || newIndex >= images.length) {
      return;
    }

    const updated = [...images];

    [updated[index], updated[newIndex]] = [
      updated[newIndex],
      updated[index],
    ];

    setImages(updated);
    setSuccess(false);
  };

  // =====================================
  // COMPRESS IMAGE
  // =====================================

  const prepareImage = async (file) => {
    if (quality === "original") {
      return file.arrayBuffer();
    }

    const bitmap = await createImageBitmap(file);

    try {
      const canvas = document.createElement("canvas");

      canvas.width = bitmap.width;
      canvas.height = bitmap.height;

      const context = canvas.getContext("2d");

      if (!context) {
        throw new Error("Unable to initialize image processing.");
      }

      context.fillStyle = "#ffffff";
      context.fillRect(0, 0, canvas.width, canvas.height);

      context.drawImage(bitmap, 0, 0);

      const qualityValues = {
        high: 0.9,
        medium: 0.7,
        low: 0.5,
      };

      const blob = await new Promise((resolve, reject) => {
        canvas.toBlob(
          (result) => {
            if (result) {
              resolve(result);
            } else {
              reject(new Error("Image compression failed."));
            }
          },
          "image/jpeg",
          qualityValues[quality]
        );
      });

      return blob.arrayBuffer();
    } finally {
      bitmap.close();
    }
  };

  // =====================================
  // CONVERT TO PDF
  // =====================================

  const convertToPdf = async () => {
    if (images.length === 0 || converting) {
      return;
    }

    setConverting(true);
    setProgress(0);
    setSuccess(false);
    setError("");

    try {
      const pdfDoc = await PDFDocument.create();

      const A4_WIDTH = 595.28;
      const A4_HEIGHT = 841.89;

      const marginValues = {
        none: 0,
        small: 20,
        large: 50,
      };

      const pageMargin = marginValues[margin];

      for (let index = 0; index < images.length; index++) {
        const image = images[index];

        const imageBytes = await prepareImage(image.file);

        const jpgImage = await pdfDoc.embedJpg(imageBytes);

        let pageWidth;
        let pageHeight;

        if (pageSize === "A4") {
          pageWidth =
            orientation === "portrait"
              ? A4_WIDTH
              : A4_HEIGHT;

          pageHeight =
            orientation === "portrait"
              ? A4_HEIGHT
              : A4_WIDTH;
        } else {
          pageWidth = jpgImage.width + pageMargin * 2;
          pageHeight = jpgImage.height + pageMargin * 2;

          const isLandscape = pageWidth > pageHeight;

          if (
            (orientation === "portrait" && isLandscape) ||
            (orientation === "landscape" && !isLandscape)
          ) {
            [pageWidth, pageHeight] = [pageHeight, pageWidth];
          }
        }

        const page = pdfDoc.addPage([
          pageWidth,
          pageHeight,
        ]);

        const availableWidth =
          pageWidth - pageMargin * 2;

        const availableHeight =
          pageHeight - pageMargin * 2;

        const scale = Math.min(
          availableWidth / jpgImage.width,
          availableHeight / jpgImage.height,
          1
        );

        const drawWidth = jpgImage.width * scale;
        const drawHeight = jpgImage.height * scale;

        const x = (pageWidth - drawWidth) / 2;
        const y = (pageHeight - drawHeight) / 2;

        page.drawImage(jpgImage, {
          x,
          y,
          width: drawWidth,
          height: drawHeight,
        });

        setProgress(
          Math.round(((index + 1) / images.length) * 100)
        );
      }

      const pdfBytes = await pdfDoc.save();

      const blob = new Blob([pdfBytes], {
        type: "application/pdf",
      });

      const url = URL.createObjectURL(blob);

      const link = document.createElement("a");

      const safeFilename =
        filename.trim().replace(/[\\/:*?"<>|]/g, "-") ||
        "FileToolkit-Converted";

      link.href = url;

      link.download = safeFilename.toLowerCase().endsWith(".pdf")
        ? safeFilename
        : `${safeFilename}.pdf`;

      document.body.appendChild(link);

      link.click();

      link.remove();

      setTimeout(() => {
        URL.revokeObjectURL(url);
      }, 60000);

      setSuccess(true);
    } catch (conversionError) {
      console.error(conversionError);

      setError(
        "Unable to convert images. Please check your files and try again."
      );
    } finally {
      setConverting(false);
    }
  };

  // =====================================
  // USER INTERFACE
  // =====================================

  return (
    <div className="converter-page">

      <button
        className="back-button"
        onClick={onBack}
        type="button"
      >
        <ArrowLeft size={18} />
        Back to All Tools
      </button>

      <div className="converter-header">
        <h1>JPG to PDF Converter</h1>

        <p>
          Convert multiple JPG images into one PDF document.
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

        <h3>Select JPG Images</h3>

        <p>
          Drag and drop images here or select files.
        </p>

        <label className="upload-button">
          Select Images

          <input
            type="file"
            accept=".jpg,.jpeg,image/jpeg"
            multiple
            onChange={handleUpload}
            hidden
          />
        </label>
      </div>

      {/* ERROR MESSAGE */}

      {error && (
        <div className="converter-error">
          {error}
        </div>
      )}

      {/* SELECTED IMAGES */}

      {images.length > 0 && (
        <div className="selected-images">

          <div className="selected-header">
            <h2>
              Selected Images ({images.length})
            </h2>

            <button
              className="clear-all-button"
              onClick={clearAll}
              disabled={converting}
              type="button"
            >
              <Trash2 size={16} />
              Clear All
            </button>
          </div>

          <div className="image-preview-grid">

            {images.map((image, index) => (
              <div
                className="image-preview"
                key={image.id}
              >
                <img
                  src={image.preview}
                  alt={image.file.name}
                />

                <p>{image.file.name}</p>

                <div className="image-order">
                  <button
                    onClick={() => moveImage(index, -1)}
                    disabled={index === 0 || converting}
                    title="Move up"
                    type="button"
                  >
                    <ArrowUp size={17} />
                  </button>

                  <span>{index + 1}</span>

                  <button
                    onClick={() => moveImage(index, 1)}
                    disabled={
                      index === images.length - 1 ||
                      converting
                    }
                    title="Move down"
                    type="button"
                  >
                    <ArrowDown size={17} />
                  </button>
                </div>

                <button
                  onClick={() => removeImage(image.id)}
                  className="remove-image"
                  disabled={converting}
                  type="button"
                >
                  <Trash2 size={17} />
                  Remove
                </button>
              </div>
            ))}

          </div>

          {/* PDF SETTINGS */}

          <div className="pdf-settings">

            <h2>PDF Settings</h2>

            <div className="settings-grid">

              <div className="setting-field">
                <label htmlFor="pdf-page-size">
                  Page Size
                </label>

                <select
                  id="pdf-page-size"
                  value={pageSize}
                  onChange={(e) =>
                    setPageSize(e.target.value)
                  }
                >
                  <option value="A4">A4</option>
                  <option value="original">
                    Original Image Size
                  </option>
                </select>
              </div>

              <div className="setting-field">
                <label htmlFor="pdf-orientation">
                  Orientation
                </label>

                <select
                  id="pdf-orientation"
                  value={orientation}
                  onChange={(e) =>
                    setOrientation(e.target.value)
                  }
                >
                  <option value="portrait">
                    Portrait
                  </option>

                  <option value="landscape">
                    Landscape
                  </option>
                </select>
              </div>

              <div className="setting-field">
                <label htmlFor="pdf-margin">
                  Page Margin
                </label>

                <select
                  id="pdf-margin"
                  value={margin}
                  onChange={(e) =>
                    setMargin(e.target.value)
                  }
                >
                  <option value="none">
                    No Margin
                  </option>

                  <option value="small">
                    Small Margin
                  </option>

                  <option value="large">
                    Large Margin
                  </option>
                </select>
              </div>

              <div className="setting-field">
                <label htmlFor="pdf-quality">
                  Image Quality
                </label>

                <select
                  id="pdf-quality"
                  value={quality}
                  onChange={(e) =>
                    setQuality(e.target.value)
                  }
                >
                  <option value="original">
                    Original Quality
                  </option>

                  <option value="high">
                    High Quality
                  </option>

                  <option value="medium">
                    Medium Quality
                  </option>

                  <option value="low">
                    Low Quality
                  </option>
                </select>
              </div>

              <div className="setting-field">
                <label htmlFor="pdf-filename">
                  PDF Filename
                </label>

                <input
                  id="pdf-filename"
                  type="text"
                  value={filename}
                  onChange={(e) =>
                    setFilename(e.target.value)
                  }
                  placeholder="Enter PDF filename"
                />
              </div>

            </div>

          </div>

          {/* CONVERSION PROGRESS */}

          {converting && (
            <div className="conversion-progress">
              <div
                className="progress-bar"
                style={{
                  width: `${progress}%`,
                }}
              />

              <p>
                Converting... {progress}%
              </p>
            </div>
          )}

          {/* CONVERT BUTTON */}

          <button
            className="convert-button"
            onClick={convertToPdf}
            disabled={converting}
            type="button"
          >
            <Download size={19} />

            {converting
              ? "Converting..."
              : "Convert to PDF"}
          </button>

          {/* SUCCESS MESSAGE */}

          {success && (
            <div className="converter-success">
              <CheckCircle size={20} />

              PDF generated successfully!
            </div>
          )}

        </div>
      )}

      {/* PRIVACY MESSAGE */}

      <div className="converter-privacy">
        <ImageIcon size={18} />

        Your images are processed directly in your browser.
        They are not uploaded to our servers.
      </div>

    </div>
  );
}

export default JpgToPdf;