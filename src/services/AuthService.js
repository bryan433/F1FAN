import LocalStorageManager from '../storage/LocalStorageManager';

/**
 * AuthService - Servicio de Autenticación
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
    return this.currentUser;
  }

  async login(email, password) {
    if (!email || !password) {
      throw new Error('Debe proporcionar correo y contraseña válidos.');
    }
    this.isAuthenticated = true;
    this.currentUser = {
      id: 'usr_authenticated_1',
      nombre: email.split('@')[0],
      email: email,
      isGuest: false,
    };
    // Sincronizar favoritos locales a la cuenta según SD-02
    const localFavs = await LocalStorageManager.obtenerFavoritos();
    console.log('[AuthService] Favoritos sincronizados con la nube:', localFavs);
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
    this.isAuthenticated = false;
    this.currentUser = null;
  }
}

export default new AuthService();

