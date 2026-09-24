# FileToolkit — PowerPoint final integration

## Included
- PowerPoint to PDF and PowerPoint to Images (PNG/JPG ZIP).
- Existing converters and styles retained; shared browser PPTX renderer in `presentationUtils.js`.
- OPTIONAL LibreOffice backend for old `.ppt` and higher-fidelity `.pptx` charts.

## Browser-only mode (no server)
`npm install pptx-svg` (if not already installed), then `npm run build` and `npm run dev`.
Do not create `.env.local`. Modern `.pptx` works in the browser; `.ppt` is **not** supported in browser-only mode. Charts may be omitted. Do not rename `.ppt` to `.pptx`.

## Enable .ppt + improve .pptx chart rendering LOCALLY
1. Install LibreOffice on Windows. Default location: `C:\Program Files\LibreOffice\program\soffice.exe`.
2. Open a SECOND terminal:
   ```powershell
   cd C:\Projects\FileToolkit\presentation-server
   npm install
   $env:ALLOWED_ORIGINS="http://localhost:5177,http://localhost:5173,http://localhost:5174,http://localhost:5175,http://localhost:5176"
   npm start
   ```
3. In `C:\Projects\FileToolkit`, create `.env.local` with exactly:
   ```
   VITE_PRESENTATION_API_URL=http://localhost:8787
   ```
4. Restart the Vite dev server (`Ctrl+C`, `npm run dev`). **Both** .ppt and .pptx now use LibreOffice for PDF, and the image tool renders pages from the resulting PDF. The first-slide browser preview is disabled in server mode.
5. Run `npm run build`; test .ppt and .pptx with text, charts, tables, images. LibreOffice rendering is not guaranteed to be identical to Microsoft PowerPoint.

## Production / Vercel
Vercel serves the frontend but this project does NOT install LibreOffice on Vercel. To support .ppt on the public site, deploy `presentation-server/` separately on a container host with LibreOffice (Dockerfile included). Set `ALLOWED_ORIGINS=https://YOURDOMAIN` on that host and set `VITE_PRESENTATION_API_URL=https://YOUR-API-DOMAIN` in Vercel project environment variables, then redeploy. Configure HTTPS, rate limits, file upload limits, abuse protection, privacy policy, and monitoring before public use. The sample server handles only one conversion at a time and is a LOCAL/PROTOTYPE service, not a production-hardened document processing service. Do not put a localhost API URL in Vercel production env vars.

## Privacy
Browser-only PPTX never uploads. When API URL is configured, the PPT/PPTX file is uploaded to that service and deleted from its temporary folder after conversion. Other FileToolkit tools remain browser-based. Review and update your public privacy notice before enabling server conversion.

## Known limitations
- PDF output via browser is rasterized; via LibreOffice may retain selectable text, but not guaranteed.
- Chart rendering in the browser is not fixed by this patch; the optional LibreOffice backend is the higher-fidelity route.
- Legacy .ppt is not browser-only and will not work on the live site until a compatible backend is deployed.
- Images are bundled into a ZIP, one image per slide.

## Test performed here
The provided `file_example_PPT_1MB.ppt` was converted with LibreOffice into a 4-page PDF. Its chart is visible on slide 2 in that LibreOffice output; the browser-generated PDF you shared had a blank chart slide. This validates the backend conversion *engine* against that sample, not the entire frontend-to-server deployment.
