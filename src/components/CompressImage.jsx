import { useEffect, useState } from "react";
import {
  ArrowLeft,
  Download,
  Image as ImageIcon,
  Upload,
} from "lucide-react";

const MAX_FILE_SIZE = 25 * 1024 * 1024;

const formatSize = (bytes) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(2)} KB`;
  }
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
};

const inputStyle = {
  width: "100%",
  padding: "12px",
  marginTop: "8px",
  border: "1px solid #cbd5e1",
  borderRadius: "8px",
  boxSizing: "border-box",
};

const buttonStyle = {
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  gap: "10px",
  width: "100%",
  marginTop: "25px",
  padding: "15px",
  background: "#6258f5",
  color: "#ffffff",
  border: "none",
  borderRadius: "10px",
  fontSize: "16px",
  fontWeight: "600",
  cursor: "pointer",
};

function CompressImage({ onBack }) {
  const [selectedFile, setSelectedFile] = useState(null);

  const [originalPreview, setOriginalPreview] = useState("");
  const [compressedPreview, setCompressedPreview] = useState("");

  const [originalDimensions, setOriginalDimensions] =
    useState(null);

  const [quality, setQuality] = useState(75);

  const [outputFormat, setOutputFormat] = useState("image/jpeg");

  const [resizeEnabled, setResizeEnabled] = useState(false);

  const [maxWidth, setMaxWidth] = useState(1920);

  const [maxHeight, setMaxHeight] = useState(1920);

  const [compressedBlob, setCompressedBlob] = useState(null);

  const [isProcessing, setIsProcessing] = useState(false);

  const [error, setError] = useState("");

  const [success, setSuccess] = useState(false);

  useEffect(() => {
    return () => {
      if (originalPreview) {
        URL.revokeObjectURL(originalPreview);
      }
    };
  }, [originalPreview]);

  useEffect(() => {
    return () => {
      if (compressedPreview) {
        URL.revokeObjectURL(compressedPreview);
      }
    };
  }, [compressedPreview]);

  const resetResult = () => {
    setCompressedBlob(null);
    setCompressedPreview("");
    setSuccess(false);
    setError("");
  };

  const handleFileChange = async (event) => {
    const file = event.target.files?.[0];

    setSelectedFile(null);
    setOriginalPreview("");
    setOriginalDimensions(null);

    resetResult();

    if (!file) return;

    const allowedTypes = [
      "image/jpeg",
      "image/png",
      "image/webp",
    ];

    if (!allowedTypes.includes(file.type)) {
      setError(
        "Please select a JPG, JPEG, PNG, or WebP image."
      );
      return;
    }

    if (file.size > MAX_FILE_SIZE) {
      setError("Please select an image smaller than 25 MB.");
      return;
    }

    const previewUrl = URL.createObjectURL(file);

    try {
      const dimensions = await loadImage(previewUrl);

      setOriginalDimensions({
        width: dimensions.naturalWidth,
        height: dimensions.naturalHeight,
      });

      setSelectedFile(file);
      setOriginalPreview(previewUrl);

      setOutputFormat(
        file.type === "image/png"
          ? "image/webp"
          : file.type
      );
    } catch {
      URL.revokeObjectURL(previewUrl);

      setError(
        "Unable to read this image. Please select a valid image file."
      );
    }
  };

  const handleCompress = async () => {
    if (!selectedFile || isProcessing) return;

    resetResult();

    setIsProcessing(true);

    try {
      const image = await loadImage(originalPreview);

      let width = image.naturalWidth;
      let height = image.naturalHeight;

      if (resizeEnabled) {
        const requestedWidth = Number(maxWidth);
        const requestedHeight = Number(maxHeight);

        if (
          !Number.isFinite(requestedWidth) ||
          !Number.isFinite(requestedHeight) ||
          requestedWidth < 1 ||
          requestedHeight < 1
        ) {
          throw new Error(
            "Please enter valid width and height values."
          );
        }

        const scale = Math.min(
          1,
          requestedWidth / width,
          requestedHeight / height
        );

        width = Math.max(1, Math.round(width * scale));
        height = Math.max(1, Math.round(height * scale));
      }

      const canvas = document.createElement("canvas");

      canvas.width = width;
      canvas.height = height;

      const context = canvas.getContext("2d");

      if (!context) {
        throw new Error(
          "Your browser could not process this image."
        );
      }

      context.imageSmoothingEnabled = true;
      context.imageSmoothingQuality = "high";

      // JPEG does not support transparency.
      // Give transparent pixels a white background.
      if (outputFormat === "image/jpeg") {
        context.fillStyle = "#ffffff";
        context.fillRect(0, 0, width, height);
      }

      context.drawImage(image, 0, 0, width, height);

      const blob = await new Promise((resolve, reject) => {
        canvas.toBlob(
          (result) => {
            if (result) {
              resolve(result);
            } else {
              reject(
                new Error(
                  "Image compression failed. Try another format."
                )
              );
            }
          },
          outputFormat,
          quality / 100
        );
      });

      if (blob.type !== outputFormat) {
        throw new Error(
          "Your browser does not support the selected output format."
        );
      }

      const previewUrl = URL.createObjectURL(blob);

      setCompressedBlob(blob);
      setCompressedPreview(previewUrl);
      setSuccess(true);
    } catch (err) {
      console.error("Compress Image error:", err);

      setError(
        err.message || "Unable to compress this image."
      );
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDownload = () => {
    if (!compressedBlob) return;

    const extension =
      outputFormat === "image/png"
        ? "png"
        : outputFormat === "image/webp"
          ? "webp"
          : "jpg";

    const filename = selectedFile.name.replace(
      /\.[^.]+$/,
      ""
    );

    const url = URL.createObjectURL(compressedBlob);

    const link = document.createElement("a");

    link.href = url;
    link.download = `${filename}-Compressed.${extension}`;

    document.body.appendChild(link);

    link.click();
    link.remove();

    setTimeout(() => {
      URL.revokeObjectURL(url);
    }, 1000);
  };

  const sizeDifference =
    selectedFile && compressedBlob
      ? selectedFile.size - compressedBlob.size
      : 0;

  const reductionPercentage =
    selectedFile && compressedBlob
      ? (
          (sizeDifference / selectedFile.size) *
          100
        ).toFixed(1)
      : 0;

  return (
    <main
      style={{
        maxWidth: "900px",
        margin: "40px auto",
        padding: "20px",
      }}
    >
      <button
        type="button"
        onClick={onBack}
        style={{
          display: "flex",
          alignItems: "center",
          gap: "8px",
          marginBottom: "25px",
          cursor: "pointer",
        }}
      >
        <ArrowLeft size={18} />
        Back to Home
      </button>

      <div
        style={{
          background: "#ffffff",
          border: "1px solid #e5e7eb",
          borderRadius: "16px",
          padding: "30px",
        }}
      >
        <ImageIcon size={36} color="#6258f5" />

        <h1>Compress Image</h1>

        <p style={{ color: "#64748b" }}>
          Reduce image file size while maintaining
          acceptable visual quality.
        </p>

        {/* IMAGE UPLOAD */}

        <div style={{ marginTop: "30px" }}>
          <strong>Select Image</strong>

          <div
            style={{
              border: "2px dashed #cbd5e1",
              borderRadius: "12px",
              padding: "30px",
              textAlign: "center",
              marginTop: "12px",
            }}
          >
            <Upload size={30} color="#6258f5" />

            <input
              type="file"
              accept=".jpg,.jpeg,.png,.webp"
              onChange={handleFileChange}
              style={{
                display: "block",
                margin: "15px auto",
                maxWidth: "100%",
              }}
            />

            <p>
              JPG, JPEG, PNG, or WebP — maximum 25 MB
            </p>

            {selectedFile && (
              <p>
                Selected: <strong>{selectedFile.name}</strong>
              </p>
            )}
          </div>
        </div>

        {/* ORIGINAL IMAGE */}

        {selectedFile && (
          <div style={{ marginTop: "25px" }}>
            <h3>Original Image</h3>

            <img
              src={originalPreview}
              alt="Original"
              style={{
                maxWidth: "100%",
                maxHeight: "300px",
                objectFit: "contain",
                borderRadius: "10px",
              }}
            />

            <p>
              File size:{" "}
              <strong>
                {formatSize(selectedFile.size)}
              </strong>
            </p>

            {originalDimensions && (
              <p>
                Dimensions:{" "}
                {originalDimensions.width} ×{" "}
                {originalDimensions.height}
              </p>
            )}
          </div>
        )}

        {/* COMPRESSION SETTINGS */}

        {selectedFile && (
          <>
            <div style={{ marginTop: "30px" }}>
              <label htmlFor="output-format">
                <strong>Output Format</strong>
              </label>

              <select
                id="output-format"
                value={outputFormat}
                onChange={(event) => {
                  setOutputFormat(event.target.value);
                  resetResult();
                }}
                style={inputStyle}
              >
                <option value="image/jpeg">
                  JPG
                </option>

                <option value="image/webp">
                  WebP
                </option>

                <option value="image/png">
                  PNG
                </option>
              </select>
            </div>

            <div style={{ marginTop: "25px" }}>
              <label htmlFor="image-quality">
                <strong>
                  Image Quality: {quality}%
                </strong>
              </label>

              <input
                id="image-quality"
                type="range"
                min="10"
                max="100"
                step="5"
                value={quality}
                disabled={outputFormat === "image/png"}
                onChange={(event) => {
                  setQuality(Number(event.target.value));
                  resetResult();
                }}
                style={{
                  width: "100%",
                  marginTop: "15px",
                }}
              />

              <p style={{ color: "#64748b" }}>
                {outputFormat === "image/png"
                  ? "PNG uses lossless encoding. The quality slider does not apply."
                  : "Lower quality generally produces a smaller image."}
              </p>
            </div>

            {/* OPTIONAL RESIZE */}

            <div style={{ marginTop: "25px" }}>
              <label>
                <input
                  type="checkbox"
                  checked={resizeEnabled}
                  onChange={(event) => {
                    setResizeEnabled(event.target.checked);
                    resetResult();
                  }}
                />

                {" "}Resize image while compressing
              </label>

              {resizeEnabled && (
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns:
                      "repeat(auto-fit, minmax(180px, 1fr))",
                    gap: "15px",
                    marginTop: "15px",
                  }}
                >
                  <div>
                    <label htmlFor="max-width">
                      Maximum Width
                    </label>

                    <input
                      id="max-width"
                      type="number"
                      min="1"
                      value={maxWidth}
                      onChange={(event) => {
                        setMaxWidth(event.target.value);
                        resetResult();
                      }}
                      style={inputStyle}
                    />
                  </div>

                  <div>
                    <label htmlFor="max-height">
                      Maximum Height
                    </label>

                    <input
                      id="max-height"
                      type="number"
                      min="1"
                      value={maxHeight}
                      onChange={(event) => {
                        setMaxHeight(event.target.value);
                        resetResult();
                      }}
                      style={inputStyle}
                    />
                  </div>
                </div>
              )}

              {resizeEnabled && (
                <p style={{ color: "#64748b" }}>
                  Aspect ratio is preserved. Images will
                  not be enlarged.
                </p>
              )}
            </div>

            <button
              type="button"
              onClick={handleCompress}
              disabled={isProcessing}
              style={buttonStyle}
            >
              {isProcessing
                ? "Compressing..."
                : "Compress Image"}
            </button>
          </>
        )}

        {/* ERROR */}

        {error && (
          <p
            role="alert"
            style={{
              color: "#dc2626",
              marginTop: "20px",
            }}
          >
            {error}
          </p>
        )}

        {/* RESULT */}

        {success && compressedBlob && (
          <div style={{ marginTop: "30px" }}>
            <h3>Compression Result</h3>

            <img
              src={compressedPreview}
              alt="Compressed result"
              style={{
                maxWidth: "100%",
                maxHeight: "300px",
                objectFit: "contain",
                borderRadius: "10px",
              }}
            />

            <p>
              Original:{" "}
              <strong>
                {formatSize(selectedFile.size)}
              </strong>
            </p>

            <p>
              Output:{" "}
              <strong>
                {formatSize(compressedBlob.size)}
              </strong>
            </p>

            {sizeDifference > 0 ? (
              <p style={{ color: "#16a34a" }}>
                File size reduced by{" "}
                <strong>
                  {reductionPercentage}%
                </strong>
              </p>
            ) : sizeDifference < 0 ? (
              <p style={{ color: "#d97706" }}>
                The output is larger than the original.
                Try lowering quality, resizing, or
                choosing another format.
              </p>
            ) : (
              <p>
                The output has the same size as the
                original.
              </p>
            )}

            <button
              type="button"
              onClick={handleDownload}
              style={buttonStyle}
            >
              <Download size={18} />

              Download Image
            </button>
          </div>
        )}

        <p
          style={{
            color: "#64748b",
            fontSize: "13px",
            marginTop: "25px",
          }}
        >
          Your images are processed directly in your
          browser and are not uploaded to FileToolkit
          servers.
        </p>
      </div>
    </main>
  );
}

function loadImage(url) {
  return new Promise((resolve, reject) => {
    const image = new window.Image();

    image.onload = () => resolve(image);

    image.onerror = () =>
      reject(new Error("Unable to load image."));

    image.src = url;
  });
}

export default CompressImage;