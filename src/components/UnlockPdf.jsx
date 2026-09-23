import { useState } from "react";
import { PDFDocument } from "@cantoo/pdf-lib";
import { ArrowLeft, Download, Unlock, Upload } from "lucide-react";

function UnlockPdf({ onBack }) {
  const [selectedFile, setSelectedFile] = useState(null);
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const handleFileChange = (event) => {
    const file = event.target.files?.[0];

    setError("");
    setSuccess(false);

    if (!file) {
      setSelectedFile(null);
      return;
    }

    if (!file.name.toLowerCase().endsWith(".pdf")) {
      setError("Please select a PDF file.");
      setSelectedFile(null);
      return;
    }

    setSelectedFile(file);
  };

  const handleUnlockPdf = async () => {
    if (!selectedFile || isProcessing) return;

    setError("");
    setSuccess(false);

    if (!password) {
      setError("Please enter the PDF's existing password.");
      return;
    }

    setIsProcessing(true);

    try {
      const inputBytes = new Uint8Array(
        await selectedFile.arrayBuffer()
      );

      const pdfDoc = await PDFDocument.load(inputBytes, {
        password,
      });

      const unlockedBytes = await pdfDoc.save();

      const blob = new Blob([unlockedBytes], {
        type: "application/pdf",
      });

      const url = URL.createObjectURL(blob);

      const link = document.createElement("a");

      link.href = url;

      link.download = `${selectedFile.name.replace(
        /\.pdf$/i,
        ""
      )}-Unlocked.pdf`;

      document.body.appendChild(link);

      link.click();

      link.remove();

      setTimeout(() => {
        URL.revokeObjectURL(url);
      }, 1000);

      setSuccess(true);
    } catch (err) {
      console.error("Unlock PDF error:", err);

      setError(
        "Unable to unlock this PDF. Check the password and ensure the PDF uses a supported encryption format."
      );
    } finally {
      setIsProcessing(false);
    }
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
          background: "white",
          border: "1px solid #e5e7eb",
          borderRadius: "16px",
          padding: "35px",
        }}
      >
        <Unlock size={36} color="#6258f5" />

        <h1>Unlock PDF</h1>

        <p>
          Remove password protection from a PDF using its
          existing password.
        </p>

        <div style={{ marginTop: "30px" }}>
          <label>
            <strong>Select Protected PDF</strong>
          </label>

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
              accept=".pdf,application/pdf"
              onChange={handleFileChange}
              style={{
                display: "block",
                margin: "15px auto",
                maxWidth: "100%",
              }}
            />

            {selectedFile && (
              <p>
                Selected: <strong>{selectedFile.name}</strong>
              </p>
            )}
          </div>
        </div>

        <div style={{ marginTop: "25px" }}>
          <label htmlFor="unlock-password">
            <strong>Existing PDF Password</strong>
          </label>

          <input
            id="unlock-password"
            type={showPassword ? "text" : "password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter existing password"
            autoComplete="off"
            style={inputStyle}
          />
        </div>

        <label
          style={{
            display: "flex",
            gap: "8px",
            marginTop: "15px",
          }}
        >
          <input
            type="checkbox"
            checked={showPassword}
            onChange={(e) =>
              setShowPassword(e.target.checked)
            }
          />

          Show password
        </label>

        {error && (
          <p style={{ color: "#dc2626", marginTop: "20px" }}>
            {error}
          </p>
        )}

        {success && (
          <p style={{ color: "#16a34a", marginTop: "20px" }}>
            PDF unlocked successfully! Check your downloads.
          </p>
        )}

        <button
          type="button"
          onClick={handleUnlockPdf}
          disabled={!selectedFile || isProcessing}
          style={buttonStyle}
        >
          <Download size={18} />

          {isProcessing
            ? "Unlocking PDF..."
            : "Unlock PDF & Download"}
        </button>

        <p
          style={{
            color: "#64748b",
            fontSize: "13px",
            marginTop: "20px",
          }}
        >
          Your document and password are processed directly
          in your browser.
        </p>
      </div>
    </main>
  );
}

const inputStyle = {
  width: "100%",
  padding: "14px",
  marginTop: "10px",
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
  marginTop: "30px",
  padding: "16px",
  background: "#6258f5",
  color: "white",
  border: "none",
  borderRadius: "10px",
  fontSize: "16px",
  fontWeight: "600",
  cursor: "pointer",
};

export default UnlockPdf;