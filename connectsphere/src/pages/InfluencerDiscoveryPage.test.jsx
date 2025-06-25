import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import InfluencerDiscoveryPage from './InfluencerDiscoveryPage'; // Adjust path
import { AuthContext } from '../contexts/AuthContext'; // Adjust path
import * as Firestore from 'firebase/firestore'; // Import all of firestore to spy on getDoc

// Mock Firebase services
const mockGetDocs = vi.fn();
const mockQuery = vi.fn((ref, ...constraints) => ({ ref, constraints }));
const mockWhere = vi.fn((field, op, value) => ({ type: 'where', field, op, value }));

vi.mock('../firebase/firebaseConfig', () => ({
  db: {},
}));

// Mock only specific functions from 'firebase/firestore' that are used directly
// getDoc is aliased as getFirestoreDoc in the component, so we mock the original 'getDoc'
vi.mock('firebase/firestore', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual, // Keep actual implementations for things not mocked
    collection: (...args) => ({ path: args.join('/') }),
    query: mockQuery,
    where: mockWhere,
    getDocs: (q) => mockGetDocs(q),
    // getDoc will be spied on and mocked per test case using vi.spyOn if needed for profiles
    // doc: actual.doc // Keep actual doc unless specific mocking needed for its path
  };
});

const mockBusinessUser = {
  uid: 'business123',
  displayName: 'Test Business Discoverer',
  role: 'business',
};

const mockInfluencersData = [
  { id: 'inf1', displayName: 'Alice Wonderland', mainRole: 'influencer', profileImageUrl:'', email:'aw@example.com', niche: 'travel', bio: 'Exploring the world', location: 'Global', audienceSize: 150000 },
  { id: 'inf2', displayName: 'Bob The Builder', mainRole: 'influencer', profileImageUrl:'', email:'btb@example.com', niche: 'diy', bio: 'Building amazing things', location: 'New York, USA', audienceSize: 75000 },
  { id: 'inf3', displayName: 'Charlie Coder', mainRole: 'influencer', profileImageUrl:'', email:'cc@example.com', niche: 'technology', bio: 'Coding and tech reviews', location: 'San Francisco, USA', audienceSize: 200000 },
  { id: 'inf4', displayName: 'Diana Diva', mainRole: 'influencer', profileImageUrl:'', email:'dd@example.com', niche: 'fashion', bio: 'Latest fashion trends', location: 'Paris, France', audienceSize: 500000 },
  { id: 'inf5', displayName: 'Edward Eater', mainRole: 'influencer', profileImageUrl:'', email:'ee@example.com', niche: 'food', bio: 'Gourmet food experiences', location: 'London, UK', audienceSize: 90000 },
  { id: 'inf6', displayName: 'Techie Tom', mainRole: 'influencer', profileImageUrl:'', email:'tt@example.com', niche: 'technology', bio: 'Gadgets and gizmos', location: 'Austin, USA', audienceSize: 120000 },
];

// Spy for firestore's getDoc
let getDocSpy;

const renderDiscoveryPage = (currentUser = mockBusinessUser, influencers = mockInfluencersData) => {
  // Mock for the initial query to the 'users' collection
  mockGetDocs.mockImplementation(async (q) => {
    if (q.constraints?.some(c => c.field === 'role' && c.value === 'influencer')) {
      return {
        docs: influencers.map(inf => ({
            id: inf.id,
            data: () => ({
                displayName: inf.displayName,
                email: inf.email,
                profileImageUrl: inf.profileImageUrl,
                role: inf.mainRole
            })
        })),
        empty: influencers.length === 0,
      };
    }
    return { docs: [], empty: true }; // Default for other queries
  });

  // Mock for the profile subcollection fetches (getFirestoreDoc which is an alias for getDoc)
  getDocSpy = vi.spyOn(Firestore, 'getDoc').mockImplementation(async (docRef) => {
    const pathParts = docRef.path.split('/');
    if (pathParts.length === 4 && pathParts[0] === 'users' && pathParts[2] === 'profile') {
      const influencerId = pathParts[1];
      const profileData = influencers.find(inf => inf.id === influencerId);
      if (profileData) {
        const { id, mainRole, displayName, email, profileImageUrl, ...restOfProfile } = profileData;
        return { exists: () => true, data: () => restOfProfile, id: influencerId };
      }
    }
    return { exists: () => false, data: () => undefined };
  });

  return render(
    <BrowserRouter>
      <AuthContext.Provider value={{ currentUser, loadingAuth: false, logout: vi.fn() }}>
        <InfluencerDiscoveryPage />
      </AuthContext.Provider>
    </BrowserRouter>
  );
};

describe('InfluencerDiscoveryPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });
  afterEach(() => {
    if(getDocSpy) getDocSpy.mockRestore(); // Restore spy after each test
  });

  it('renders loading state and then displays influencers', async () => {
    renderDiscoveryPage();
    expect(screen.getByText(/loading influencer profiles.../i)).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByText(mockInfluencersData[0].displayName)).toBeInTheDocument();
      expect(screen.getByText(mockInfluencersData[1].displayName)).toBeInTheDocument();
    });
  });

  it('displays filter inputs for search, niche, location, and audience size', async () => {
    renderDiscoveryPage();
    await waitFor(() => expect(screen.getByText(mockInfluencersData[0].displayName)).toBeInTheDocument()); // Ensure loaded

    expect(screen.getByPlaceholderText(/name, niche, bio keywords.../i)).toBeInTheDocument();
    expect(screen.getByLabelText(/niche/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/location/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/min audience/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/max audience/i)).toBeInTheDocument();
  });

  it('filters by location', async () => {
    const user = userEvent.setup();
    renderDiscoveryPage();
    await waitFor(() => expect(screen.getByText(mockInfluencersData[0].displayName)).toBeInTheDocument());

    const locationInput = screen.getByLabelText(/location/i);
    await user.type(locationInput, 'USA');

    await waitFor(() => {
      expect(screen.getByText('Bob The Builder')).toBeInTheDocument(); // New York, USA
      expect(screen.getByText('Charlie Coder')).toBeInTheDocument(); // San Francisco, USA
      expect(screen.getByText('Techie Tom')).toBeInTheDocument(); // Austin, USA
      expect(screen.queryByText('Alice Wonderland')).not.toBeInTheDocument(); // Global
      expect(screen.queryByText('Diana Diva')).not.toBeInTheDocument(); // Paris, France
    });
  });

  it('filters by min audience size', async () => {
    const user = userEvent.setup();
    renderDiscoveryPage();
    await waitFor(() => expect(screen.getByText(mockInfluencersData[0].displayName)).toBeInTheDocument());

    const minAudienceInput = screen.getByLabelText(/min audience/i);
    await user.type(minAudienceInput, '100000'); // >= 100k

    await waitFor(() => {
      expect(screen.getByText('Alice Wonderland')).toBeInTheDocument(); // 150k
      expect(screen.getByText('Charlie Coder')).toBeInTheDocument(); // 200k
      expect(screen.getByText('Diana Diva')).toBeInTheDocument(); // 500k
      expect(screen.getByText('Techie Tom')).toBeInTheDocument(); // 120k
      expect(screen.queryByText('Bob The Builder')).not.toBeInTheDocument(); // 75k
      expect(screen.queryByText('Edward Eater')).not.toBeInTheDocument(); // 90k
    });
  });

  it('filters by max audience size', async () => {
    const user = userEvent.setup();
    renderDiscoveryPage();
    await waitFor(() => expect(screen.getByText(mockInfluencersData[0].displayName)).toBeInTheDocument());

    const maxAudienceInput = screen.getByLabelText(/max audience/i);
    await user.type(maxAudienceInput, '100000'); // <= 100k

    await waitFor(() => {
      expect(screen.getByText('Bob The Builder')).toBeInTheDocument(); // 75k
      expect(screen.getByText('Edward Eater')).toBeInTheDocument(); // 90k
      expect(screen.queryByText('Alice Wonderland')).not.toBeInTheDocument(); // 150k
    });
  });

  it('filters by audience size range (min and max)', async () => {
    const user = userEvent.setup();
    renderDiscoveryPage();
    await waitFor(() => expect(screen.getByText(mockInfluencersData[0].displayName)).toBeInTheDocument());

    const minAudienceInput = screen.getByLabelText(/min audience/i);
    await user.type(minAudienceInput, '80000');
    const maxAudienceInput = screen.getByLabelText(/max audience/i);
    await user.type(maxAudienceInput, '160000');

    await waitFor(() => {
      expect(screen.getByText('Alice Wonderland')).toBeInTheDocument(); // 150k
      expect(screen.getByText('Edward Eater')).toBeInTheDocument(); // 90k
      expect(screen.getByText('Techie Tom')).toBeInTheDocument(); // 120k
      expect(screen.queryByText('Bob The Builder')).not.toBeInTheDocument(); // 75k
      expect(screen.queryByText('Charlie Coder')).not.toBeInTheDocument(); // 200k
    });
  });

  it('combines search term, niche, location, and audience filters', async () => {
    const user = userEvent.setup();
    renderDiscoveryPage();
    await waitFor(() => expect(screen.getByText(mockInfluencersData[0].displayName)).toBeInTheDocument());

    // Search: "tech"
    const searchInput = screen.getByPlaceholderText(/name, niche, bio keywords.../i);
    await user.type(searchInput, 'tech');

    // Niche: "technology"
    const nicheSelect = screen.getByLabelText(/niche/i);
    await waitFor(() => expect(screen.getByRole('option', { name: /technology/i })).toBeInTheDocument());
    await user.selectOptions(nicheSelect, 'technology');

    // Location: "USA"
    const locationInput = screen.getByLabelText(/location/i);
    await user.type(locationInput, 'USA');

    // Audience: 100k - 250k
    const minAudienceInput = screen.getByLabelText(/min audience/i);
    await user.type(minAudienceInput, '100000');
    const maxAudienceInput = screen.getByLabelText(/max audience/i);
    await user.type(maxAudienceInput, '250000');

    // Expected: Charlie Coder (200k, tech, San Francisco, USA)
    // Techie Tom (120k, tech, Austin, USA)
    await waitFor(() => {
      expect(screen.getByText('Charlie Coder')).toBeInTheDocument();
      expect(screen.getByText('Techie Tom')).toBeInTheDocument();
      expect(screen.queryByText('Alice Wonderland')).not.toBeInTheDocument();
      expect(screen.queryByText('Bob The Builder')).not.toBeInTheDocument();
      expect(screen.queryByText('Diana Diva')).not.toBeInTheDocument();
      expect(screen.queryByText('Edward Eater')).not.toBeInTheDocument();
    });
  });
});
