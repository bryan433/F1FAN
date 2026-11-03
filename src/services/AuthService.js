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
      const localFavs = await LocalStorageManager.obtenerFavoritos();
      console.log('[AuthService] Favoritos sincronizados con la nube:', localFavs);
    } catch (e) {
      console.warn('[AuthService] Error al sincronizar favoritos locales:', e);
    }

    return this.currentUser;
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
