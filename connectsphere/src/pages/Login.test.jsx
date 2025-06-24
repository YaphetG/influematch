import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import Login from './Login'; // Adjust path as necessary
import { AuthProvider } from '../contexts/AuthContext'; // To provide context if Login uses useAuth directly

// Mock react-router-dom
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

// Mock Firebase services
const mockSignInWithEmailAndPassword = vi.fn();
const mockGetDoc = vi.fn();

vi.mock('../firebase/firebaseConfig', () => ({
  auth: {}, // Placeholder for auth object
  db: {},   // Placeholder for db object
}));

vi.mock('firebase/auth', () => ({
  signInWithEmailAndPassword: (auth, email, password) => mockSignInWithEmailAndPassword(auth, email, password),
}));

vi.mock('firebase/firestore', () => ({
  doc: (...args) => ({ path: args.join('/') }), // Mock doc reference
  getDoc: (docRef) => mockGetDoc(docRef),      // Mock getDoc
}));

// Mock AuthContext if Login directly uses setCurrentUser from useAuth
// However, Login.jsx currently relies on onAuthStateChanged in AuthProvider to set the user.
// For this test, we are primarily testing Login's own logic.
// If direct context manipulation was done in Login, we'd mock useAuth.
// For now, AuthProvider is wrapped to ensure any context dependencies don't break rendering.


describe('Login Page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const renderLogin = () => {
    render(
      <BrowserRouter>
        {/* Wrapping with AuthProvider in case any child component or hook within Login expects it */}
        {/* For a pure unit test of Login, if it doesn't use useAuth directly, AuthProvider might not be strictly needed */}
        {/* but it's safer for integration aspects. */}
        <AuthProvider>
          <Login />
        </AuthProvider>
      </BrowserRouter>
    );
  };

  it('renders the login form correctly', () => {
    renderLogin();
    expect(screen.getByPlaceholderText('Email address')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Password')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /log in/i })).toBeInTheDocument();
    expect(screen.getByText(/don't have an account\?/i)).toBeInTheDocument();
  });

  it('allows typing in email and password fields', async () => {
    const user = userEvent.setup();
    renderLogin();

    await user.type(screen.getByPlaceholderText('Email address'), 'test@example.com');
    expect(screen.getByPlaceholderText('Email address')).toHaveValue('test@example.com');

    await user.type(screen.getByPlaceholderText('Password'), 'password123');
    expect(screen.getByPlaceholderText('Password')).toHaveValue('password123');
  });

  it('calls Firebase auth and navigates on successful login (business role)', async () => {
    const user = userEvent.setup();
    const testEmail = 'business@example.com';
    const testPassword = 'password123';

    mockSignInWithEmailAndPassword.mockResolvedValue({
      user: { uid: 'business-uid-123', email: testEmail },
    });
    mockGetDoc.mockResolvedValue({
      exists: () => true,
      data: () => ({ role: 'business', displayName: 'Test Business' }),
    });

    renderLogin();

    await user.type(screen.getByPlaceholderText('Email address'), testEmail);
    await user.type(screen.getByPlaceholderText('Password'), testPassword);
    await user.click(screen.getByRole('button', { name: /log in/i }));

    await waitFor(() => {
      expect(mockSignInWithEmailAndPassword).toHaveBeenCalledTimes(1);
      expect(mockSignInWithEmailAndPassword).toHaveBeenCalledWith(expect.anything(), testEmail, testPassword);
    });

    await waitFor(() => {
      expect(mockGetDoc).toHaveBeenCalledTimes(1);
      // We can check the path of the doc if the mock for doc() was more specific
      // expect(mockGetDoc).toHaveBeenCalledWith({ path: 'users/business-uid-123' });
    });

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/business/dashboard');
    });
  });

  it('calls Firebase auth and navigates on successful login (influencer role)', async () => {
    const user = userEvent.setup();
    const testEmail = 'influencer@example.com';
    const testPassword = 'password123';

    mockSignInWithEmailAndPassword.mockResolvedValue({
      user: { uid: 'influencer-uid-123', email: testEmail },
    });
    mockGetDoc.mockResolvedValue({
      exists: () => true,
      data: () => ({ role: 'influencer', displayName: 'Test Influencer' }),
    });

    renderLogin();

    await user.type(screen.getByPlaceholderText('Email address'), testEmail);
    await user.type(screen.getByPlaceholderText('Password'), testPassword);
    await user.click(screen.getByRole('button', { name: /log in/i }));

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/influencer/dashboard');
    });
  });

  it('shows error message on login failure (e.g., wrong password)', async () => {
    const user = userEvent.setup();
    mockSignInWithEmailAndPassword.mockRejectedValue({
      code: 'auth/wrong-password',
      message: 'Invalid password.',
    });
    renderLogin();

    await user.type(screen.getByPlaceholderText('Email address'), 'test@example.com');
    await user.type(screen.getByPlaceholderText('Password'), 'wrongpassword');
    await user.click(screen.getByRole('button', { name: /log in/i }));

    expect(await screen.findByText('Invalid email or password.')).toBeInTheDocument();
    expect(mockGetDoc).not.toHaveBeenCalled();
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('shows error if user document not found in Firestore after successful auth', async () => {
    const user = userEvent.setup();
    const testEmail = 'test@example.com';

    mockSignInWithEmailAndPassword.mockResolvedValue({
      user: { uid: 'no-firestore-doc-uid', email: testEmail },
    });
    mockGetDoc.mockResolvedValue({ // Simulate Firestore document not existing
      exists: () => false,
    });
    renderLogin();

    await user.type(screen.getByPlaceholderText('Email address'), testEmail);
    await user.type(screen.getByPlaceholderText('Password'), 'password123');
    await user.click(screen.getByRole('button', { name: /log in/i }));

    expect(await screen.findByText('User data not found. Please contact support.')).toBeInTheDocument();
    expect(mockNavigate).not.toHaveBeenCalled();
  });
});
