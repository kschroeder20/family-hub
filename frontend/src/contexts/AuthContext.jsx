import { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import {
  CognitoUserPool,
  CognitoUser,
  AuthenticationDetails,
} from 'amazon-cognito-identity-js';

const USER_POOL_ID = import.meta.env.VITE_COGNITO_USER_POOL_ID;
const CLIENT_ID = import.meta.env.VITE_COGNITO_CLIENT_ID;

// When no user pool is configured (local development), skip login entirely
// -- this mirrors the backend's dev bypass in CognitoAuthenticatable.
const DEV_BYPASS = !USER_POOL_ID || !CLIENT_ID;

const userPool = DEV_BYPASS
  ? null
  : new CognitoUserPool({ UserPoolId: USER_POOL_ID, ClientId: CLIENT_ID });

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [isAuthenticated, setIsAuthenticated] = useState(DEV_BYPASS);
  const [isChecking, setIsChecking] = useState(!DEV_BYPASS);
  const [error, setError] = useState(null);
  const pendingUserRef = useRef(null);

  useEffect(() => {
    if (DEV_BYPASS) return;

    const currentUser = userPool.getCurrentUser();
    if (!currentUser) {
      setIsChecking(false);
      return;
    }

    currentUser.getSession((err, session) => {
      setIsAuthenticated(!err && session?.isValid());
      setIsChecking(false);
    });
  }, []);

  const login = useCallback((username, password) => {
    return new Promise((resolve, reject) => {
      if (DEV_BYPASS) {
        resolve({ challenge: null });
        return;
      }

      setError(null);
      const cognitoUser = new CognitoUser({ Username: username, Pool: userPool });
      const authDetails = new AuthenticationDetails({ Username: username, Password: password });

      cognitoUser.authenticateUser(authDetails, {
        onSuccess: () => {
          setIsAuthenticated(true);
          resolve({ challenge: null });
        },
        onFailure: (err) => {
          setError(err.message || 'Unable to sign in');
          reject(err);
        },
        newPasswordRequired: () => {
          pendingUserRef.current = cognitoUser;
          resolve({ challenge: 'NEW_PASSWORD_REQUIRED' });
        },
      });
    });
  }, []);

  const completeNewPassword = useCallback((newPassword) => {
    return new Promise((resolve, reject) => {
      const cognitoUser = pendingUserRef.current;
      if (!cognitoUser) {
        reject(new Error('No pending sign-in'));
        return;
      }

      setError(null);
      cognitoUser.completeNewPasswordChallenge(newPassword, {}, {
        onSuccess: () => {
          pendingUserRef.current = null;
          setIsAuthenticated(true);
          resolve();
        },
        onFailure: (err) => {
          setError(err.message || 'Unable to set password');
          reject(err);
        },
      });
    });
  }, []);

  const logout = useCallback(() => {
    if (!DEV_BYPASS) {
      userPool.getCurrentUser()?.signOut();
    }
    setIsAuthenticated(false);
  }, []);

  return (
    <AuthContext.Provider
      value={{ isAuthenticated, isChecking, error, login, completeNewPassword, logout }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}

// Used by the API client to attach a fresh ID token to each request.
// Resolves to null in development when no user pool is configured.
export function getIdToken() {
  if (DEV_BYPASS) return Promise.resolve(null);

  const currentUser = userPool.getCurrentUser();
  if (!currentUser) return Promise.resolve(null);

  return new Promise((resolve) => {
    currentUser.getSession((err, session) => {
      if (err || !session?.isValid()) {
        resolve(null);
        return;
      }
      resolve(session.getIdToken().getJwtToken());
    });
  });
}
