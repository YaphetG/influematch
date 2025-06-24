import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import SignUp from './SignUp'; // Adjust path as necessary

// Mock Firebase services
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

const mockCreateUserWithEmailAndPassword = vi.fn();
const mockSetDoc = vi.fn();
const mockTimestampFromDate = vi.fn((date) => ({
  toDate: () => date, // Simplified mock
  seconds: date.getTime() / 1000,
  nanoseconds: 0,
}));

vi.mock('../firebase/firebaseConfig', () => ({
  auth: {
    // Mock any auth properties or methods used directly if any, besides the functions below
  },
  db: {
    // Mock any db properties or methods used directly if any
  },
}));

// Deeper mocks for specific functions used from Firebase SDK
vi.mock('firebase/auth', () => ({
  createUserWithEmailAndPassword: (auth, email, password) => mockCreateUserWithEmailAndPassword(auth, email, password),
  // Add other auth exports if SignUp uses them directly e.g., updateProfile
}));

vi.mock('firebase/firestore', () => ({
  doc: (...args) => ({ path: args.join('/') }), // Simplified mock, good enough if only path is implicitly used
  setDoc: (...args) => mockSetDoc(...args),
  Timestamp: {
    fromDate: (date) => mockTimestampFromDate(date),
  },
  // Add other firestore exports if SignUp uses them directly
}));


describe('SignUp Page', () => {
  beforeEach(() => {
    // Reset mocks before each test
    vi.clearAllMocks();
    // Default successful user creation
    mockCreateUserWithEmailAndPassword.mockResolvedValue({
      user: { uid: 'test-uid-123', email: 'test@example.com' },
    });
    mockSetDoc.mockResolvedValue(undefined); // Firestore operations resolve with undefined on success
  });

  const renderSignUp = () => {
    render(
      <BrowserRouter>
        <SignUp />
      </BrowserRouter>
    );
  };

  it('renders the sign-up form correctly', () => {
    renderSignUp();
    expect(screen.getByPlaceholderText('Display Name')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Email address')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Password')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Confirm Password')).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: /influencer/i })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: /business/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /sign up/i })).toBeInTheDocument();
  });

  it('allows typing in form fields', async () => {
    const user = userEvent.setup();
    renderSignUp();

    await user.type(screen.getByPlaceholderText('Display Name'), 'Test User');
    expect(screen.getByPlaceholderText('Display Name')).toHaveValue('Test User');

    await user.type(screen.getByPlaceholderText('Email address'), 'test@example.com');
    expect(screen.getByPlaceholderText('Email address')).toHaveValue('test@example.com');

    await user.type(screen.getByPlaceholderText('Password'), 'password123');
    expect(screen.getByPlaceholderText('Password')).toHaveValue('password123');

    await user.type(screen.getByPlaceholderText('Confirm Password'), 'password123');
    expect(screen.getByPlaceholderText('Confirm Password')).toHaveValue('password123');

    await user.click(screen.getByRole('radio', { name: /business/i }));
    expect(screen.getByRole('radio', { name: /business/i })).toBeChecked();
  });

  it('shows error if passwords do not match', async () => {
    const user = userEvent.setup();
    renderSignUp();

    await user.type(screen.getByPlaceholderText('Password'), 'password123');
    await user.type(screen.getByPlaceholderText('Confirm Password'), 'password456');
    await user.click(screen.getByRole('button', { name: /sign up/i }));

    expect(await screen.findByText('Passwords do not match.')).toBeInTheDocument();
    expect(mockCreateUserWithEmailAndPassword).not.toHaveBeenCalled();
  });

  it('shows error if display name is empty', async () => {
    const user = userEvent.setup();
    renderSignUp();

    await user.type(screen.getByPlaceholderText('Email address'), 'test@example.com');
    await user.type(screen.getByPlaceholderText('Password'), 'password123');
    await user.type(screen.getByPlaceholderText('Confirm Password'), 'password123');
    await user.click(screen.getByRole('button', { name: /sign up/i }));

    expect(await screen.findByText('Display Name is required.')).toBeInTheDocument();
    expect(mockCreateUserWithEmailAndPassword).not.toHaveBeenCalled();
  });

  it('calls Firebase auth and Firestore on successful sign-up and navigates', async () => {
    const user = userEvent.setup();
    renderSignUp();

    const displayName = 'Test Influencer';
    const email = 'influencer@example.com';
    const password = 'password123';

    await user.type(screen.getByPlaceholderText('Display Name'), displayName);
    await user.type(screen.getByPlaceholderText('Email address'), email);
    await user.type(screen.getByPlaceholderText('Password'), password);
    await user.type(screen.getByPlaceholderText('Confirm Password'), password);
    await user.click(screen.getByRole('radio', { name: /influencer/i })); // Select influencer role

    await user.click(screen.getByRole('button', { name: /sign up/i }));

    await waitFor(() => {
      expect(mockCreateUserWithEmailAndPassword).toHaveBeenCalledTimes(1);
      // auth object from firebaseConfig is implicitly passed, so we don't check it here unless we mock it more deeply
      expect(mockCreateUserWithEmailAndPassword).toHaveBeenCalledWith(expect.anything(), email, password);
    });

    await waitFor(() => {
      expect(mockSetDoc).toHaveBeenCalledTimes(2); // Once for users collection, once for profile subcollection
      // Check users collection document
      expect(mockSetDoc).toHaveBeenCalledWith(
        { path: 'users/test-uid-123' }, // Mocked doc path
        expect.objectContaining({
          uid: 'test-uid-123',
          email: email,
          displayName: displayName,
          role: 'influencer', // Role selected
          profileImageUrl: '',
        })
      );
      // Check profile subcollection document for influencer
      expect(mockSetDoc).toHaveBeenCalledWith(
        { path: 'users/test-uid-123/profile/test-uid-123' },
        expect.objectContaining({
          niche: '', bio: '', socialLinks: {}, audienceDemographics: {}, rateCard: []
        })
      );
    });

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/login');
    });
  });

  it('handles sign-up for business role correctly', async () => {
    const user = userEvent.setup();
    renderSignUp();

    const displayName = 'Test Business Co';
    const email = 'business@example.com';
    const password = 'password123';

    await user.type(screen.getByPlaceholderText('Display Name'), displayName);
    await user.type(screen.getByPlaceholderText('Email address'), email);
    await user.type(screen.getByPlaceholderText('Password'), password);
    await user.type(screen.getByPlaceholderText('Confirm Password'), password);
    await user.click(screen.getByRole('radio', { name: /business/i })); // Select business role

    await user.click(screen.getByRole('button', { name: /sign up/i }));

    await waitFor(() => {
        expect(mockCreateUserWithEmailAndPassword).toHaveBeenCalledWith(expect.anything(), email, password);
    });

    await waitFor(() => {
      expect(mockSetDoc).toHaveBeenCalledTimes(2);
      // Check profile subcollection document for business
      expect(mockSetDoc).toHaveBeenCalledWith(
        { path: 'users/test-uid-123/profile/test-uid-123' },
        expect.objectContaining({
          companyName: '', website: '', businessDescription: ''
        })
      );
    });
  });

  it('shows Firebase error on sign-up failure (e.g., email already in use)', async () => {
    const user = userEvent.setup();
    mockCreateUserWithEmailAndPassword.mockRejectedValue({
      code: 'auth/email-already-in-use',
      message: 'The email address is already in use by another account.',
    });
    renderSignUp();

    await user.type(screen.getByPlaceholderText('Display Name'), 'Test User');
    await user.type(screen.getByPlaceholderText('Email address'), 'used@example.com');
    await user.type(screen.getByPlaceholderText('Password'), 'password123');
    await user.type(screen.getByPlaceholderText('Confirm Password'), 'password123');
    await user.click(screen.getByRole('button', { name: /sign up/i }));

    expect(await screen.findByText('This email address is already in use.')).toBeInTheDocument();
    expect(mockSetDoc).not.toHaveBeenCalled();
    expect(mockNavigate).not.toHaveBeenCalled();
  });
});
