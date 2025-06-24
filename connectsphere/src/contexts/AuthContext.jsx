import React, { createContext, useContext, useState, useEffect } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../firebase/firebaseConfig';

const AuthContext = createContext();

export const useAuth = () => {
  return useContext(AuthContext);
};

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [loadingAuth, setLoadingAuth] = useState(true); // To track auth state loading

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        // User is signed in, see docs for a list of available properties
        // https://firebase.google.com/docs/reference/js/firebase.User
        const userDocRef = doc(db, "users", user.uid);
        const userDocSnap = await getDoc(userDocRef);
        if (userDocSnap.exists()) {
          const userData = userDocSnap.data();
          setCurrentUser({
            uid: user.uid,
            email: user.email,
            displayName: userData.displayName,
            role: userData.role,
            profileImageUrl: userData.profileImageUrl
            // Add any other essential user details you store in the 'users' doc
          });
        } else {
          // This might happen if a user exists in Auth but not in Firestore (e.g., incomplete signup)
          // Or if the user was deleted from Firestore but not Auth.
          console.warn("User document not found in Firestore for UID:", user.uid);
          setCurrentUser(null); // Treat as not fully logged in or handle appropriately
        }
      } else {
        // User is signed out
        setCurrentUser(null);
      }
      setLoadingAuth(false);
    });

    // Cleanup subscription on unmount
    return unsubscribe;
  }, []);

  const value = {
    currentUser,
    setCurrentUser, // Potentially for manual updates if needed, though onAuthStateChanged is primary
    loadingAuth
  };

  const logout = () => {
    return auth.signOut();
  };

  const value = {
    currentUser,
    setCurrentUser, // Potentially for manual updates if needed
    loadingAuth,
    logout // Add logout function to context
  };

  // Don't render children until auth state is determined to prevent flicker
  // or rendering protected content prematurely.
  return (
    <AuthContext.Provider value={value}>
      {!loadingAuth && children}
    </AuthContext.Provider>
  );
};
