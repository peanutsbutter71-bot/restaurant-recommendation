import fs from 'fs';
import path from 'path';

function copyDir(src, dest) {
  if (!fs.existsSync(src)) return;
  fs.mkdirSync(dest, { recursive: true });
  for (const file of fs.readdirSync(src)) {
    const srcFile = path.join(src, file);
    const destFile = path.join(dest, file);
    if (fs.statSync(srcFile).isDirectory()) {
      copyDir(srcFile, destFile);
    } else {
      fs.copyFileSync(srcFile, destFile);
    }
  }
}

// Only mirror the build output into build/ (gitignored) for manual GitHub Pages
// publishing (e.g. `npx gh-pages -d build`).
//
// IMPORTANT: never copy dist/ into the project root or into public/. Root
// index.html is Vite's build entry (it must keep pointing at /src/main.tsx),
// and everything under public/ is copied verbatim into dist/ by Vite itself.
// Writing built, already-hashed output back into either location corrupts the
// next `vite build`: Vite re-hashes the already-hashed files it finds there,
// and index.html stops pointing at the real source, so subsequent builds
// silently stop picking up any source changes. This happened before and
// produced filenames like manifest-CVAYuTDy-CVAYuTDy-CVAYuTDy....json.
copyDir('dist', 'build');
console.log('Build output synced to build/ for GitHub Pages.');
