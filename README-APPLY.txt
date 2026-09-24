FileToolkit PowerPoint to PDF patch

1. Copy src/App.jsx and src/components/PowerPointToPdf.jsx into C:\Projects\FileToolkit\src (preserve folders).
2. In VS Code PowerShell: cd C:\Projects\FileToolkit
3. npm install pptx-svg
4. npm run build
5. npm run dev
6. Test a simple PPTX and a complex PPTX, compare PDF against PowerPoint original before deploying.
7. Only after testing: git add src/App.jsx src/components/PowerPointToPdf.jsx package.json package-lock.json && git commit -m "Add browser-based PowerPoint to PDF" && git push

The supplied ZIP does not contain node_modules; npm install is necessary. The existing App.css and conversion components are unchanged.
