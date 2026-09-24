import { useEffect, useState } from "react";

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
  Search,
  Sparkles,
  ShieldCheck,
  Zap,
  ArrowUpRight,
  CheckCircle2,
} from "lucide-react";

import JpgToPdf from "./components/JpgToPdf";
import MergePdf from "./components/MergePdf";
import SplitPdf from "./components/SplitPdf";
import CompressPdf from "./components/CompressPdf";
import PdfToWord from "./components/PdfToWord";
import WordToPdf from "./components/WordToPdf";
import LockPdf from "./components/LockPdf";
import UnlockPdf from "./components/UnlockPdf";
import CompressImage from "./components/CompressImage";
import ImageConverter from "./components/ImageConverter";
import PdfToJpg from "./components/PdfToJpg";
import PdfToPng from "./components/PdfToPng";
import ExcelToPdf from "./components/ExcelToPdf";
import PowerPointToPdf from "./components/PowerPointToPdf";
import PowerPointToImages from "./components/PowerPointToImages";

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
    title: "PDF to JPG",
    description: "Convert PDF pages into high-quality JPG images.",
    icon: FileImage,
    category: "PDF",
  },

  {
    title: "PDF to PNG",
    description: "Convert PDF pages into lossless PNG images.",
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
    title: "Image Converter",
    description: "Convert images between JPG, PNG, and WebP formats.",
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
  {
    title: "PowerPoint to Images",
    description: "Export slides as PNG or JPG images.",
    icon: FileImage,
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
  const [showPrivacy, setShowPrivacy] = useState(false);
  const [scrollTarget, setScrollTarget] = useState(null);

  useEffect(() => {
    if (!selectedTool && scrollTarget) {
      document.getElementById(scrollTarget)?.scrollIntoView({ behavior: "smooth" });
      setScrollTarget(null);
    }
  }, [selectedTool, scrollTarget]);

  const navigateTo = (target) => {
    setShowPrivacy(false);
    setMenuOpen(false);
    if (selectedTool) {
      setScrollTarget(target);
      setSelectedTool(null);
    } else {
      document.getElementById(target)?.scrollIntoView({ behavior: "smooth" });
    }
  };

  const categories = ["All", "PDF", "Image", "Office"];
  const availableTools = tools;

  // ==========================================
  // FILTER TOOLS
  // ==========================================

  const filteredTools = availableTools.filter((tool) => {

    const matchesCategory =
      activeCategory === "All" ||
      tool.category === activeCategory;

    // Match words (or the beginning of words), not text inside other words.
    // For example, "word" should not match "password".
    const searchTerms = search.toLowerCase().match(/[a-z0-9]+/g) ?? [];
    const toolWords = `${tool.title} ${tool.description}`
      .toLowerCase()
      .match(/[a-z0-9]+/g) ?? [];
    const matchesSearch = searchTerms.every((term) =>
      toolWords.some((word) => word.startsWith(term))
    );

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
    toolTitle === "PDF to Word" ||
    toolTitle === "Lock PDF" ||
    toolTitle === "Unlock PDF" ||
    toolTitle === "Compress Image" ||
    toolTitle === "Image Converter" ||
    toolTitle === "PDF to JPG" ||
    toolTitle === "PDF to PNG" ||
    toolTitle === "Excel to PDF" ||
    toolTitle === "PowerPoint to PDF" ||
    toolTitle === "PowerPoint to Images"
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

          <nav className={menuOpen ? "nav nav-open" : "nav"} aria-label="Main navigation">
            <a href="#home" onClick={(event) => { event.preventDefault(); navigateTo("home"); }}>Home</a>
            <a href="#tools" onClick={(event) => { event.preventDefault(); navigateTo("tools"); }}>All Tools</a>
            <a href="#how-it-works" onClick={(event) => { event.preventDefault(); navigateTo("how-it-works"); }}>How it works</a>
          </nav>

          <div className="header-actions">
            <button className="signup-btn" type="button" onClick={() => {
              navigateTo("tools");
            }}>
              Explore tools <ArrowUpRight size={17} />
            </button>
          </div>

          {/* MOBILE MENU */}

          <button
            className="menu-btn"
            type="button"
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label={menuOpen ? "Close navigation" : "Open navigation"}
            aria-expanded={menuOpen}
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
) : selectedTool === "Lock PDF" ? (
  <LockPdf onBack={handleBackToHome} />
) : selectedTool === "Unlock PDF" ? (
  <UnlockPdf onBack={handleBackToHome} />
) : selectedTool === "Compress Image" ? (
  <CompressImage onBack={handleBackToHome} />
) : selectedTool === "Image Converter" ? (
  <ImageConverter onBack={handleBackToHome} />
) : selectedTool === "PDF to JPG" ? (
  <PdfToJpg onBack={handleBackToHome} />
) : selectedTool === "PDF to PNG" ? (
  <PdfToPng onBack={handleBackToHome} />
) : selectedTool === "Excel to PDF" ? (
  <ExcelToPdf onBack={handleBackToHome} />
) : selectedTool === "PowerPoint to PDF" ? (
  <PowerPointToPdf onBack={handleBackToHome} />
) : selectedTool === "PowerPoint to Images" ? (
  <PowerPointToImages onBack={handleBackToHome} />
) : (

        // =====================================
        // HOMEPAGE
        // =====================================

        <>

          {/* =====================================
              HERO SECTION
          ===================================== */}

          <section className="hero" id="home">
            <div className="hero-inner">
              <div className="hero-copy">
                <div className="hero-badge"><Sparkles size={15} /> YOUR EVERYDAY FILE WORKSPACE</div>
                <h1>Better files.<br /><span>Less effort.</span></h1>
                <p>Everything you need to convert, compress and organize your PDFs, images and documents — in one simple workspace.</p>
                <div className="hero-actions">
                  <a href="#tools" className="hero-button">Explore all tools <ArrowRight size={19} /></a>
                  <a href="#how-it-works" className="hero-secondary">How it works <ArrowUpRight size={17} /></a>
                </div>
                <div className="hero-features">
                  <span><CheckCircle2 size={16} /> Easy to use</span>
                  <span><CheckCircle2 size={16} /> No installation</span>
                  <span><CheckCircle2 size={16} /> Works in your browser</span>
                </div>
              </div>
              <div className="hero-visual" aria-hidden="true">
                <div className="visual-orbit visual-orbit-one" />
                <div className="visual-orbit visual-orbit-two" />
                <div className="visual-file visual-file-back"><FileImage size={32} /><span>image.png</span></div>
                <div className="visual-file visual-file-front"><FileText size={42} /><strong>Your files,<br />simplified.</strong><span>Convert · Compress · Organize</span></div>
                <div className="visual-floating"><CheckCircle2 size={20} /> Ready to download</div>
                <div className="visual-spark visual-spark-one">✦</div><div className="visual-spark visual-spark-two">✧</div>
              </div>
            </div>
          </section>

          <section className="quick-benefits" aria-label="FileToolkit benefits">
            <div><Zap size={20} /><span><strong>Quick workflows</strong><small>Get from upload to download faster</small></span></div>
            <div><ShieldCheck size={20} /><span><strong>Simple controls</strong><small>Choose the settings that work for you</small></span></div>
            <div><Files size={20} /><span><strong>One convenient place</strong><small>PDF, image and office tools together</small></span></div>
          </section>

          {/* =====================================
              TOOLS SECTION
          ===================================== */}

          <section
            className="tools-section"
            id="tools"
          >

            <div className="section-heading">

              <div className="section-eyebrow">EXPLORE THE TOOLKIT</div>
              <h2>What would you like to do?</h2>
              <p>Find the right tool for your next file task.</p>

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

              <label className="search-wrap">
                <Search size={19} aria-hidden="true" />
                <span className="sr-only">Search tools</span>
                <input type="search" placeholder="Search tools..." value={search}
                  onChange={(e) => setSearch(e.target.value)} className="search-input" />
              </label>

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

                    <div className={`tool-icon tool-icon-${tool.category.toLowerCase()}`}>
                      <Icon size={27} />
                    </div>
                    <span className="tool-category">{tool.category === "Office" ? "DOCUMENT" : tool.category.toUpperCase()}</span>

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

                      Open tool

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

          <section className="how-section" id="how-it-works">
            <div className="section-eyebrow">HOW IT WORKS</div>
            <h2>Three steps. Done.</h2>
            <p>Choose your tool, adjust the options and get your result.</p>
            <div className="steps-grid">
              <div><span className="step-number">01</span><h3>Pick a tool</h3><p>Browse by category or search for the task you need.</p></div>
              <div><span className="step-number">02</span><h3>Add your files</h3><p>Upload your documents and choose your preferred settings.</p></div>
              <div><span className="step-number">03</span><h3>Download</h3><p>Save the result and get back to what matters.</p></div>
            </div>
          </section>

          <section className="bottom-cta">
            <div className="cta-glow" aria-hidden="true" />
            <div className="section-eyebrow">READY WHEN YOU ARE</div>
            <h2>Your next file task starts here.</h2>
            <p>Useful tools, a simpler workflow, and no software to install.</p>
            <a href="#tools">Browse all tools <ArrowRight size={18} /></a>
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

          <div className="footer-right">
            <button type="button" className="footer-privacy" onClick={() => setShowPrivacy(true)}>Privacy &amp; file handling</button>
            <p>© {new Date().getFullYear()} FileToolkit. All rights reserved.</p>
          </div>

        </div>

      </footer>

      {showPrivacy && (
        <div className="privacy-overlay" onMouseDown={(event) => { if (event.target === event.currentTarget) setShowPrivacy(false); }}>
          <section className="privacy-dialog" role="dialog" aria-modal="true" aria-labelledby="privacy-title">
            <button type="button" className="privacy-close" aria-label="Close privacy information" onClick={() => setShowPrivacy(false)}><X size={21} /></button>
            <div className="section-eyebrow">YOUR FILES MATTER</div>
            <h2 id="privacy-title">Privacy &amp; file handling</h2>
            <p>Most FileToolkit tools process files in your browser. When a PowerPoint conversion backend is configured, PowerPoint presentations selected for conversion are uploaded to that service, processed temporarily, and returned as PDF or slide images. Do not upload sensitive presentations unless you trust the configured service.</p>
            <p>Choose files only when you want to use a tool. Downloaded results are saved through your browser. We do not provide an account or cloud file storage in this version.</p>
            <p>Like other websites, the hosting provider may process technical request information needed to serve the site. Avoid sharing sensitive files on any website unless you are comfortable with its security and your device's security.</p>
            <p className="privacy-note">This notice describes the reviewed version of FileToolkit; it is not a guarantee about browser extensions, your device, or third-party infrastructure.</p>
            <button type="button" className="privacy-done" onClick={() => setShowPrivacy(false)}>Got it</button>
          </section>
        </div>
      )}

    </div>

  );

}

export default App;