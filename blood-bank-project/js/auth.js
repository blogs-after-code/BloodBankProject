const Auth = {
  async register(email, password, name, role = 'staff') {
    try {
      const cred = await auth.createUserWithEmailAndPassword(email, password);
      await cred.user.updateProfile({ displayName: name });
      await DB.users.createProfile(cred.user.uid, {
        name,
        email,
        role,
        active: true
      });
      await DB.audit.log('user_registered', `${name} (${role}) registered`);
      return { success: true, user: cred.user };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  async login(email, password) {
    try {
      const cred = await auth.signInWithEmailAndPassword(email, password);
      await DB.audit.log('user_login', `${email} logged in`);
      return { success: true, user: cred.user };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  async logout() {
    await DB.audit.log('user_logout', `User logged out`);
    await auth.signOut();
    window.location.href = 'login.html';
  },

  getCurrentUser() {
    return auth.currentUser;
  },

  onAuthChange(callback) {
    auth.onAuthStateChanged(callback);
  },

  requireAuth() {
    auth.onAuthStateChanged(user => {
      if (!user) {
        window.location.href = 'login.html';
      }
    });
  }
};