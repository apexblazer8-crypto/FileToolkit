import { useState } from "react";
import { PDFDocument } from "@cantoo/pdf-lib";
import { ArrowLeft, Download, Lock, Upload } from "lucide-react";

function LockPdf({ onBack }) {
  const [selectedFile, setSelectedFile] = useState(null);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
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

  const handleLockPdf = async () => {
    if (!selectedFile || isProcessing) return;

    setError("");
    setSuccess(false);

    if (!password) {
      setError("Please enter a password.");
      return;
    }

    if (password.length < 8) {
      setError("Password must contain at least 8 characters.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setIsProcessing(true);

    try {
      const inputBytes = new Uint8Array(
        await selectedFile.arrayBuffer()
      );

      const pdfDoc = await PDFDocument.load(inputBytes);

                // Apply password protection to the PDF
            pdfDoc.encrypt({
            userPassword: password,
            ownerPassword: password,
            });

// Save the encrypted PDF
const encryptedBytes = await pdfDoc.save();

      const blob = new Blob([encryptedBytes], {
        type: "application/pdf",
      });

      const url = URL.createObjectURL(blob);

      const link = document.createElement("a");

      link.href = url;

      link.download = `${selectedFile.name.replace(
        /\.pdf$/i,
        ""
      )}-Locked.pdf`;

      document.body.appendChild(link);

      link.click();

      link.remove();

      setTimeout(() => {
        URL.revokeObjectURL(url);
      }, 1000);

      setSuccess(true);
    } catch (err) {
      console.error("Lock PDF error:", err);

      setError(
        "Unable to lock this PDF. Make sure it is a valid, unprotected PDF."
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
        <Lock size={36} color="#6258f5" />

        <h1>Lock PDF</h1>

        <p>
          Protect your PDF document with a password.
        </p>

        <div style={{ marginTop: "30px" }}>
          <label>
            <strong>Select PDF</strong>
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
          <label htmlFor="lock-password">
            <strong>Password</strong>
          </label>

          <input
            id="lock-password"
            type={showPassword ? "text" : "password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter password"
            autoComplete="new-password"
            style={inputStyle}
          />
        </div>

        <div style={{ marginTop: "20px" }}>
          <label htmlFor="confirm-lock-password">
            <strong>Confirm Password</strong>
          </label>

          <input
            id="confirm-lock-password"
            type={showPassword ? "text" : "password"}
            value={confirmPassword}
            onChange={(e) =>
              setConfirmPassword(e.target.value)
            }
            placeholder="Confirm password"
            autoComplete="new-password"
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

          Show passwords
        </label>

        {error && (
          <p style={{ color: "#dc2626", marginTop: "20px" }}>
            {error}
          </p>
        )}

        {success && (
          <p style={{ color: "#16a34a", marginTop: "20px" }}>
            PDF locked successfully! Check your downloads.
          </p>
        )}

        <button
          type="button"
          onClick={handleLockPdf}
          disabled={!selectedFile || isProcessing}
          style={buttonStyle}
        >
          <Download size={18} />

          {isProcessing
            ? "Protecting PDF..."
            : "Lock PDF & Download"}
        </button>

        <p
          style={{
            color: "#64748b",
            fontSize: "13px",
            marginTop: "20px",
          }}
        >
          Your document is processed directly in your browser.
          Remember your password because FileToolkit does not
          store or recover it.
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

export default LockPdf;