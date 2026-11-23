const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const vm = require('node:vm');

const project = path.resolve(__dirname, '..');
const templateFile = path.join(__dirname, 'pwa', 'sw-template.js');
const CACHE_PREFIX = 'f1fan-shell-v1-';
const assetExtensions = new Set([
  '.js', '.css', '.png', '.jpg', '.jpeg', '.gif', '.webp', '.avif', '.svg', '.ico',
  '.ttf', '.otf', '.woff', '.woff2', '.wasm', '.mp3', '.mp4', '.webm', '.wav',
]);
const rootResources = new Set(['/index.html', '/register-sw.js', '/manifest.webmanifest', '/favicon.ico']);
const sha256 = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const urlFor = relative => '/' + relative.split('/').map(encodeURIComponent).join('/');

function isShellResource(url) {
  if (rootResources.has(url)) return true;
  return /^\/(?:_expo|assets|icons)\//.test(url) && assetExtensions.has(path.posix.extname(url));
}

function listFiles(directory, prefix = '') {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    const relative = prefix + entry.name;
    if (entry.isSymbolicLink()) throw new Error('No se admiten enlaces en dist: ' + relative);
    return entry.isDirectory() ? listFiles(path.join(directory, entry.name), relative + '/') : [relative];
  });
}

function createPrecache(distDir = path.join(project, 'dist'), workerTemplate = fs.readFileSync(templateFile, 'utf8')) {
  const resources = listFiles(distDir).map(relative => ({ relative, url: urlFor(relative) }))
    .filter(entry => isShellResource(entry.url))
    .map(({ relative, url }) => {
      const bytes = fs.readFileSync(path.join(distDir, relative));
      return { url, revision: sha256(bytes), bytes: bytes.length };
    }).sort((a, b) => a.url < b.url ? -1 : a.url > b.url ? 1 : 0);
  const urls = new Set(resources.map(resource => resource.url));
  for (const required of ['/index.html', '/register-sw.js', '/manifest.webmanifest']) {
    if (!urls.has(required)) throw new Error('Falta el recurso exportado: ' + required);
  }
  const html = fs.readFileSync(path.join(distDir, 'index.html'), 'utf8');
  if (!html.includes('id="root"') || !html.includes('<title>F1Fan</title>') || /%WEB_TITLE%|%LANG_ISO_CODE%/.test(html)) {
    throw new Error('index.html no es la exportación procesada de F1Fan.');
  }
  const scripts = [...html.matchAll(/<script\b[^>]*\bsrc="([^"]+)"/g)].map(match => match[1]);
  if (!scripts.some(url => url.startsWith('/_expo/') && url.endsWith('.js'))
      || !scripts.includes('/register-sw.js')) throw new Error('Faltan los scripts de Expo o registro PWA.');
  const linkedResources = [...html.matchAll(/<(?:script|link)\b[^>]*(?:src|href)="([^"]+)"/g)].map(match => match[1]);
  for (const url of linkedResources) {
    if (!urls.has(url)) throw new Error('Recurso enlazado no incluido en el shell: ' + url);
  }
  const manifest = JSON.parse(fs.readFileSync(path.join(distDir, 'manifest.webmanifest'), 'utf8'));
  for (const icon of manifest.icons || []) {
    if (!urls.has(icon.src)) throw new Error('Icono del manifiesto ausente: ' + icon.src);
  }
  // Template changes also produce a new version, even if exported assets are unchanged.
  const buildId = sha256(JSON.stringify(resources) + workerTemplate);
  const inventory = { schemaVersion: 1, buildId, cacheName: CACHE_PREFIX + buildId, resources };
  const worker = workerTemplate
    .replace('__F1FAN_BUILD_ID__', JSON.stringify(buildId))
    .replace('__F1FAN_RESOURCES__', JSON.stringify(resources, null, 2));
  new vm.Script(worker, { filename: 'sw.js' });
  return { inventory, worker };
}

function generateServiceWorker(distDir = path.join(project, 'dist')) {
  const result = createPrecache(distDir);
  fs.writeFileSync(path.join(distDir, 'sw.js'), result.worker);
  fs.writeFileSync(path.join(distDir, 'pwa-precache.json'), JSON.stringify(result.inventory, null, 2) + '\n');
  return result;
}

if (require.main === module) {
  try {
    const { inventory } = generateServiceWorker();
    const size = inventory.resources.reduce((sum, resource) => sum + resource.bytes, 0);
    console.log('PWA shell: ' + inventory.resources.length + ' recursos, ' + size + ' bytes, versión ' + inventory.buildId);
    console.log('Generados dist/sw.js y dist/pwa-precache.json. La apertura offline requiere validación en navegador.');
  } catch (error) {
    console.error('No se pudo generar el shell PWA: ' + error.message);
    process.exitCode = 1;
  }
}
module.exports = { createPrecache, generateServiceWorker, isShellResource, CACHE_PREFIX };
