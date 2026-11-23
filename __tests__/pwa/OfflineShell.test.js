/** @jest-environment node */
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const vm = require('node:vm');
const { webcrypto } = require('node:crypto');
const { createPrecache, generateServiceWorker, CACHE_PREFIX } = require('../../scripts/generate-sw.cjs');

const origin = 'https://f1fan.test';
let directory;
function write(relative, content) {
  const file = path.join(directory, relative);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, content);
}
function fixture() {
  write('index.html', '<html><head><title>F1Fan</title><link rel="manifest" href="/manifest.webmanifest"></head>'
    + '<body><div id="root"></div><script src="/register-sw.js"></script>'
    + '<script src="/_expo/static/js/web/AppEntry-a1b2.js"></script></body></html>');
  write('register-sw.js', '// registration fixture');
  write('manifest.webmanifest', JSON.stringify({ icons: [{ src: '/icons/icon-192.png' }] }));
  write('_expo/static/js/web/AppEntry-a1b2.js', 'console.log("F1Fan export");');
  write('_expo/static/css/style-c3d4.css', 'body{background:#0D0F12}');
  write('assets/font-e5f6.woff2', 'font fixture');
  write('icons/icon-192.png', 'icon fixture');
  write('metadata.json', '{"not":"an app resource"}');
  write('api/private.json', '{"private":true}');
  write('assets/credentials.json', '{"excluded":true}');
  write('_expo/static/js/web/AppEntry-a1b2.js.map', '{"excluded":true}');
}

beforeEach(() => {
  directory = fs.mkdtempSync(path.join(os.tmpdir(), 'f1fan-offline-test-'));
  fixture();
});
afterEach(() => {
  const resolved = path.resolve(directory);
  if (!resolved.startsWith(path.resolve(os.tmpdir()) + path.sep)
      || !path.basename(resolved).startsWith('f1fan-offline-test-')) throw new Error('Unexpected temporary directory');
  fs.rmSync(resolved, { recursive: true, force: true });
});

function memoryCaches() {
  const stores = new Map();
  return {
    stores,
    open: jest.fn(async name => {
      if (!stores.has(name)) stores.set(name, new Map());
      const entries = stores.get(name);
      return {
        match: jest.fn(async url => entries.get(url)?.clone()),
        put: jest.fn(async (url, response) => { entries.set(url, response.clone()); }),
      };
    }),
    keys: jest.fn(async () => [...stores.keys()]),
    delete: jest.fn(async name => stores.delete(name)),
  };
}
function workerHarness(result = generateServiceWorker(directory), sharedCaches = memoryCaches()) {
  const handlers = {};
  const fetchMock = jest.fn(async url => {
    const relative = decodeURIComponent(new URL(url).pathname).slice(1);
    const extension = path.extname(relative);
    const type = { '.html': 'text/html', '.js': 'application/javascript', '.css': 'text/css',
      '.webmanifest': 'application/manifest+json' }[extension] || 'application/octet-stream';
    const response = new Response(fs.readFileSync(path.join(directory, relative)), {
      headers: { 'content-type': type },
    });
    Object.defineProperty(response, 'url', { value: url });
    return response;
  });
  vm.runInNewContext(result.worker, {
    self: { location: { origin }, addEventListener: (name, callback) => { handlers[name] = callback; } },
    caches: sharedCaches, fetch: fetchMock, crypto: webcrypto, Response, URL, Uint8Array,
  });
  return {
    result, caches: sharedCaches, fetch: fetchMock,
    lifecycle(name) {
      let completion;
      handlers[name]({ waitUntil: promise => { completion = promise; } });
      return completion;
    },
    request(url, options = {}) {
      let completion;
      handlers.fetch({
        request: { url: new URL(url, origin).href, method: 'GET', mode: 'cors', headers: new Headers(), ...options },
        respondWith: promise => { completion = promise; },
      });
      return completion;
    },
  };
}

describe('Inventario del shell exportado', () => {
  test('incluye nombres reales con hash, CSS, fuentes e iconos, excluyendo datos y mapas', () => {
    const { inventory, worker } = generateServiceWorker(directory);
    expect(inventory.resources.map(item => item.url)).toEqual(expect.arrayContaining([
      '/index.html', '/register-sw.js', '/manifest.webmanifest',
      '/_expo/static/js/web/AppEntry-a1b2.js', '/_expo/static/css/style-c3d4.css',
      '/assets/font-e5f6.woff2', '/icons/icon-192.png',
    ]));
    for (const excluded of ['/metadata.json', '/api/private.json', '/assets/credentials.json']) {
      expect(inventory.resources.map(item => item.url)).not.toContain(excluded);
    }
    expect(inventory.resources.some(item => item.url.endsWith('.map'))).toBe(false);
    expect(fs.readFileSync(path.join(directory, 'sw.js'), 'utf8')).toBe(worker);
    expect(JSON.parse(fs.readFileSync(path.join(directory, 'pwa-precache.json'), 'utf8'))).toEqual(inventory);
    expect(inventory.resources.every(item => /^[a-f0-9]{64}$/.test(item.revision))).toBe(true);
  });

  test('regenerar el mismo export no incluye sw.js ni el informe y conserva la versión', () => {
    const first = generateServiceWorker(directory);
    const second = generateServiceWorker(directory);
    expect(second).toEqual(first);
    expect(second.inventory.resources.some(item => /sw\.js$/.test(item.url) && item.url !== '/register-sw.js')).toBe(false);
  });

  test('un recurso o la lógica del worker modificados producen una versión distinta', () => {
    const first = createPrecache(directory);
    write('_expo/static/js/web/AppEntry-a1b2.js', 'console.log("new version");');
    const second = createPrecache(directory);
    expect(second.inventory.buildId).not.toBe(first.inventory.buildId);
    const template = fs.readFileSync(path.join(__dirname, '../../scripts/pwa/sw-template.js'), 'utf8');
    expect(createPrecache(directory, template + '\n// update\n').inventory.buildId).not.toBe(second.inventory.buildId);
  });

  test('rechaza una exportación incompleta y no publica un worker parcial', () => {
    fs.unlinkSync(path.join(directory, '_expo/static/js/web/AppEntry-a1b2.js'));
    expect(() => generateServiceWorker(directory)).toThrow('Recurso enlazado no incluido');
    expect(fs.existsSync(path.join(directory, 'sw.js'))).toBe(false);
  });

  test('rechaza HTML sin procesar o una página de protección en lugar de F1Fan', () => {
    write('index.html', '<html><title>Authentication Required</title></html>');
    expect(() => generateServiceWorker(directory)).toThrow('no es la exportación procesada');
  });
});

describe('Comportamiento del service worker real con red y CacheStorage simulados', () => {
  test('prepara exclusivamente el inventario y permite recuperar HTML y JS sin red', async () => {
    const worker = workerHarness();
    await worker.lifecycle('install');
    expect(worker.fetch).toHaveBeenCalledTimes(worker.result.inventory.resources.length);
    expect(worker.fetch.mock.calls.every(([, options]) => options.credentials === 'omit'
      && options.redirect === 'error' && options.cache === 'no-store')).toBe(true);
    worker.fetch.mockRejectedValue(new Error('offline'));
    const html = await worker.request('/', { mode: 'navigate' });
    expect(html.status).toBe(200);
    expect(await html.text()).toContain('id="root"');
    expect((await worker.request('/_expo/static/js/web/AppEntry-a1b2.js')).status).toBe(200);
    expect(worker.fetch).toHaveBeenCalledTimes(worker.result.inventory.resources.length);
  });

  test.each([
    'https://api.jolpi.ca/ergast/f1/current.json',
    'https://api.openf1.org/v1/drivers',
    'https://example.supabase.co/auth/v1/token',
    'https://example.supabase.co/rest/v1/profiles',
    '/api/private', '/auth/callback', '/unknown.js', '/?code=private',
    '/index.html?access_token=private',
  ])('no intercepta %s', url => {
    const worker = workerHarness();
    expect(worker.request(url, { mode: 'navigate' })).toBeUndefined();
    expect(worker.fetch).not.toHaveBeenCalled();
    expect(worker.caches.open).not.toHaveBeenCalled();
  });

  test.each([
    { method: 'POST' },
    { headers: new Headers({ Authorization: 'Bearer private' }) },
    { headers: new Headers({ Range: 'bytes=0-10' }) },
  ])('no intercepta escrituras, credenciales ni solicitudes parciales: %p', options => {
    const worker = workerHarness();
    expect(worker.request('/index.html', options)).toBeUndefined();
    expect(worker.caches.open).not.toHaveBeenCalled();
  });

  test('un HTTP 404 durante install descarta la copia parcial y conserva la caché previa', async () => {
    const worker = workerHarness();
    const previous = CACHE_PREFIX + 'previous';
    worker.caches.stores.set(previous, new Map());
    worker.fetch.mockResolvedValueOnce(new Response('not found', { status: 404 }));
    await expect(worker.lifecycle('install')).rejects.toThrow('Respuesta estática no válida');
    expect(worker.caches.stores.has(worker.result.inventory.cacheName)).toBe(false);
    expect(worker.caches.stores.has(previous)).toBe(true);
  });

  test('una página de protección HTTP 200 no reemplaza el HTML de F1Fan', async () => {
    const worker = workerHarness();
    const network = worker.fetch.getMockImplementation();
    worker.fetch.mockImplementation(async url => {
      if (!url.endsWith('/index.html')) return network(url);
      const response = new Response('<html>Authentication Required</html>', { headers: { 'content-type': 'text/html' } });
      Object.defineProperty(response, 'url', { value: url });
      return response;
    });
    await expect(worker.lifecycle('install')).rejects.toThrow('no pertenece a esta compilación');
    expect(worker.caches.stores.has(worker.result.inventory.cacheName)).toBe(false);
  });

  test('un recurso JavaScript servido como HTML impide la instalación', async () => {
    const worker = workerHarness();
    const network = worker.fetch.getMockImplementation();
    worker.fetch.mockImplementation(async url => {
      const response = await network(url);
      if (url.endsWith('.js')) response.headers.set('content-type', 'text/html');
      return response;
    });
    await expect(worker.lifecycle('install')).rejects.toThrow('Tipo de contenido no válido');
  });

  test('sin copia y sin red devuelve un estado informativo, nunca datos inventados', async () => {
    const worker = workerHarness();
    worker.fetch.mockRejectedValue(new Error('offline'));
    const response = await worker.request('/', { mode: 'navigate' });
    expect(response.status).toBe(503);
    expect(await response.text()).toContain('La copia offline no está disponible');
  });

  test('no recupera un recurso de otra compilación cuando falta su copia local', async () => {
    const worker = workerHarness();
    write('_expo/static/js/web/AppEntry-a1b2.js', '// changed after build');
    const response = await worker.request('/_expo/static/js/web/AppEntry-a1b2.js');
    expect(response.status).toBe(503);
    expect(worker.caches.stores.get(worker.result.inventory.cacheName).size).toBe(0);
  });

  test('activate borra solo versiones propias anteriores y conserva otras cachés', async () => {
    const worker = workerHarness();
    worker.caches.stores.set(CACHE_PREFIX + 'old', new Map());
    worker.caches.stores.set('unrelated-cache', new Map());
    await worker.lifecycle('install');
    await worker.lifecycle('activate');
    expect([...worker.caches.stores.keys()].sort()).toEqual([worker.result.inventory.cacheName, 'unrelated-cache'].sort());
    expect(worker.result.worker).not.toMatch(/self\.skipWaiting\s*\(|clients\.claim\s*\(/);
  });
});

describe('Registro web y configuración de Vercel', () => {
  function registrationHarness({ secure = true, production = true, supported = true, fail = false } = {}) {
    const registration = { addEventListener: jest.fn() };
    const serviceWorker = {
      register: fail ? jest.fn().mockRejectedValue(new Error('unsupported response')) : jest.fn().mockResolvedValue(registration),
      ready: Promise.resolve(registration),
    };
    const log = { info: jest.fn(), warn: jest.fn() };
    let load;
    vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../../public/register-sw.js'), 'utf8'), {
      window: { isSecureContext: secure, addEventListener: (_, callback) => { load = callback; } },
      document: { readyState: 'loading', querySelector: () => production ? {} : null },
      navigator: supported ? { serviceWorker } : {},
      console: log,
    });
    return { serviceWorker, log, load };
  }

  test.each([{ secure: false }, { production: false }, { supported: false }])('omite el registro fuera de web segura de producción: %p', options => {
    const harness = registrationHarness(options);
    expect(harness.load).toBeUndefined();
    expect(harness.serviceWorker.register).not.toHaveBeenCalled();
  });

  test('registra el worker raíz tras cargar la página, sin forzar actualizaciones', async () => {
    const harness = registrationHarness();
    await harness.load();
    expect(harness.serviceWorker.register).toHaveBeenCalledWith('/sw.js', { scope: '/', updateViaCache: 'none' });
    expect(harness.log.info).toHaveBeenCalled();
  });

  test('un fallo de registro se informa sin propagar un error a la aplicación', async () => {
    const harness = registrationHarness({ fail: true });
    await expect(harness.load()).resolves.toBeUndefined();
    expect(harness.log.warn).toHaveBeenCalled();
  });

  test('Vercel utiliza el build completo y no reescribe recursos estáticos o API inexistentes', () => {
    const config = require('../../vercel.json');
    expect(config.buildCommand).toBe('npm run build:web');
    const fallback = new RegExp('^' + config.rewrites[0].source + '$');
    expect(fallback.test('/')).toBe(true);
    expect(fallback.test('/Calendario')).toBe(true);
    for (const url of ['/sw.js', '/manifest.webmanifest', '/_expo/missing.js', '/assets/missing', '/icons/missing.png', '/api/private']) {
      expect(fallback.test(url)).toBe(false);
    }
    expect(config.headers.find(rule => rule.source === '/sw.js').headers).toEqual(expect.arrayContaining([
      { key: 'Content-Type', value: 'application/javascript; charset=utf-8' },
      { key: 'Cache-Control', value: 'no-store, max-age=0' },
    ]));
  });
});
