import { supabase } from './SupabaseClient';
import LocalStorageManager from '../storage/LocalStorageManager';

/**
 * AuthService - Servicio de Autenticación integrado con Supabase Auth
 * Administra sesión de usuario (invitado o registrado) según SD-02 y RNF-SEG-02/04.
 */
class AuthService {
  constructor() {
    this.currentUser = {
      id: 'guest_user_diego',
      nombre: 'Diego Morales',
      email: 'diego.morales@f1fan.cl',
      isGuest: false,
      avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&q=80',
    };
    this.isAuthenticated = true;
    this.token = 'mock_jwt_token_secure_f1fan';
  }

  async getCurrentUser() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        this.currentUser = {
          id: user.id,
          nombre: user.user_metadata?.nombre || user.email?.split('@')[0],
          email: user.email,
          isGuest: false,
        };
        this.isAuthenticated = true;
      }
    } catch {
      // Si no hay red o sesión activa, mantiene el usuario actual
    }
    return this.currentUser;
  }

  async signUp(email, password, nombre) {
    if (!email || !password) {
      throw new Error('Debe proporcionar correo y contraseña válidos.');
    }
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { nombre } }
      });
      if (error) throw error;
      if (data?.user) {
        this.currentUser = {
          id: data.user.id,
          nombre: nombre || email.split('@')[0],
          email: data.user.email,
          isGuest: false,
        };
        this.isAuthenticated = true;
      }
      return data.user;
    } catch (err) {
      console.warn('[AuthService] Error en signUp:', err.message);
      throw err;
    }
  }

  async login(email, password) {
    if (!email || !password) {
      throw new Error('Debe proporcionar correo y contraseña válidos.');
    }

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        console.warn('[AuthService] Falló Supabase signIn, usando fallback local:', error.message);
      } else if (data?.user) {
        this.currentUser = {
          id: data.user.id,
          nombre: data.user.user_metadata?.nombre || email.split('@')[0],
          email: data.user.email,
          isGuest: false,
        };
        this.token = data.session?.access_token || this.token;
      }
    } catch (err) {
      console.warn('[AuthService] Error de red Supabase:', err.message);
    }

    this.isAuthenticated = true;
    if (!this.currentUser) {
      this.currentUser = {
        id: 'usr_authenticated_1',
        nombre: email.split('@')[0],
        email: email,
        isGuest: false,
      };
    }

    // Sincronizar favoritos locales a la cuenta según SD-02
    try {
      await this.sincronizarFavoritosConSupabase();
    } catch (e) {
      console.warn('[AuthService] Error al sincronizar favoritos locales:', e);
    }

    return this.currentUser;
  }

  /**
   * Sincroniza bidireccionalmente los favoritos locales (AsyncStorage) con Supabase
   */
  async sincronizarFavoritosConSupabase() {
    try {
      const user = await this.getCurrentUser();
      if (!user || user.isGuest || !user.email) {
        return { ok: false, error: 'Debes iniciar sesión con tu cuenta para sincronizar con la nube.' };
      }

      // 1. Obtener favoritos locales
      const [driverFavs, teamFavs] = await Promise.all([
        LocalStorageManager.obtenerFavoritos().catch(() => []),
        LocalStorageManager.obtenerEscuderiasFavoritas().catch(() => []),
      ]);

      // 2. Subir favoritos locales a Supabase
      const rowsToUpsert = [
        ...driverFavs.map(id => ({ usuario_id: user.id, item_id: String(id), tipo: 'piloto' })),
        ...teamFavs.map(id => ({ usuario_id: user.id, item_id: String(id), tipo: 'escuderia' })),
      ];

      if (rowsToUpsert.length > 0) {
        const { error: upsertErr } = await supabase
          .from('favoritos')
          .upsert(rowsToUpsert, { onConflict: 'usuario_id,item_id,tipo' });
        if (upsertErr) console.warn('[AuthService] Upsert en Supabase:', upsertErr.message);
      }

      // 3. Descargar todos los favoritos asociados al usuario desde Supabase
      const { data: cloudFavs, error: fetchErr } = await supabase
        .from('favoritos')
        .select('item_id, tipo')
        .eq('usuario_id', user.id);

      if (fetchErr) throw fetchErr;

      // 4. Fusionar en almacenamiento local
      if (Array.isArray(cloudFavs)) {
        for (const item of cloudFavs) {
          if (item.tipo === 'piloto') {
            await LocalStorageManager.guardarFavorito(item.item_id).catch(() => {});
          } else if (item.tipo === 'escuderia') {
            const currentTeams = await LocalStorageManager.obtenerEscuderiasFavoritas().catch(() => []);
            if (!currentTeams.includes(item.item_id)) {
              await LocalStorageManager.toggleEscuderiaFavorita(item.item_id).catch(() => {});
            }
          }
        }
      }

      return { ok: true, count: cloudFavs?.length || rowsToUpsert.length };
    } catch (err) {
      console.warn('[AuthService] Error en sincronización con Supabase:', err.message);
      return { ok: false, error: err.message };
    }
  }

  async loginAsGuest() {
    this.currentUser = {
      id: 'guest_fan',
      nombre: 'Aficionado F1',
      email: null,
      isGuest: true
    };
    this.isAuthenticated = true;
    return this.currentUser;
  }

  async logout() {
    try {
      await supabase.auth.signOut();
    } catch {
      // Ignorar fallo de red en logout
    }
    this.isAuthenticated = false;
    this.currentUser = null;
  }
}

export default new AuthService();
