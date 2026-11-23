/* Generated from the production export. Do not edit dist/sw.js manually. */
'use strict';

const BUILD_ID = __F1FAN_BUILD_ID__;
const CACHE_PREFIX = 'f1fan-shell-v1-';
const CACHE_NAME = CACHE_PREFIX + BUILD_ID;
const RESOURCES = __F1FAN_RESOURCES__;
const resourcesByPath = new Map(RESOURCES.map(resource => [resource.url, resource]));

async function fetchVerified(resource) {
  const url = new URL(resource.url, self.location.origin).href;
  const response = await fetch(url, { cache: 'no-store', credentials: 'omit', redirect: 'error' });
  if (response.status !== 200 || response.redirected || response.url !== url
      || response.type === 'opaque' || response.type === 'opaqueredirect') {
    throw new Error('Respuesta estática no válida: ' + resource.url);
  }
  const type = (response.headers.get('content-type') || '').split(';')[0].trim().toLowerCase();
  const requiredTypes = {
    html: ['text/html'],
    js: ['application/javascript', 'text/javascript'],
    css: ['text/css'],
    webmanifest: ['application/manifest+json', 'application/json'],
  };
  const extension = resource.url.split('.').pop();
  if (requiredTypes[extension] && !requiredTypes[extension].includes(type)) {
    throw new Error('Tipo de contenido no válido: ' + resource.url);
  }
  const bytes = await response.clone().arrayBuffer();
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  const revision = Array.from(new Uint8Array(digest), value => value.toString(16).padStart(2, '0')).join('');
  if (revision !== resource.revision) {
    throw new Error('El recurso no pertenece a esta compilación: ' + resource.url);
  }
  return response;
}

self.addEventListener('install', event => {
  // Do not skipWaiting: an update must not replace the worker of an open app.
  event.waitUntil((async () => {
    try {
      const cache = await caches.open(CACHE_NAME);
      for (const resource of RESOURCES) {
        const response = await fetchVerified(resource);
        await cache.put(new URL(resource.url, self.location.origin).href, response);
      }
    } catch (error) {
      // An incomplete/new build must not damage the previous version.
      await caches.delete(CACHE_NAME);
      throw error;
    }
  })());
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    for (const name of await caches.keys()) {
      if (name.startsWith(CACHE_PREFIX) && name !== CACHE_NAME) await caches.delete(name);
    }
    // No clients.claim: existing pages keep the lifecycle they were loaded with.
  })());
});

function unavailable(isNavigation) {
  if (isNavigation) {
    return new Response(
      '<!doctype html><html lang="es"><meta charset="utf-8"><meta name="viewport" content="width=device-width">'
      + '<title>F1Fan — Sin copia offline</title><body style="background:#0D0F12;color:white;font-family:sans-serif;padding:24px">'
      + '<h1>F1Fan</h1><p>La copia offline no está disponible o fue eliminada.</p>'
      + '<p>Conecta el dispositivo a internet y vuelve a abrir la aplicación para prepararla.</p></body></html>',
      { status: 503, headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' } }
    );
  }
  return new Response('Recurso de esta versión no disponible. Vuelve a conectar el dispositivo.', {
    status: 503, headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' },
  });
}

async function serveStatic(resource, isNavigation) {
  const cache = await caches.open(CACHE_NAME);
  const url = new URL(resource.url, self.location.origin).href;
  const cached = await cache.match(url);
  if (cached) return cached;
  try {
    // Recover only the exact build, never an HTML fallback or a newer bundle.
    const response = await fetchVerified(resource);
    await cache.put(url, response.clone());
    return response;
  } catch {
    return unavailable(isNavigation);
  }
}

self.addEventListener('fetch', event => {
  const request = event.request;
  const url = new URL(request.url);
  if (request.method !== 'GET' || url.origin !== self.location.origin || url.search
      || request.headers.has('authorization') || request.headers.has('range')) return;

  // React Navigation currently uses local state, with no URL linking.
  const isNavigation = request.mode === 'navigate';
  const pathname = isNavigation && url.pathname === '/' ? '/index.html' : url.pathname;
  const resource = resourcesByPath.get(pathname);
  if (!resource || (isNavigation && pathname !== '/index.html')) return;
  event.respondWith(serveStatic(resource, isNavigation));
});
