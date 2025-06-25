import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import CreateCampaignPage from './CreateCampaignPage'; // Adjust path
import { AuthContext } from '../contexts/AuthContext'; // Adjust path

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
const mockAddDoc = vi.fn();
const mockTimestampFromDate = vi.fn((date) => ({
  toDate: () => date,
  seconds: date.getTime() / 1000,
  nanoseconds: 0,
}));

vi.mock('../firebase/firebaseConfig', () => ({
  db: {},
}));

vi.mock('firebase/firestore', () => ({
  collection: (...args) => ({ path: args.join('/') }), // Mock collection ref
  addDoc: (collectionRef, data) => mockAddDoc(collectionRef, data),
  Timestamp: {
    fromDate: (date) => mockTimestampFromDate(date),
  },
}));

const mockBusinessUser = {
  uid: 'business123',
  displayName: 'Test Business Inc.',
  role: 'business',
};

const mockInfluencerUser = {
  uid: 'influencer123',
  displayName: 'Test Influencer',
  role: 'influencer',
};

const renderCreateCampaignPage = (currentUser = mockBusinessUser) => {
  mockAddDoc.mockResolvedValue({ id: 'new-campaign-id-123' }); // Default successful creation

  return render(
    <BrowserRouter>
      <AuthContext.Provider value={{ currentUser, loadingAuth: false, logout: vi.fn() }}>
        <CreateCampaignPage />
      </AuthContext.Provider>
    </BrowserRouter>
  );
};

describe('CreateCampaignPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset timer mocks if any tests use them (e.g., for setTimeout in component)
    vi.useRealTimers();
  });

  it('renders the create campaign form correctly for a business user', () => {
    renderCreateCampaignPage();
    expect(screen.getByLabelText(/campaign title/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/campaign description/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/key deliverables/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/budget \(usd\)/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/target niche\/category/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /create campaign/i })).toBeInTheDocument();
  });

  it('redirects or shows error if user is not a business or not logged in', () => {
    // Test with influencer user
    renderCreateCampaignPage(mockInfluencerUser);
    expect(screen.getByText(/you are not authorized to view this page/i)).toBeInTheDocument();
    // navigate('/') should have been called by component's own check
    expect(mockNavigate).toHaveBeenCalledWith('/');
    mockNavigate.mockClear(); // Clear for next check

    // Test with no user
    renderCreateCampaignPage(null);
    // navigate('/login') should have been called
    expect(mockNavigate).toHaveBeenCalledWith('/login');
  });

  it('allows typing in form fields', async () => {
    const user = userEvent.setup();
    renderCreateCampaignPage();

    await user.type(screen.getByLabelText(/campaign title/i), 'Summer Sale Campaign');
    expect(screen.getByLabelText(/campaign title/i)).toHaveValue('Summer Sale Campaign');

    await user.type(screen.getByLabelText(/budget \(usd\)/i), '1500');
    expect(screen.getByLabelText(/budget \(usd\)/i)).toHaveValue(1500);
  });

  it('shows validation error if required fields are empty', async () => {
    const user = userEvent.setup();
    renderCreateCampaignPage();

    // Only fill budget to trigger other errors
    await user.type(screen.getByLabelText(/budget \(usd\)/i), '100');
    await user.click(screen.getByRole('button', { name: /create campaign/i }));

    expect(await screen.findByText(/please fill in all required fields: title, description, deliverables./i)).toBeInTheDocument();
    expect(mockAddDoc).not.toHaveBeenCalled();
  });

  it('shows validation error if budget is not a positive number', async () => {
    const user = userEvent.setup();
    renderCreateCampaignPage();

    await user.type(screen.getByLabelText(/campaign title/i), 'Test Title');
    await user.type(screen.getByLabelText(/campaign description/i), 'Test Desc');
    await user.type(screen.getByLabelText(/key deliverables/i), 'Test Dels');
    await user.type(screen.getByLabelText(/budget \(usd\)/i), '0'); // Invalid budget

    await user.click(screen.getByRole('button', { name: /create campaign/i }));

    expect(await screen.findByText(/budget must be a positive number./i)).toBeInTheDocument();
    expect(mockAddDoc).not.toHaveBeenCalled();
  });

  it('submits the form and calls Firestore addDoc on successful creation', async () => {
    vi.useFakeTimers(); // For the setTimeout navigation
    const user = userEvent.setup();
    renderCreateCampaignPage();

    const campaignData = {
      title: 'Awesome Campaign',
      description: 'This is a great campaign.',
      deliverables: '1 video, 2 posts',
      budget: '2000',
      niche: 'Tech',
    };

    await user.type(screen.getByLabelText(/campaign title/i), campaignData.title);
    await user.type(screen.getByLabelText(/campaign description/i), campaignData.description);
    await user.type(screen.getByLabelText(/key deliverables/i), campaignData.deliverables);
    await user.type(screen.getByLabelText(/budget \(usd\)/i), campaignData.budget);
    await user.type(screen.getByLabelText(/target niche\/category/i), campaignData.niche);

    await user.click(screen.getByRole('button', { name: /create campaign/i }));

    await waitFor(() => {
      expect(mockAddDoc).toHaveBeenCalledTimes(1);
      expect(mockAddDoc).toHaveBeenCalledWith(
        { path: 'campaigns' }, // Mocked collection path
        expect.objectContaining({
          businessId: mockBusinessUser.uid,
          businessName: mockBusinessUser.displayName,
          title: campaignData.title,
          description: campaignData.description,
          deliverables: campaignData.deliverables,
          budget: parseFloat(campaignData.budget),
          niche: campaignData.niche.toLowerCase(),
          status: 'open',
          proposalsCount: 0,
          // createdAt will be a mocked Timestamp object
        })
      );
    });

    expect(await screen.findByText('Campaign created successfully!')).toBeInTheDocument();

    // Test navigation after timeout
    await act(async () => {
        vi.advanceTimersByTime(2000);
    });
    expect(mockNavigate).toHaveBeenCalledWith('/business/dashboard');
    vi.useRealTimers();
  });

  it('shows an error message if Firestore addDoc fails', async () => {
    const user = userEvent.setup();
    mockAddDoc.mockRejectedValue(new Error('Firestore save failed'));
    renderCreateCampaignPage();

    // Fill form with valid data
    await user.type(screen.getByLabelText(/campaign title/i), 'Valid Title');
    await user.type(screen.getByLabelText(/campaign description/i), 'Valid Desc');
    await user.type(screen.getByLabelText(/key deliverables/i), 'Valid Dels');
    await user.type(screen.getByLabelText(/budget \(usd\)/i), '500');

    await user.click(screen.getByRole('button', { name: /create campaign/i }));

    expect(await screen.findByText('Failed to create campaign. Please try again.')).toBeInTheDocument();
    expect(mockNavigate).not.toHaveBeenCalled();
  });
});
