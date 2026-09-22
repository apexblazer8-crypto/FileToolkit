import { useState } from "react";

import {
  FileText,
  FileImage,
  Files,
  Scissors,
  Minimize2,
  Lock,
  Unlock,
  Image,
  FileSpreadsheet,
  Presentation,
  ArrowRight,
  Menu,
  X,
} from "lucide-react";

import JpgToPdf from "./components/JpgToPdf";
import MergePdf from "./components/MergePdf";
import SplitPdf from "./components/SplitPdf";
import CompressPdf from "./components/CompressPdf";
import PdfToWord from "./components/PdfToWord";
import WordToPdf from "./components/WordToPdf";

import "./App.css";

// ==========================================
// AVAILABLE TOOLS
// ==========================================

const tools = [
  {
    title: "Merge PDF",
    description: "Combine multiple PDF files into one document.",
    icon: Files,
    category: "PDF",
  },
  {
    title: "Split PDF",
    description: "Extract selected pages from PDF documents.",
    icon: Scissors,
    category: "PDF",
  },
  {
    title: "Compress PDF",
    description: "Reduce PDF file size while maintaining quality.",
    icon: Minimize2,
    category: "PDF",
  },
  {
    title: "PDF to Word",
    description: "Convert PDF documents into editable Word files.",
    icon: FileText,
    category: "PDF",
  },
  {
    title: "Word to PDF",
    description: "Convert Word documents into PDF format.",
    icon: FileText,
    category: "PDF",
  },
  {
    title: "JPG to PDF",
    description: "Convert your images into PDF documents.",
    icon: FileImage,
    category: "PDF",
  },
  {
    title: "Lock PDF",
    description: "Protect PDF documents with a password.",
    icon: Lock,
    category: "PDF",
  },
  {
    title: "Unlock PDF",
    description: "Remove PDF password protection when authorized.",
    icon: Unlock,
    category: "PDF",
  },
  {
    title: "Compress Image",
    description: "Reduce image size without losing much quality.",
    icon: Image,
    category: "Image",
  },
  {
    title: "JPG to PNG",
    description: "Convert JPG images into PNG format.",
    icon: FileImage,
    category: "Image",
  },
  {
    title: "Excel to PDF",
    description: "Convert spreadsheets into PDF documents.",
    icon: FileSpreadsheet,
    category: "Office",
  },
  {
    title: "PowerPoint to PDF",
    description: "Convert presentations into PDF documents.",
    icon: Presentation,
    category: "Office",
  },
];

// ==========================================
// MAIN APPLICATION
// ==========================================

function App() {

  // Selected category
  const [activeCategory, setActiveCategory] = useState("All");

  // Selected tool
  const [selectedTool, setSelectedTool] = useState(null);

  // Search input
  const [search, setSearch] = useState("");

  // Mobile navigation
  const [menuOpen, setMenuOpen] = useState(false);

  const categories = ["All", "PDF", "Image", "Office"];

  // ==========================================
  // FILTER TOOLS
  // ==========================================

  const filteredTools = tools.filter((tool) => {

    const matchesCategory =
      activeCategory === "All" ||
      tool.category === activeCategory;

    const matchesSearch = tool.title
      .toLowerCase()
      .includes(search.toLowerCase());

    return matchesCategory && matchesSearch;

  });

  // ==========================================
  // OPEN SELECTED TOOL
  // ==========================================

  const handleOpenTool = (toolTitle) => {
  if (
    toolTitle === "JPG to PDF" ||
    toolTitle === "Merge PDF" ||
    toolTitle === "Split PDF" ||
    toolTitle === "Compress PDF" ||
    toolTitle === "Word to PDF" ||
    toolTitle === "PDF to Word"
  ) {
    setSelectedTool(toolTitle);
    window.scrollTo(0, 0);
  } else {
    alert(`${toolTitle} is coming soon!`);
  }
};

  // ==========================================
  // BACK TO HOMEPAGE
  // ==========================================

  const handleBackToHome = () => {

    setSelectedTool(null);

    window.scrollTo(0, 0);

  };

  // ==========================================
  // RENDER APPLICATION
  // ==========================================

  return (

    <div className="app">

      {/* =====================================
          HEADER
      ===================================== */}

      <header className="header">

        <div className="header-inner">

          {/* LOGO */}

          <div className="logo">

            <div className="logo-icon">
              <Files size={23} />
            </div>

            <span>
              File
              <span className="logo-highlight">
                Toolkit
              </span>
            </span>

          </div>

          {/* NAVIGATION */}

          <nav className={menuOpen ? "nav nav-open" : "nav"}>

            <a
              href="#home"
              onClick={() => {
                handleBackToHome();
                setMenuOpen(false);
              }}
            >
              Home
            </a>

            <a
              href="#tools"
              onClick={() => {
                handleBackToHome();
                setMenuOpen(false);
              }}
            >
              All Tools
            </a>

            <a
              href="#pricing"
              onClick={() => {
                handleBackToHome();
                setMenuOpen(false);
              }}
            >
              Pricing
            </a>

          </nav>

          {/* HEADER BUTTONS */}

          <div className="header-actions">

            <button
              className="login-btn"
              type="button"
              onClick={() => alert("Login coming soon!")}
            >
              Login
            </button>

            <button
              className="signup-btn"
              type="button"
              onClick={() => alert("Registration coming soon!")}
            >
              Get Started
            </button>

          </div>

          {/* MOBILE MENU */}

          <button
            className="menu-btn"
            type="button"
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label="Toggle navigation"
          >

            {menuOpen ? <X /> : <Menu />}

          </button>

        </div>

      </header>

      {/* =====================================
          CONDITIONAL PAGE RENDERING
      ===================================== */}

      {selectedTool === "JPG to PDF" ? (
  <JpgToPdf onBack={handleBackToHome} />
) : selectedTool === "Merge PDF" ? (
  <MergePdf onBack={handleBackToHome} />
) : selectedTool === "Split PDF" ? (
  <SplitPdf onBack={handleBackToHome} />
) : selectedTool === "Compress PDF" ? (
  <CompressPdf onBack={handleBackToHome} />
) : selectedTool === "PDF to Word" ? (
  <PdfToWord onBack={handleBackToHome} />
) : selectedTool === "Word to PDF" ? (
  <WordToPdf onBack={handleBackToHome} />
) : (

        // =====================================
        // HOMEPAGE
        // =====================================

        <>

          {/* =====================================
              HERO SECTION
          ===================================== */}

          <section className="hero" id="home">

            <div className="hero-badge">
              Your All-in-One File Solution
            </div>

            <h1>

              Every File Tool You Need.

              <br />

              <span>
                All in One Place.
              </span>

            </h1>

            <p>

              Convert, compress, merge, split and manage your
              documents effortlessly. Fast, secure and simple.

            </p>

            <a
              href="#tools"
              className="hero-button"
            >

              Explore All Tools

              <ArrowRight size={19} />

            </a>

            <div className="hero-features">

              <span>
                ✓ Easy to Use
              </span>

              <span>
                ✓ Fast Processing
              </span>

              <span>
                ✓ No Installation Required
              </span>

            </div>

          </section>

          {/* =====================================
              TOOLS SECTION
          ===================================== */}

          <section
            className="tools-section"
            id="tools"
          >

            <div className="section-heading">

              <h2>
                All the tools you need
              </h2>

              <p>
                Powerful tools to make working with files easier.
              </p>

            </div>

            {/* CATEGORY FILTER AND SEARCH */}

            <div className="tools-controls">

              <div className="categories">

                {categories.map((category) => (

                  <button
                    key={category}
                    type="button"
                    className={
                      activeCategory === category
                        ? "category active"
                        : "category"
                    }
                    onClick={() => setActiveCategory(category)}
                  >

                    {category === "All"
                      ? "All Tools"
                      : `${category} Tools`}

                  </button>

                ))}

              </div>

              {/* SEARCH */}

              <input
                type="text"
                placeholder="Search tools..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="search-input"
              />

            </div>

            {/* =====================================
                TOOLS GRID
            ===================================== */}

            <div className="tools-grid">

              {filteredTools.map((tool) => {

                const Icon = tool.icon;

                return (

                  <div
                    className="tool-card"
                    key={tool.title}
                  >

                    {/* TOOL ICON */}

                    <div className="tool-icon">

                      <Icon size={27} />

                    </div>

                    {/* TOOL TITLE */}

                    <h3>
                      {tool.title}
                    </h3>

                    {/* TOOL DESCRIPTION */}

                    <p>
                      {tool.description}
                    </p>

                    {/* USE TOOL BUTTON */}

                    <button
                      className="tool-link"
                      type="button"
                      onClick={() => handleOpenTool(tool.title)}
                    >

                      Use Tool

                      <ArrowRight size={16} />

                    </button>

                  </div>

                );

              })}

            </div>

            {/* EMPTY SEARCH RESULT */}

            {filteredTools.length === 0 && (

              <p className="empty-state">

                No tools found. Try another search.

              </p>

            )}

          </section>

          {/* =====================================
              BOTTOM CTA SECTION
          ===================================== */}

          <section
            className="bottom-cta"
            id="pricing"
          >

            <h2>
              Make file management effortless
            </h2>

            <p>

              Everything you need to work with documents
              in one convenient place.

            </p>

            <a href="#tools">

              Start Using Our Tools

              <ArrowRight size={18} />

            </a>

          </section>

        </>

      )}

      {/* =====================================
          FOOTER
      ===================================== */}

      <footer className="footer">

        <div className="footer-inner">

          <div className="footer-brand">

            <Files size={22} />

            FileToolkit

          </div>

          <p>

            © {new Date().getFullYear()} FileToolkit.
            All rights reserved.

          </p>

        </div>

      </footer>

    </div>

  );

}

export default App;