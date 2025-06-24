import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import OpportunityMarketplacePage from './OpportunityMarketplacePage'; // Adjust path
import { AuthContext } from '../contexts/AuthContext'; // Adjust path

// Mock Firebase services
const mockGetDocs = vi.fn();
const mockQuery = vi.fn((ref, ...constraints) => ({ ref, constraints })); // Simplified query mock
const mockWhere = vi.fn((field, op, value) => ({ type: 'where', field, op, value }));
const mockOrderBy = vi.fn((field, direction) => ({ type: 'orderBy', field, direction }));

vi.mock('../firebase/firebaseConfig', () => ({
  db: {},
}));

vi.mock('firebase/firestore', () => ({
  collection: (...args) => ({ path: args.join('/') }),
  query: mockQuery,
  where: mockWhere,
  orderBy: mockOrderBy,
  getDocs: (query) => mockGetDocs(query),
}));

const mockInfluencerUser = {
  uid: 'influencer123',
  displayName: 'Test Influencer',
  role: 'influencer',
};
const mockBusinessUser = { // For testing access denial
  uid: 'business123',
  displayName: 'Test Business',
  role: 'business',
};

const mockCampaigns = [
  { id: 'c1', title: 'Amazing Tech Gadget Launch', businessName: 'Tech Corp', niche: 'technology', budget: 500, description: 'Launch new gadget', status: 'open', createdAt: { toDate: () => new Date() } },
  { id: 'c2', title: 'Summer Fashion Line', businessName: 'Fashion Hub', niche: 'fashion', budget: 1000, description: 'Promote summer clothes', status: 'open', createdAt: { toDate: () => new Date() } },
  { id: 'c3', title: 'Gourmet Food Festival', businessName: 'Foodies Inc.', niche: 'food', budget: 750, description: 'Cover food festival', status: 'open', createdAt: { toDate: () => new Date() } },
  { id: 'c4', title: 'Eco Friendly Product', businessName: 'Green Co.', niche: 'eco', budget: 300, description: 'Promote eco product', status: 'open', createdAt: { toDate: () => new Date() } },
];

const renderMarketplacePage = (currentUser = mockInfluencerUser, campaigns = mockCampaigns) => {
  mockGetDocs.mockResolvedValue({
    docs: campaigns.map(c => ({ id: c.id, data: () => c, exists: () => true })),
    empty: campaigns.length === 0,
  });

  return render(
    <BrowserRouter>
      <AuthContext.Provider value={{ currentUser, loadingAuth: false, logout: vi.fn() }}>
        <OpportunityMarketplacePage />
      </AuthContext.Provider>
    </BrowserRouter>
  );
};

describe('OpportunityMarketplacePage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders loading state and then displays campaigns', async () => {
    renderMarketplacePage();
    expect(screen.getByText(/loading campaigns.../i)).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByText(mockCampaigns[0].title)).toBeInTheDocument();
      expect(screen.getByText(mockCampaigns[1].title)).toBeInTheDocument();
    });
    // Check if query was formed correctly
    expect(mockQuery).toHaveBeenCalledWith(expect.objectContaining({ path: 'campaigns' }),
        expect.objectContaining({ type: 'where', field: 'status', op: '==', value: 'open' }),
        expect.objectContaining({ type: 'orderBy', field: 'createdAt', direction: 'desc' })
    );
  });

  it('shows access denied for non-influencer users', () => {
    renderMarketplacePage(mockBusinessUser);
    expect(screen.getByText(/access denied. this page is for influencers only./i)).toBeInTheDocument();
  });

  it('displays "no campaigns" message if no open campaigns are found', async () => {
    renderMarketplacePage(mockInfluencerUser, []); // Pass empty array
    await waitFor(() => {
      expect(screen.getByText(/no open campaigns match your criteria, or no campaigns available at the moment./i)).toBeInTheDocument();
    });
  });

  it('filters campaigns by search term (title)', async () => {
    const user = userEvent.setup();
    renderMarketplacePage();
    await waitFor(() => expect(screen.getByText(mockCampaigns[0].title)).toBeInTheDocument()); // Ensure loaded

    const searchInput = screen.getByPlaceholderText(/keywords/i);
    await user.type(searchInput, 'Gadget');

    await waitFor(() => {
      expect(screen.getByText('Amazing Tech Gadget Launch')).toBeInTheDocument();
      expect(screen.queryByText('Summer Fashion Line')).not.toBeInTheDocument();
    });
  });

  it('filters campaigns by search term (business name)', async () => {
    const user = userEvent.setup();
    renderMarketplacePage();
    await waitFor(() => expect(screen.getByText(mockCampaigns[0].title)).toBeInTheDocument());

    const searchInput = screen.getByPlaceholderText(/keywords/i);
    await user.type(searchInput, 'Fashion Hub');

    await waitFor(() => {
      expect(screen.getByText('Summer Fashion Line')).toBeInTheDocument();
      expect(screen.queryByText('Amazing Tech Gadget Launch')).not.toBeInTheDocument();
    });
  });

  it('filters campaigns by niche', async () => {
    const user = userEvent.setup();
    renderMarketplacePage();
    await waitFor(() => expect(screen.getByText(mockCampaigns[0].title)).toBeInTheDocument());

    // Niche select options are dynamically populated
    // Wait for the select to be populated then select an option
    const nicheSelect = screen.getByLabelText(/niche/i);
    await waitFor(() => expect(screen.getByRole('option', { name: /technology/i })).toBeInTheDocument());

    await user.selectOptions(nicheSelect, 'technology');

    await waitFor(() => {
      expect(screen.getByText('Amazing Tech Gadget Launch')).toBeInTheDocument();
      expect(screen.queryByText('Summer Fashion Line')).not.toBeInTheDocument();
    });
  });

  it('filters campaigns by min budget', async () => {
    const user = userEvent.setup();
    renderMarketplacePage();
    await waitFor(() => expect(screen.getByText(mockCampaigns[0].title)).toBeInTheDocument());

    const minBudgetInput = screen.getByLabelText(/min budget/i);
    await user.type(minBudgetInput, '700'); // c1=500, c2=1000, c3=750

    await waitFor(() => {
      expect(screen.getByText('Summer Fashion Line')).toBeInTheDocument(); // 1000
      expect(screen.getByText('Gourmet Food Festival')).toBeInTheDocument(); // 750
      expect(screen.queryByText('Amazing Tech Gadget Launch')).not.toBeInTheDocument(); // 500
      expect(screen.queryByText('Eco Friendly Product')).not.toBeInTheDocument(); // 300
    });
  });

  it('filters campaigns by max budget', async () => {
    const user = userEvent.setup();
    renderMarketplacePage();
    await waitFor(() => expect(screen.getByText(mockCampaigns[0].title)).toBeInTheDocument());

    const maxBudgetInput = screen.getByLabelText(/max budget/i);
    await user.type(maxBudgetInput, '600'); // c1=500, c4=300

    await waitFor(() => {
      expect(screen.getByText('Amazing Tech Gadget Launch')).toBeInTheDocument(); // 500
      expect(screen.getByText('Eco Friendly Product')).toBeInTheDocument(); // 300
      expect(screen.queryByText('Summer Fashion Line')).not.toBeInTheDocument(); // 1000
      expect(screen.queryByText('Gourmet Food Festival')).not.toBeInTheDocument(); // 750
    });
  });

  it('combines multiple filters (search term and niche)', async () => {
    const user = userEvent.setup();
    // Add a campaign that could match search but not niche
    const specificCampaigns = [
        { id: 's1', title: 'Tech Review Needed', businessName: 'Gadget Co.', niche: 'technology', budget: 600, description: 'Review our new tech', status: 'open', createdAt: { toDate: () => new Date() } },
        { id: 's2', title: 'Fashion Show Tech', businessName: 'Style Events', niche: 'fashion', budget: 1200, description: 'Tech for fashion show', status: 'open', createdAt: { toDate: () => new Date() } },
    ];
    renderMarketplacePage(mockInfluencerUser, specificCampaigns);
    await waitFor(() => expect(screen.getByText(specificCampaigns[0].title)).toBeInTheDocument());

    const searchInput = screen.getByPlaceholderText(/keywords/i);
    await user.type(searchInput, 'Tech');

    const nicheSelect = screen.getByLabelText(/niche/i);
    await waitFor(() => expect(screen.getByRole('option', { name: /technology/i })).toBeInTheDocument());
    await user.selectOptions(nicheSelect, 'technology');

    await waitFor(() => {
      expect(screen.getByText('Tech Review Needed')).toBeInTheDocument();
      expect(screen.queryByText('Fashion Show Tech')).not.toBeInTheDocument();
    });
  });

  it('each campaign card has a "View Details & Apply" link pointing to the correct campaign detail page', async () => {
    renderMarketplacePage();
    await waitFor(() => expect(screen.getByText(mockCampaigns[0].title)).toBeInTheDocument());

    const links = screen.getAllByRole('link', { name: /view details & apply/i });
    expect(links.length).toBe(mockCampaigns.length);

    // Check href for the first campaign
    // Note: The component structure might mean the link text is within a more complex element.
    // We can find link by its text then check its href.
    const firstCampaignLink = screen.getByRole('link', { name: /view details & apply/i, selector: `a[href="/campaigns/${mockCampaigns[0].id}"]`});
    expect(firstCampaignLink).toBeInTheDocument();
    expect(firstCampaignLink).toHaveAttribute('href', `/campaigns/${mockCampaigns[0].id}`);

    const secondCampaignLink = screen.getByRole('link', { name: /view details & apply/i, selector: `a[href="/campaigns/${mockCampaigns[1].id}"]`});
    expect(secondCampaignLink).toBeInTheDocument();
    expect(secondCampaignLink).toHaveAttribute('href', `/campaigns/${mockCampaigns[1].id}`);
  });
});
