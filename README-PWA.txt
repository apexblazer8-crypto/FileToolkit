FileToolkit — minimal PWA patch (based on FileToolkit-PWA-Latest.zip)
===================================================================

Files added:
  public/manifest.webmanifest
  public/sw.js
  public/pwa/icon-192.png
  public/pwa/icon-512.png
  public/pwa/icon-maskable-512.png
  public/pwa/apple-touch-icon.png
  src/pwa.js

Existing files changed (only the indicated integration lines):
  index.html    manifest, Apple touch icon and standalone meta tags
  src/main.jsx  one import: ./pwa.js

Unchanged: src/App.jsx, src/App.css, ALL src/components/*, package.json,
package-lock.json, vite.config.js, presentation-server/* and other public files.
No npm package or system installation is required.

APPLY
1. Back up or commit your current FileToolkit changes.
2. Extract this patch at C:\Projects\FileToolkit and merge its src and public
   directories. Replace index.html and src/main.jsx when prompted.
3. In PowerShell:
      cd C:\Projects\FileToolkit
      npm run build
      npm run preview
4. Open the preview address. Service workers are disabled under npm run dev
   intentionally; production preview or the deployed HTTPS site is required.
5. On Android Chrome: open the HTTPS site and choose Install app / Add to Home screen
   from the browser menu if the option is offered.
   On iOS Safari: Share > Add to Home Screen.
6. When verified:
      git add .
      git commit -m "Add installable FileToolkit PWA"
      git push origin main

BEHAVIOR / LIMITATIONS
- The homepage shell and app-owned static assets are cached after use. This is
  not a guarantee that every conversion works offline. The device must have
  cached the needed JavaScript chunks; browser memory limits still apply.
- Conversion server features (old .ppt and enhanced chart rendering) still
  require a deployed and configured backend and an internet connection.
- No document content, generated file, external origin or conversion API response
  is intentionally stored in the PWA cache by this service worker.
- No native Android/iOS binary or Play Store/App Store listing is created.
- PWA install UI is provided by the browser/OS and may vary by device.
- This patch does not change file download behavior; test downloads on actual
  Android and iOS devices before advertising full mobile compatibility.
- The browser controls cache quotas and may evict assets at any time.
- If an old site version persists, close the installed app and reopen it online.
