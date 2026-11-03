require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');

const app = express();
const PORT = process.env.PORT || 10000;

// Inicialización de Supabase con Service Role (permisos de servidor)
const supabaseUrl = process.env.SUPABASE_URL || 'https://qwezxcafrurxmvevnlne.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabase = supabaseServiceKey ? createClient(supabaseUrl, supabaseServiceKey) : null;

// Configuración de CORS
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());

// Caché en memoria simple con TTL para cumplir RNF-02 (máx 30 req/min OpenF1)
const cache = new Map();
const CACHE_TTL_MS = 15 * 60 * 1000; // 15 minutos

function getCached(key) {
  const item = cache.get(key);
  if (!item) return null;
  if (Date.now() > item.expiresAt) {
    cache.delete(key);
    return null;
  }
  return item.data;
}

function setCached(key, data, ttlMs = CACHE_TTL_MS) {
  cache.set(key, { data, expiresAt: Date.now() + ttlMs });
}

// 1. Health Check (Render y monitoreo)
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'f1fan-backend',
    timestamp: new Date().toISOString(),
    supabaseConnected: Boolean(supabase),
    cacheEntries: cache.size
  });
});

// 2. Proxy con Caché para Clasificación de Pilotos (Jolpica)
app.get('/api/f1/standings/drivers', async (req, res) => {
  const cacheKey = 'standings_drivers_2024';
  const cached = getCached(cacheKey);
  if (cached) {
    return res.json({ source: 'cache', data: cached });
  }

  try {
    const response = await fetch('https://api.jolpi.ca/ergast/f1/2024/driverStandings.json');
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const json = await response.json();
    const standings = json?.MRData?.StandingsTable?.StandingsLists?.[0]?.DriverStandings || [];
    setCached(cacheKey, standings);
    res.json({ source: 'live', data: standings });
  } catch (err) {
    res.status(502).json({ error: 'Error al consultar API externa', details: err.message });
  }
});

// 3. Proxy con Caché para Clasificación de Constructores (Jolpica)
app.get('/api/f1/standings/constructors', async (req, res) => {
  const cacheKey = 'standings_constructors_2024';
  const cached = getCached(cacheKey);
  if (cached) {
    return res.json({ source: 'cache', data: cached });
  }

  try {
    const response = await fetch('https://api.jolpi.ca/ergast/f1/2024/constructorStandings.json');
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const json = await response.json();
    const standings = json?.MRData?.StandingsTable?.StandingsLists?.[0]?.ConstructorStandings || [];
    setCached(cacheKey, standings);
    res.json({ source: 'live', data: standings });
  } catch (err) {
    res.status(502).json({ error: 'Error al consultar API externa', details: err.message });
  }
});

// 4. Sincronización de Favoritos con Supabase
app.post('/api/favoritos/sync', async (req, res) => {
  if (!supabase) {
    return res.status(503).json({ error: 'Supabase no configurado en el servidor' });
  }

  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).json({ error: 'Cabecera Authorization requerida' });
  }

  const token = authHeader.replace('Bearer ', '');
  const { data: { user }, error: authError } = await supabase.auth.getUser(token);

  if (authError || !user) {
    return res.status(401).json({ error: 'Token inválido o expirado' });
  }

  const { favoritos } = req.body;
  if (!Array.isArray(favoritos)) {
    return res.status(400).json({ error: 'Formato inválido: se espera lista de favoritos' });
  }

  try {
    // Inserta o actualiza favoritos asociados al usuario autenticado
    const rows = favoritos.map(f => ({
      usuario_id: user.id,
      item_id: String(f.id || f.item_id),
      tipo: f.tipo || 'piloto'
    }));

    const { data, error } = await supabase
      .from('favoritos')
      .upsert(rows, { onConflict: 'usuario_id,item_id,tipo' })
      .select();

    if (error) throw error;
    res.json({ success: true, count: data.length, synced: data });
  } catch (err) {
    res.status(500).json({ error: 'Error al sincronizar favoritos', details: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`[F1Fan Backend] Servidor escuchando en el puerto ${PORT}`);
});

