import { useRef, useState } from "react";

import {
  ArrowLeft,
  Upload,
  FileSpreadsheet,
  Download,
  Trash2,
  CheckCircle2,
} from "lucide-react";

import ExcelJS from "exceljs";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

const MAX_FILE_SIZE = 20 * 1024 * 1024;
const MAX_ROWS = 5000;
const MAX_COLUMNS = 40;
const PREVIEW_LIMIT = 10;

function formatSize(bytes) {
  if (bytes < 1024) {
    return `${bytes} B`;
  }

  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(2)} KB`;
  }

  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function cellToText(cell) {
  if (!cell) {
    return "";
  }

  if (
    cell.text !== undefined &&
    cell.text !== null
  ) {
    return String(cell.text);
  }

  const value = cell.value;

  if (
    value === null ||
    value === undefined
  ) {
    return "";
  }

  if (value instanceof Date) {
    return value.toLocaleDateString();
  }

  if (typeof value === "object") {
    if (value.text !== undefined) {
      return String(value.text);
    }

    if (value.result !== undefined) {
      return String(value.result ?? "");
    }

    if (value.richText) {
      return value.richText
        .map((part) => part.text || "")
        .join("");
    }

    return "";
  }

  return String(value);
}

function getSheetData(worksheet) {
  const rows = [];

  let columnCount = 0;

  worksheet.eachRow(
    { includeEmpty: false },
    (row) => {
      columnCount = Math.max(
        columnCount,
        row.cellCount
      );
    }
  );

  if (columnCount > MAX_COLUMNS) {
    throw new Error(
      `"${worksheet.name}" has more than ${MAX_COLUMNS} columns. Please reduce the number of columns before conversion.`
    );
  }

  if (worksheet.rowCount > MAX_ROWS) {
    throw new Error(
      `"${worksheet.name}" has more than ${MAX_ROWS} rows. Please split the worksheet into smaller files.`
    );
  }

  if (columnCount === 0) {
    return [];
  }

  for (
    let rowNumber = 1;
    rowNumber <= worksheet.rowCount;
    rowNumber++
  ) {
    const row = worksheet.getRow(rowNumber);

    const values = [];

    for (
      let columnNumber = 1;
      columnNumber <= columnCount;
      columnNumber++
    ) {
      values.push(
        cellToText(
          row.getCell(columnNumber)
        )
      );
    }

    rows.push(values);
  }

  while (
    rows.length > 0 &&
    rows[rows.length - 1].every(
      (value) => !value.trim()
    )
  ) {
    rows.pop();
  }

  return rows;
}

/*
 * Estimate relative column widths.
 *
 * Columns containing longer values receive
 * more space than columns containing short
 * values, while all columns still fit inside
 * the available PDF page width.
 */
function calculateColumnWidths(
  data,
  availableWidth
) {
  if (!data.length) {
    return {};
  }

  const columnCount = data[0].length;

  if (columnCount === 0) {
    return {};
  }

  const weights = Array.from(
    { length: columnCount },
    () => 8
  );

  const sampleRows = data.slice(0, 100);

  for (const row of sampleRows) {
    for (
      let columnIndex = 0;
      columnIndex < columnCount;
      columnIndex++
    ) {
      const text = String(
        row[columnIndex] ?? ""
      );

      const longestLine = text
        .split(/\r?\n/)
        .reduce(
          (longest, line) =>
            Math.max(
              longest,
              line.length
            ),
          0
        );

      /*
       * Cap the weight so a single very long
       * value cannot consume the whole page.
       */
      const estimatedWidth = Math.min(
        Math.max(longestLine, 8),
        28
      );

      weights[columnIndex] = Math.max(
        weights[columnIndex],
        estimatedWidth
      );
    }
  }

  const totalWeight = weights.reduce(
    (sum, weight) => sum + weight,
    0
  );

  const columnStyles = {};

  weights.forEach((weight, index) => {
    columnStyles[index] = {
      cellWidth:
        (weight / totalWeight) *
        availableWidth,
    };
  });

  return columnStyles;
}

function getFontSize(
  columnCount,
  fitColumns
) {
  if (!fitColumns) {
    return 8;
  }

  if (columnCount <= 8) {
    return 8;
  }

  if (columnCount <= 12) {
    return 7;
  }

  if (columnCount <= 18) {
    return 6;
  }

  if (columnCount <= 25) {
    return 5;
  }

  return 4;
}

function downloadPdf(
  pdf,
  filename
) {
  pdf.save(filename);
}

export default function ExcelToPdf({
  onBack,
}) {
  const fileInputRef = useRef(null);

  const [selectedFile, setSelectedFile] =
    useState(null);

  const [workbook, setWorkbook] =
    useState(null);

  const [sheetNames, setSheetNames] =
    useState([]);

  const [selectedSheet, setSelectedSheet] =
    useState("all");

  const [previewRows, setPreviewRows] =
    useState([]);

  const [pageSize, setPageSize] =
    useState("a4");

  const [orientation, setOrientation] =
    useState("landscape");

  /*
   * New setting:
   * Fit all worksheet columns across
   * the width of one PDF page.
   */
  const [fitColumns, setFitColumns] =
    useState(true);

  const [outputName, setOutputName] =
    useState("");

  const [isLoading, setIsLoading] =
    useState(false);

  const [isConverting, setIsConverting] =
    useState(false);

  const [error, setError] =
    useState("");

  const [success, setSuccess] =
    useState("");

  const removeFile = () => {
    if (
      isLoading ||
      isConverting
    ) {
      return;
    }

    setSelectedFile(null);
    setWorkbook(null);
    setSheetNames([]);
    setSelectedSheet("all");
    setPreviewRows([]);
    setOutputName("");
    setError("");
    setSuccess("");

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const updatePreview = (
    currentWorkbook,
    sheetSelection
  ) => {
    if (!currentWorkbook) {
      setPreviewRows([]);
      return;
    }

    const worksheet =
      sheetSelection === "all"
        ? currentWorkbook.worksheets[0]
        : currentWorkbook.getWorksheet(
            sheetSelection
          );

    if (!worksheet) {
      setPreviewRows([]);
      return;
    }

    const data = getSheetData(
      worksheet
    );

    setPreviewRows(
      data.slice(
        0,
        PREVIEW_LIMIT
      )
    );
  };

  const handleFile = async (file) => {
    if (
      !file ||
      isLoading ||
      isConverting
    ) {
      return;
    }

    removeFile();

    if (
      !file.name
        .toLowerCase()
        .endsWith(".xlsx")
    ) {
      setError(
        "Please select an .xlsx Excel workbook. Older .xls files are not supported yet."
      );

      return;
    }

    if (
      file.size > MAX_FILE_SIZE
    ) {
      setError(
        "Maximum supported Excel file size is 20 MB."
      );

      return;
    }

    setIsLoading(true);
    setError("");

    try {
      const bytes =
        await file.arrayBuffer();

      const loadedWorkbook =
        new ExcelJS.Workbook();

      await loadedWorkbook.xlsx.load(
        bytes
      );

      if (
        loadedWorkbook.worksheets
          .length === 0
      ) {
        throw new Error(
          "No worksheets were found in this workbook."
        );
      }

      const names =
        loadedWorkbook.worksheets.map(
          (sheet) => sheet.name
        );

      /*
       * Validate the preview worksheet
       * before saving the loaded workbook.
       */
      const firstWorksheet =
        loadedWorkbook.worksheets[0];

      const firstSheetData =
        getSheetData(
          firstWorksheet
        );

      setWorkbook(
        loadedWorkbook
      );

      setSelectedFile(
        file
      );

      setSheetNames(
        names
      );

      setSelectedSheet(
        "all"
      );

      setOutputName(
        file.name.replace(
          /\.xlsx$/i,
          ""
        ) + "-Converted"
      );

      setPreviewRows(
        firstSheetData.slice(
          0,
          PREVIEW_LIMIT
        )
      );
    } catch (err) {
      console.error(err);

      setError(
        err.message ||
          "Unable to read this Excel workbook."
      );
    } finally {
      setIsLoading(false);
    }
  };

  const convertExcelToPdf = async () => {
    if (
      !workbook ||
      !selectedFile ||
      isLoading ||
      isConverting
    ) {
      return;
    }

    setIsConverting(true);
    setError("");
    setSuccess("");

    try {
      const sheets =
        selectedSheet === "all"
          ? workbook.worksheets
          : [
              workbook.getWorksheet(
                selectedSheet
              ),
            ];

      const pdf = new jsPDF({
        orientation,
        unit: "mm",
        format: pageSize,
        compress: true,
      });

      const pageWidth =
        pdf.internal.pageSize.getWidth();

      const margin = 12;

      const availableWidth =
        pageWidth -
        margin * 2;

      let hasContent = false;

      for (const worksheet of sheets) {
        if (!worksheet) {
          continue;
        }

        const data =
          getSheetData(
            worksheet
          );

        if (
          data.length === 0
        ) {
          continue;
        }

        const columnCount =
          Math.max(
            ...data.map(
              (row) =>
                row.length
            )
          );

        if (
          columnCount === 0
        ) {
          continue;
        }

        const normalizedRows =
          data.map(
            (row) =>
              Array.from(
                {
                  length:
                    columnCount,
                },
                (_, index) =>
                  row[index] ?? ""
              )
          );

        /*
         * Start each worksheet
         * on a new PDF page.
         */
        if (hasContent) {
          pdf.addPage();
        }

        hasContent = true;

        pdf.setFont(
          "helvetica",
          "bold"
        );

        pdf.setFontSize(14);

        /*
         * Prevent exceptionally long
         * worksheet names from extending
         * outside the page.
         */
        const titleLines =
          pdf.splitTextToSize(
            worksheet.name,
            availableWidth
          );

        pdf.text(
          titleLines,
          margin,
          17
        );

        pdf.setFont(
          "helvetica",
          "normal"
        );

        const titleHeight =
          titleLines.length * 6;

        const tableStartY =
          17 +
          titleHeight;

        const fontSize =
          getFontSize(
            columnCount,
            fitColumns
          );

        /*
         * Main improvement:
         *
         * When fitColumns is enabled,
         * calculate a width for every
         * column so their total equals
         * the available page width.
         *
         * Disable horizontal page breaks
         * in this mode.
         */
        const columnStyles =
          fitColumns
            ? calculateColumnWidths(
                normalizedRows,
                availableWidth
              )
            : {};

        autoTable(pdf, {
          startY:
            tableStartY,

          body:
            normalizedRows,

          margin: {
            left:
              margin,

            right:
              margin,

            top:
              15,

            bottom:
              15,
          },

          theme:
            "grid",

          styles: {
            font:
              "helvetica",

            fontSize,

            cellPadding:
              fitColumns
                ? 1
                : 2,

            overflow:
              "linebreak",

            valign:
              "top",

            lineWidth:
              0.1,
          },

          /*
           * Fit mode:
           * use the exact page width.
           *
           * Original mode:
           * allow autoTable to calculate
           * its own column widths.
           */
          tableWidth:
            fitColumns
              ? availableWidth
              : "auto",

          columnStyles,

          /*
           * IMPORTANT:
           *
           * Do not split columns
           * horizontally when fitting
           * all columns on one page.
           */
          horizontalPageBreak:
            !fitColumns,

          horizontalPageBreakRepeat:
            fitColumns
              ? undefined
              : 0,

          /*
           * Rows can continue onto
           * additional pages.
           */
          pageBreak:
            "auto",

          rowPageBreak:
            "auto",

          showHead:
            "never",
        });
      }

      if (!hasContent) {
        throw new Error(
          "The selected worksheet does not contain any data."
        );
      }

      const safeName =
        outputName
          .trim()
          .replace(
            /\.pdf$/i,
            ""
          )
          .replace(
            /[<>:"/\\|?*\u0000-\u001F]/g,
            ""
          ) ||
        "FileToolkit-Converted";

      downloadPdf(
        pdf,
        `${safeName}.pdf`
      );

      setSuccess(
        "Excel workbook converted and PDF downloaded successfully!"
      );
    } catch (err) {
      console.error(err);

      setError(
        err.message ||
          "Unable to convert Excel to PDF."
      );
    } finally {
      setIsConverting(false);
    }
  };

  return (
    <main className="converter-page">
      <button
        className="back-button"
        type="button"
        onClick={onBack}
        disabled={
          isLoading ||
          isConverting
        }
      >
        <ArrowLeft size={17} />

        Back to All Tools
      </button>

      <div className="converter-header">
        <h1>
          Excel to PDF
        </h1>

        <p>
          Convert Excel worksheets
          into PDF documents.
        </p>
      </div>

      <div
        className="upload-area"
        onDragOver={(
          event
        ) => {
          event.preventDefault();
        }}
        onDrop={(
          event
        ) => {
          event.preventDefault();

          handleFile(
            event.dataTransfer
              .files[0]
          );
        }}
      >
        <Upload size={42} />

        <h3>
          Select Excel Workbook
        </h3>

        <p>
          Drag and drop an XLSX
          file or select a file.
        </p>

        <input
          ref={fileInputRef}
          type="file"
          accept=".xlsx"
          hidden
          disabled={
            isLoading ||
            isConverting
          }
          onChange={(
            event
          ) => {
            handleFile(
              event.target
                .files[0]
            );
          }}
        />

        <button
          className="upload-button"
          type="button"
          disabled={
            isLoading ||
            isConverting
          }
          onClick={() => {
            fileInputRef.current?.click();
          }}
        >
          {isLoading
            ? "Loading Excel..."
            : "Select Excel"}
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
              <h3>
                Selected Excel
              </h3>

              <button
                className="remove-image"
                type="button"
                onClick={
                  removeFile
                }
                disabled={
                  isLoading ||
                  isConverting
                }
              >
                <Trash2 size={16} />

                Remove Excel
              </button>
            </div>

            <div className="pdf-settings">
              <div
                style={{
                  textAlign:
                    "center",
                }}
              >
                <FileSpreadsheet
                  size={42}
                  color="#5b55f7"
                />

                <h3>
                  {
                    selectedFile.name
                  }
                </h3>

                <p>
                  File Size:{" "}
                  {formatSize(
                    selectedFile.size
                  )}
                </p>

                <p>
                  Worksheets:{" "}
                  {
                    sheetNames.length
                  }
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
                htmlFor="excel-sheet"
              >
                Worksheets to Convert
              </label>

              <select
                id="excel-sheet"
                value={
                  selectedSheet
                }
                disabled={
                  isConverting
                }
                onChange={(
                  event
                ) => {
                  const value =
                    event.target.value;

                  setSelectedSheet(
                    value
                  );

                  try {
                    updatePreview(
                      workbook,
                      value
                    );

                    setError("");
                  } catch (
                    err
                  ) {
                    setError(
                      err.message
                    );
                  }
                }}
              >
                <option value="all">
                  All Worksheets
                </option>

                {sheetNames.map(
                  (name) => (
                    <option
                      key={name}
                      value={name}
                    >
                      {name}
                    </option>
                  )
                )}
              </select>
            </div>

            <div className="setting-field">
              <label
                htmlFor="excel-page-size"
              >
                Page Size
              </label>

              <select
                id="excel-page-size"
                value={
                  pageSize
                }
                disabled={
                  isConverting
                }
                onChange={(
                  event
                ) => {
                  setPageSize(
                    event.target.value
                  );
                }}
              >
                <option value="a4">
                  A4
                </option>

                <option value="a3">
                  A3
                </option>
              </select>
            </div>

            <div className="setting-field">
              <label
                htmlFor="excel-orientation"
              >
                Orientation
              </label>

              <select
                id="excel-orientation"
                value={
                  orientation
                }
                disabled={
                  isConverting
                }
                onChange={(
                  event
                ) => {
                  setOrientation(
                    event.target.value
                  );
                }}
              >
                <option value="portrait">
                  Portrait
                </option>

                <option value="landscape">
                  Landscape
                </option>
              </select>
            </div>

            {/* NEW: Column fitting setting */}

            <div className="setting-field">
              <label
                htmlFor="excel-fit-columns"
              >
                PDF Layout
              </label>

              <select
                id="excel-fit-columns"
                value={
                  fitColumns
                    ? "fit"
                    : "split"
                }
                disabled={
                  isConverting
                }
                onChange={(
                  event
                ) => {
                  setFitColumns(
                    event.target.value ===
                      "fit"
                  );
                }}
              >
                <option value="fit">
                  Fit All Columns on One Page
                </option>

                <option value="split">
                  Split Wide Worksheets Across Pages
                </option>
              </select>

              <p
                style={{
                  color:
                    "#64748b",
                  marginTop:
                    "8px",
                  fontSize:
                    "12px",
                }}
              >
                {fitColumns
                  ? "All columns will fit across the selected page width. Rows can continue onto additional pages."
                  : "Wide worksheets may be split into separate groups of columns."}
              </p>
            </div>

            <div className="setting-field">
              <label
                htmlFor="excel-output-name"
              >
                Output Filename
              </label>

              <input
                id="excel-output-name"
                type="text"
                value={
                  outputName
                }
                disabled={
                  isConverting
                }
                onChange={(
                  event
                ) => {
                  setOutputName(
                    event.target.value
                  );
                }}
              />
            </div>
          </div>

          {previewRows.length > 0 && (
            <div className="pdf-settings">
              <h3>
                Worksheet Preview
              </h3>

              <p>
                Showing the first{" "}
                {PREVIEW_LIMIT} rows
                of the selected preview
                worksheet.
              </p>

              <div
                style={{
                  overflowX:
                    "auto",
                  marginTop:
                    "15px",
                }}
              >
                <table
                  style={{
                    width:
                      "100%",
                    borderCollapse:
                      "collapse",
                    fontSize:
                      "12px",
                  }}
                >
                  <tbody>
                    {previewRows.map(
                      (
                        row,
                        rowIndex
                      ) => (
                        <tr
                          key={
                            rowIndex
                          }
                        >
                          {row.map(
                            (
                              value,
                              colIndex
                            ) => (
                              <td
                                key={
                                  colIndex
                                }
                                style={{
                                  border:
                                    "1px solid #e2e8f0",
                                  padding:
                                    "8px",
                                }}
                              >
                                {
                                  value
                                }
                              </td>
                            )
                          )}
                        </tr>
                      )
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <button
            className="convert-button"
            type="button"
            disabled={
              isLoading ||
              isConverting
            }
            onClick={
              convertExcelToPdf
            }
          >
            <Download size={18} />

            {isConverting
              ? "Converting..."
              : "Convert to PDF"}
          </button>

          {success && (
            <div className="converter-success">
              <CheckCircle2
                size={20}
              />

              {success}
            </div>
          )}
        </>
      )}

      <p className="converter-privacy">
        Your Excel workbook is
        processed directly in
        your browser and is not
        uploaded to our servers.
      </p>
    </main>
  );
}