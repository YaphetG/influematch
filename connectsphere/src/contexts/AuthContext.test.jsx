import React from 'react';
import { render, screen, act, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { AuthProvider, useAuth } from './AuthContext'; // Adjust path

// Mock Firebase services
let mockOnAuthStateChangedCallback;
const mockUnsubscribe = vi.fn();
const mockSignOut = vi.fn();
const mockGetDoc = vi.fn();

vi.mock('../firebase/firebaseConfig', () => ({
  auth: {}, // Actual auth object isn't directly used by AuthProvider, but by getAuth
  db: {},   // Actual db object isn't directly used by AuthProvider, but by getFirestore
}));

vi.mock('firebase/auth', () => ({
  getAuth: vi.fn(() => ({ // Mock getAuth to return an object that onAuthStateChanged can be called on
    // ... other auth service methods if needed by AuthProvider directly
  })),
  onAuthStateChanged: vi.fn((auth, callback) => {
    mockOnAuthStateChangedCallback = callback; // Store the callback to simulate auth changes
    return mockUnsubscribe; // Return a mock unsubscribe function
  }),
  signOut: () => mockSignOut(),
}));

vi.mock('firebase/firestore', () => ({
  getFirestore: vi.fn(() => ({})), // Mock getFirestore if used by AuthProvider
  doc: (...args) => ({ path: args.join('/') }),
  getDoc: (docRef) => mockGetDoc(docRef),
}));

// A simple test component to consume the context
const TestConsumerComponent = () => {
  const { currentUser, loadingAuth, logout } = useAuth();
  if (loadingAuth) return <p>Loading auth...</p>;
  return (
    <div>
      {currentUser ? (
        <>
          <p data-testid="user-uid">{currentUser.uid}</p>
          <p data-testid="user-email">{currentUser.email}</p>
          <p data-testid="user-role">{currentUser.role}</p>
          <p data-testid="user-displayName">{currentUser.displayName}</p>
          <button onClick={logout}>Logout</button>
        </>
      ) : (
        <p>No user</p>
      )}
    </div>
  );
};

describe('AuthContext', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockOnAuthStateChangedCallback = undefined; // Reset
    // Default Firestore doc to exist with some data
    mockGetDoc.mockResolvedValue({
      exists: () => true,
      data: () => ({ role: 'test-role', displayName: 'Test User Name', profileImageUrl: 'test.jpg' }),
    });
    mockSignOut.mockResolvedValue(undefined);
  });

  afterEach(() => {
    // Ensure any timers or pending async operations are cleared if necessary
  });

  it('initializes with loadingAuth true and then sets currentUser to null if no user is signed in', async () => {
    render(
      <AuthProvider>
        <TestConsumerComponent />
      </AuthProvider>
    );
    expect(screen.getByText('Loading auth...')).toBeInTheDocument();

    // Simulate Firebase onAuthStateChanged callback with no user
    await act(async () => {
      if (mockOnAuthStateChangedCallback) {
        mockOnAuthStateChangedCallback(null);
      }
    });

    await waitFor(() => {
      expect(screen.getByText('No user')).toBeInTheDocument();
    });
  });

  it('sets currentUser with Firestore data when a user signs in', async () => {
    const mockUser = { uid: 'user123', email: 'user@example.com' };
    render(
      <AuthProvider>
        <TestConsumerComponent />
      </AuthProvider>
    );

    // Simulate Firebase onAuthStateChanged callback with a user
    await act(async () => {
      if (mockOnAuthStateChangedCallback) {
        mockOnAuthStateChangedCallback(mockUser);
      }
    });

    await waitFor(() => {
      expect(screen.getByTestId('user-uid')).toHaveTextContent('user123');
      expect(screen.getByTestId('user-email')).toHaveTextContent('user@example.com');
      expect(screen.getByTestId('user-role')).toHaveTextContent('test-role');
      expect(screen.getByTestId('user-displayName')).toHaveTextContent('Test User Name');
    });
    expect(mockGetDoc).toHaveBeenCalledTimes(1);
    // expect(mockGetDoc).toHaveBeenCalledWith({ path: 'users/user123' });
  });

  it('sets currentUser to null if Firestore document does not exist for a signed-in user', async () => {
    const mockUser = { uid: 'user-no-doc', email: 'nodoc@example.com' };
    mockGetDoc.mockResolvedValue({ exists: () => false }); // Simulate Firestore doc not found
    render(
      <AuthProvider>
        <TestConsumerComponent />
      </AuthProvider>
    );

    await act(async () => {
      if (mockOnAuthStateChangedCallback) {
        mockOnAuthStateChangedCallback(mockUser);
      }
    });

    await waitFor(() => {
      expect(screen.getByText('No user')).toBeInTheDocument();
    });
    expect(mockGetDoc).toHaveBeenCalledTimes(1);
  });

  it('calls Firebase signOut and updates currentUser on logout', async () => {
    const mockUser = { uid: 'user123', email: 'user@example.com' };
    render(
      <AuthProvider>
        <TestConsumerComponent />
      </AuthProvider>
    );

    // 1. Simulate user signs in
    await act(async () => {
      if (mockOnAuthStateChangedCallback) {
        mockOnAuthStateChangedCallback(mockUser);
      }
    });
    await waitFor(() => expect(screen.getByTestId('user-uid')).toBeInTheDocument());

    // 2. Click logout button
    await act(async () => {
      screen.getByRole('button', { name: /logout/i }).click();
    });

    expect(mockSignOut).toHaveBeenCalledTimes(1);

    // 3. Simulate onAuthStateChanged being called again with null (as a result of signOut)
    await act(async () => {
      if (mockOnAuthStateChangedCallback) {
        mockOnAuthStateChangedCallback(null);
      }
    });

    await waitFor(() => {
      expect(screen.getByText('No user')).toBeInTheDocument();
    });
  });

  it('unsubscribes from onAuthStateChanged on unmount', () => {
    const { unmount } = render(
      <AuthProvider>
        <TestConsumerComponent />
      </AuthProvider>
    );
    unmount();
    expect(mockUnsubscribe).toHaveBeenCalledTimes(1);
  });
});
