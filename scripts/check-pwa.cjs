// Structural checks for the production export; this does not prove OS installation.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const project = path.resolve(__dirname, '..');
const publicDir = path.join(project, 'public');
const dist = path.join(project, 'dist');
const read = (file) => fs.readFileSync(file, 'utf8');

function exportedFile(url) {
  assert.ok(url.startsWith('/') && !url.startsWith('//'), 'Expected a root-relative URL: ' + url);
  const file = path.resolve(dist, '.' + url);
  assert.ok(file.startsWith(dist + path.sep), 'Resource must remain inside dist: ' + url);
  assert.ok(fs.statSync(file).isFile(), 'Missing exported resource: ' + url);
  return file;
}

function checkPng(file, size) {
  const data = fs.readFileSync(file);
  assert.ok(data.subarray(0, 8).equals(Buffer.from('89504e470d0a1a0a', 'hex')), 'Invalid PNG: ' + file);
  assert.equal(data.toString('ascii', 12, 16), 'IHDR');
  assert.equal(data.readUInt32BE(16), size, 'Incorrect PNG width: ' + file);
  assert.equal(data.readUInt32BE(20), size, 'Incorrect PNG height: ' + file);
}

function publicFiles(directory, prefix = '') {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const relative = prefix + entry.name;
    return entry.isDirectory()
      ? publicFiles(path.join(directory, entry.name), relative + '/')
      : [relative];
  });
}

try {
  const manifest = JSON.parse(read(exportedFile('/manifest.webmanifest')));
  assert.deepEqual(manifest, JSON.parse(read(path.join(publicDir, 'manifest.webmanifest'))));
  for (const field of ['name', 'short_name', 'description']) {
    assert.ok(typeof manifest[field] === 'string' && manifest[field].trim(), 'Missing ' + field);
  }
  assert.equal(manifest.id, '/');
  assert.equal(manifest.start_url, '/');
  assert.equal(manifest.scope, '/');
  assert.equal(manifest.display, 'standalone');
  assert.equal(manifest.lang, 'es');
  assert.equal(manifest.prefer_related_applications, false);
  assert.equal(manifest.theme_color, '#0D0F12');
  assert.equal(manifest.background_color, '#0D0F12');
  for (const size of [192, 512]) {
    const icon = manifest.icons.find((item) => item.sizes === size + 'x' + size);
    assert.ok(icon, 'Missing icon size: ' + size);
    assert.equal(icon.type, 'image/png');
    assert.equal(icon.purpose, 'any');
    checkPng(exportedFile(icon.src), size);
  }
  checkPng(exportedFile('/icons/apple-touch-icon.png'), 180);
  checkPng(exportedFile('/icons/favicon-32.png'), 32);

  const html = read(exportedFile('/index.html'));
  assert.match(html, /<html lang="es">/);
  assert.match(html, /<title>F1Fan<\/title>/);
  assert.equal((html.match(/id="root"/g) || []).length, 1, 'Expo requires one root element');
  assert.match(html, /id="expo-reset"/);
  assert.match(html, /<noscript>/);
  assert.match(html, /<link rel="manifest" href="\/manifest.webmanifest"\s*\/?>/);
  assert.match(html, /<link rel="apple-touch-icon" sizes="180x180" href="\/icons\/apple-touch-icon.png"\s*\/?>/);
  assert.match(html, /name="apple-mobile-web-app-capable" content="yes"/);
  assert.match(html, /name="apple-mobile-web-app-title" content="F1Fan"/);
  assert.match(html, /name="theme-color" content="#0D0F12"/);
  assert.doesNotMatch(html, /%LANG_ISO_CODE%|%WEB_TITLE%/);

  const scripts = [...html.matchAll(/<script\b[^>]*\bsrc="([^"]+)"[^>]*>/g)];
  assert.ok(scripts.length > 0, 'Expo did not inject the production bundle');
  for (const [, src] of scripts) {
    assert.match(src, /^\/_expo\/.*\.js$/);
    exportedFile(src);
  }
  assert.notEqual(html, read(path.join(publicDir, 'index.html')), 'Export must process the Expo template');
  for (const relative of publicFiles(publicDir)) {
    if (relative === 'index.html') continue; // Expo processes this template instead of copying it verbatim.
    assert.deepEqual(
      fs.readFileSync(exportedFile('/' + relative)),
      fs.readFileSync(path.join(publicDir, relative)),
      'Public asset changed during export: ' + relative
    );
  }
  console.log('PWA export OK: manifest, 192/512 PNG, Apple 180 PNG, favicon 32 PNG, public assets and Expo entry.');
  console.log('Installation, HTTPS hosting and browser/OS compatibility still require manual checks.');
} catch (error) {
  console.error('PWA export check failed: ' + error.message);
  console.error('Run npm run build:web first, then npm run pwa:check.');
  process.exitCode = 1;
}
