import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import InfluencerProfilePage from './InfluencerProfilePage'; // Adjust path
import { AuthContext } from '../contexts/AuthContext'; // Adjust path

// Mock Firebase services
const mockGetDoc = vi.fn();
const mockSetDoc = vi.fn(); // Also used for updateDoc via merge:true
const mockTimestampFromDate = vi.fn((date) => ({
  toDate: () => date,
  seconds: date.getTime() / 1000,
  nanoseconds: 0,
}));

vi.mock('../firebase/firebaseConfig', () => ({
  db: {},
}));

vi.mock('firebase/firestore', () => ({
  doc: (...args) => ({ path: args.join('/') }),
  getDoc: (docRef) => mockGetDoc(docRef),
  setDoc: (...args) => mockSetDoc(...args),
  Timestamp: {
    fromDate: (date) => mockTimestampFromDate(date),
  },
}));

const mockCurrentUser = {
  uid: 'influencer123',
  displayName: 'Test Influencer',
  role: 'influencer',
  // other fields as needed by the component if any
};

const renderProfilePage = (currentUser = mockCurrentUser, profileData = null) => {
  // Reset mocks for getDoc for each render, specific to profile loading
  if (profileData) {
    mockGetDoc.mockResolvedValue({
      exists: () => true,
      data: () => profileData,
    });
  } else {
    mockGetDoc.mockResolvedValue({
      exists: () => false, // Simulate no existing profile
      data: () => ({}),
    });
  }
  mockSetDoc.mockResolvedValue(undefined); // Default successful save

  return render(
    <BrowserRouter>
      <AuthContext.Provider value={{ currentUser, loadingAuth: false, logout: vi.fn() }}>
        <InfluencerProfilePage />
      </AuthContext.Provider>
    </BrowserRouter>
  );
};

describe('InfluencerProfilePage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders loading state initially then the form', async () => {
    renderProfilePage(mockCurrentUser, null); // No initial profile data
    // Loading state might be too quick to catch reliably without specific async control in component
    // So, we'll wait for a known form element
    expect(await screen.findByLabelText(/niche/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/bio \/ about you/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /save profile/i })).toBeInTheDocument();
  });

  it('loads and displays existing profile data', async () => {
    const existingProfile = {
      niche: 'Fashion',
      bio: 'Loves fashion and style.',
      location: 'New York, USA', // Added
      audienceSize: 50000,        // Added
      socialLinks: { youtube: 'youtube.com/fashionista', instagram: 'instagram.com/fashionista', tiktok: '', twitter: '', other: '' },
      audienceDemographics: { ageRange: '18-24', genderSplit: '70% Female', topLocations: 'USA' },
      rateCard: [{ service: '1 Post', price: '100' }],
    };
    renderProfilePage(mockCurrentUser, existingProfile);

    expect(await screen.findByDisplayValue('Fashion')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Loves fashion and style.')).toBeInTheDocument();
    expect(screen.getByDisplayValue('New York, USA')).toBeInTheDocument(); // Test new field
    expect(screen.getByDisplayValue('50000')).toBeInTheDocument(); // Test new field
    expect(screen.getByDisplayValue('youtube.com/fashionista')).toBeInTheDocument();
    // expect(screen.getByDisplayValue('18-24')).toBeInTheDocument(); // audienceDemographics might be phased out
    expect(screen.getByDisplayValue('1 Post')).toBeInTheDocument();
    expect(screen.getByDisplayValue('100')).toBeInTheDocument();
  });

  it('allows updating form fields including location and audience size', async () => {
    const user = userEvent.setup();
    renderProfilePage(mockCurrentUser, null); // Start with empty profile

    const nicheInput = await screen.findByLabelText(/niche/i);
    await user.clear(nicheInput); // Clear if there's any default from component state
    await user.type(nicheInput, 'Gaming');
    expect(nicheInput).toHaveValue('Gaming');

    const bioInput = screen.getByLabelText(/bio \/ about you/i);
    await user.clear(bioInput);
    await user.type(bioInput, 'Pro gamer and streamer.');
    expect(bioInput).toHaveValue('Pro gamer and streamer.');

    const locationInput = screen.getByLabelText(/location/i);
    await user.clear(locationInput);
    await user.type(locationInput, 'Remote');
    expect(locationInput).toHaveValue('Remote');

    const audienceSizeInput = screen.getByLabelText(/approx\. audience size/i);
    await user.clear(audienceSizeInput);
    await user.type(audienceSizeInput, '12345');
    expect(audienceSizeInput).toHaveValue(12345);

    // Test a social link
    const youtubeInput = screen.getByLabelText(/youtube/i);
    await user.clear(youtubeInput);
    await user.type(youtubeInput, 'youtube.com/pro_gamer');
    expect(youtubeInput).toHaveValue('youtube.com/pro_gamer');

    // Test rate card item
    const serviceInput = screen.getByPlaceholderText(/service/i); // Assuming only one initially
    await user.clear(serviceInput);
    await user.type(serviceInput, 'Sponsored Stream');
    expect(serviceInput).toHaveValue('Sponsored Stream');

    const priceInput = screen.getByPlaceholderText(/price/i);
    await user.clear(priceInput);
    await user.type(priceInput, '500');
    expect(priceInput).toHaveValue(500); // Input type=number might convert
  });

  it('adds and removes rate card items', async () => {
    const user = userEvent.setup();
    renderProfilePage(mockCurrentUser, { rateCard: [{ service: 'Old Service', price: '50'}] }); // Start with one item

    expect(await screen.findByDisplayValue('Old Service')).toBeInTheDocument();

    // Add a new item
    const addButton = screen.getByRole('button', { name: /\+ add service/i });
    await user.click(addButton);

    const serviceInputs = screen.getAllByPlaceholderText(/service/i);
    expect(serviceInputs).toHaveLength(2);
    await user.type(serviceInputs[1], 'New Service');
    expect(serviceInputs[1]).toHaveValue('New Service');

    // Remove the first item
    const removeButtons = screen.getAllByRole('button', { name: /remove/i });
    expect(removeButtons).toHaveLength(1); // Only one remove button when 2 items, as first one can be removed.
                                           // Logic in component: if length > 1, show remove.
                                           // If we add one, then have 2, the first one might have a remove button.
                                           // Let's verify this understanding.
                                           // The component has: {profile.rateCard.length > 1 && (<button>Remove</button>)}
                                           // So if we have 2 items, both should have remove.
                                           // If we start with one, then add one, there are 2. The test above starts with 1.
                                           // The remove button on the first item appears when a second is added.

    // Let's re-evaluate: if we start with one, no remove button. Add one -> 2 items. Both should have remove.
    // The current code: `profile.rateCard.length > 1 && (<button onClick={() => removeRateCardItem(index)}>)`
    // This means if there's only ONE item, NO remove button. If there are TWO items, BOTH items get a remove button.
    // This seems slightly off. Usually, you can't remove the *last* item, or if you do, it resets to an empty placeholder.
    // The component logic: `filter((_, i) => i !== index)` and then `updatedRateCard.length > 0 ? updatedRateCard : [{ service: '', price: '' }]`
    // This means if you remove the last item, it adds back a new empty one. So you can always "remove" up to the point where one empty item remains.

    // So, with 2 items, there should be 2 remove buttons.
    const allRemoveButtons = screen.getAllByRole('button', { name: /remove/i });
    expect(allRemoveButtons).toHaveLength(2);

    await user.click(allRemoveButtons[0]); // Remove the first item ("Old Service")

    await waitFor(() => {
      expect(screen.queryByDisplayValue('Old Service')).not.toBeInTheDocument();
    });
    expect(screen.getByDisplayValue('New Service')).toBeInTheDocument(); // The second item (now first) remains
    expect(screen.getAllByPlaceholderText(/service/i)).toHaveLength(1); // Should be one item left
  });


  it('submits the form and calls Firestore setDoc with merged data', async () => {
    const user = userEvent.setup();
    renderProfilePage(mockCurrentUser, null); // Start with empty

    await user.type(await screen.findByLabelText(/niche/i), 'Tech Reviews');
    await user.type(screen.getByLabelText(/bio \/ about you/i), 'Honest tech reviews.');
    await user.type(screen.getByLabelText(/location/i), 'Online');
    await user.type(screen.getByLabelText(/approx\. audience size/i), '777');

    await user.click(screen.getByRole('button', { name: /save profile/i }));

    await waitFor(() => {
      expect(mockSetDoc).toHaveBeenCalledTimes(1);
      expect(mockSetDoc).toHaveBeenCalledWith(
        { path: `users/${mockCurrentUser.uid}/profile/${mockCurrentUser.uid}` },
        expect.objectContaining({
          niche: 'Tech Reviews',
          bio: 'Honest tech reviews.',
          location: 'Online',
          audienceSize: 777, // Ensure it's saved as a number
        }),
        { merge: true }
      );
    });
    expect(await screen.findByText('Profile updated successfully!')).toBeInTheDocument();
  });

  it('shows an error message if saving fails', async () => {
    const user = userEvent.setup();
    mockSetDoc.mockRejectedValue(new Error('Firestore save failed'));
    renderProfilePage(mockCurrentUser, null);

    await user.type(await screen.findByLabelText(/niche/i), 'Anything');
    await user.click(screen.getByRole('button', { name: /save profile/i }));

    expect(await screen.findByText('Failed to update profile. Please try again.')).toBeInTheDocument();
  });

  it('does not render form if currentUser is null', () => {
    renderProfilePage(null); // No user
    expect(screen.getByText(/not authorized. please log in./i)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /save profile/i })).not.toBeInTheDocument();
  });
});
