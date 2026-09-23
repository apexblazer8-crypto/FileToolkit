import { useEffect, useState } from "react";
import { ArrowLeft, Download, Image as ImageIcon } from "lucide-react";

const MAX_FILE_SIZE = 25 * 1024 * 1024;

const formatBytes = (bytes) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
};

export default function ImageConverter({ onBack }) {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState("");
  const [outputFormat, setOutputFormat] = useState("image/png");
  const [quality, setQuality] = useState(90);
  const [background, setBackground] = useState("#ffffff");
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    if (!file) {
      setPreview("");
      return;
    }

    const url = URL.createObjectURL(file);
    setPreview(url);

    return () => URL.revokeObjectURL(url);
  }, [file]);

  useEffect(() => {
    return () => {
      if (result?.url) URL.revokeObjectURL(result.url);
    };
  }, [result]);

  const handleFileChange = (event) => {
    const selected = event.target.files?.[0];

    setError("");
    setResult(null);

    if (!selected) {
      setFile(null);
      return;
    }

    const validTypes = [
      "image/jpeg",
      "image/png",
      "image/webp",
    ];

    if (!validTypes.includes(selected.type)) {
      setError("Please select a JPG, PNG, or WebP image.");
      setFile(null);
      return;
    }

    if (selected.size > MAX_FILE_SIZE) {
      setError("Maximum supported image size is 25 MB.");
      setFile(null);
      return;
    }

    setFile(selected);
  };

  const convertImage = async () => {
    if (!file || processing) return;

    setProcessing(true);
    setError("");
    setResult(null);

    try {
      const image = await createImageBitmap(file);

      try {
        const canvas = document.createElement("canvas");

        canvas.width = image.width;
        canvas.height = image.height;

        const context = canvas.getContext("2d");

        if (!context) {
          throw new Error("Canvas is not supported by your browser.");
        }

        // JPEG does not support transparency.
        // Fill transparent areas with the selected background color.
        if (outputFormat === "image/jpeg") {
          context.fillStyle = background;
          context.fillRect(0, 0, canvas.width, canvas.height);
        }

        context.drawImage(image, 0, 0);

        const blob = await new Promise((resolve, reject) => {
          canvas.toBlob(
            (output) => {
              if (output) {
                resolve(output);
              } else {
                reject(new Error("Image conversion failed."));
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

        const extension =
          outputFormat === "image/jpeg"
            ? "jpg"
            : outputFormat === "image/png"
              ? "png"
              : "webp";

        const originalName = file.name.replace(/\.[^.]+$/, "");

        const outputName = `${originalName}-Converted.${extension}`;

        const url = URL.createObjectURL(blob);

        setResult({
          blob,
          url,
          name: outputName,
          width: image.width,
          height: image.height,
        });
      } finally {
        image.close();
      }
    } catch (err) {
      setError(err.message || "Unable to convert the selected image.");
    } finally {
      setProcessing(false);
    }
  };

  const downloadImage = () => {
    if (!result) return;

    const link = document.createElement("a");

    link.href = result.url;
    link.download = result.name;

    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  return (
    <main
      style={{
        maxWidth: "850px",
        margin: "40px auto",
        padding: "20px",
      }}
    >
      <button
        type="button"
        onClick={onBack}
        style={{ marginBottom: "20px", cursor: "pointer" }}
      >
        <ArrowLeft size={15} style={{ verticalAlign: "middle" }} />
        {" "}Back to Home
      </button>

      <div
        style={{
          background: "#fff",
          padding: "30px",
          border: "1px solid #dce3f0",
          borderRadius: "14px",
        }}
      >
        <ImageIcon color="#5b50f0" size={32} />

        <h2>Image Converter</h2>

        <p>Convert JPG, PNG, and WebP images directly in your browser.</p>

        <label
          htmlFor="converter-file"
          style={{ display: "block", marginBottom: "10px" }}
        >
          <strong>Select Image</strong>
        </label>

        <input
          id="converter-file"
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={handleFileChange}
        />

        <p style={{ fontSize: "13px", color: "#64748b" }}>
          Supported formats: JPG, PNG, WebP — maximum 25 MB.
        </p>

        {preview && file && (
          <div style={{ marginTop: "25px" }}>
            <h3>Original Image</h3>

            <img
              src={preview}
              alt="Original"
              style={{
                maxWidth: "100%",
                maxHeight: "300px",
                borderRadius: "8px",
              }}
            />

            <p>Filename: {file.name}</p>
            <p>Original size: {formatBytes(file.size)}</p>
          </div>
        )}

        <div style={{ marginTop: "25px" }}>
          <label htmlFor="converter-format">
            <strong>Output Format</strong>
          </label>

          <select
            id="converter-format"
            value={outputFormat}
            onChange={(event) => {
              setOutputFormat(event.target.value);
              setResult(null);
            }}
            style={{
              display: "block",
              width: "100%",
              padding: "12px",
              marginTop: "10px",
              borderRadius: "7px",
              border: "1px solid #cbd5e1",
            }}
          >
            <option value="image/png">PNG</option>
            <option value="image/jpeg">JPG</option>
            <option value="image/webp">WebP</option>
          </select>
        </div>

        {outputFormat !== "image/png" && (
          <div style={{ marginTop: "25px" }}>
            <label htmlFor="converter-quality">
              <strong>Image Quality: {quality}%</strong>
            </label>

            <input
              id="converter-quality"
              type="range"
              min="10"
              max="100"
              value={quality}
              onChange={(event) => {
                setQuality(Number(event.target.value));
                setResult(null);
              }}
              style={{ display: "block", width: "100%" }}
            />
          </div>
        )}

        {outputFormat === "image/jpeg" && (
          <div style={{ marginTop: "25px" }}>
            <label htmlFor="converter-background">
              <strong>Background for Transparent Areas</strong>
            </label>

            <input
              id="converter-background"
              type="color"
              value={background}
              onChange={(event) => {
                setBackground(event.target.value);
                setResult(null);
              }}
              style={{
                display: "block",
                marginTop: "10px",
                cursor: "pointer",
              }}
            />

            <p style={{ fontSize: "13px", color: "#64748b" }}>
              JPG does not support transparency. Transparent pixels will
              use this background color.
            </p>
          </div>
        )}

        <button
          type="button"
          disabled={!file || processing}
          onClick={convertImage}
          style={{
            width: "100%",
            marginTop: "25px",
            padding: "14px",
            background: "#5b50f0",
            color: "#fff",
            border: "none",
            borderRadius: "8px",
            cursor: !file || processing ? "not-allowed" : "pointer",
            opacity: !file || processing ? 0.6 : 1,
            fontWeight: "bold",
          }}
        >
          {processing ? "Converting..." : "Convert Image"}
        </button>

        {error && (
          <p style={{ color: "#dc2626", marginTop: "15px" }}>
            {error}
          </p>
        )}

        {result && (
          <div style={{ marginTop: "30px" }}>
            <h3>Converted Image</h3>

            <img
              src={result.url}
              alt="Converted"
              style={{
                maxWidth: "100%",
                maxHeight: "300px",
                borderRadius: "8px",
              }}
            />

            <p>Output: {result.name}</p>

                <p>Original size: {formatBytes(file.size)}</p>

                <p>Converted size: {formatBytes(result.blob.size)}</p>

                <p>
                Dimensions: {result.width} × {result.height}
                </p>

                {result.blob.size > file.size && (
                <div
                    style={{
                    marginTop: "15px",
                    marginBottom: "15px",
                    padding: "14px",
                    backgroundColor: "#fff7ed",
                    border: "1px solid #fed7aa",
                    borderRadius: "8px",
                    color: "#9a3412",
                    fontSize: "14px",
                    lineHeight: "1.6",
                    }}
                >
                    <strong>ℹ️ File Size Notice</strong>

                    <p style={{ marginTop: "6px", marginBottom: 0 }}>
                    The converted image is larger than the original.
                    Image conversion changes the file format but does not
                    necessarily reduce file size. PNG files, in particular,
                    may be larger than JPG files because PNG uses lossless
                    compression.
                    </p>
                </div>
                )}

                {result.blob.size < file.size && (
                <p
                    style={{
                    marginTop: "12px",
                    color: "#15803d",
                    fontWeight: "600",
                    }}
                >
                    ✓ File size reduced by{" "}
                    {(
                    ((file.size - result.blob.size) / file.size) *
                    100
                    ).toFixed(1)}
                    %
                </p>
                )}

            <button
              type="button"
              onClick={downloadImage}
              style={{
                width: "100%",
                padding: "14px",
                background: "#5b50f0",
                color: "#fff",
                border: "none",
                borderRadius: "8px",
                cursor: "pointer",
                fontWeight: "bold",
              }}
            >
              <Download
                size={16}
                style={{ verticalAlign: "middle" }}
              />
              {" "}Download Image
            </button>
          </div>
        )}

        <p
          style={{
            marginTop: "25px",
            fontSize: "12px",
            color: "#64748b",
          }}
        >
          Your image is processed directly in your browser and is not
          uploaded to FileToolkit servers.
        </p>
      </div>
    </main>
  );
}