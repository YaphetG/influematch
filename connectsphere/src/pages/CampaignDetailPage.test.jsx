import React from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BrowserRouter, MemoryRouter, Routes, Route } from 'react-router-dom'; // MemoryRouter for specific routes
import CampaignDetailPage from './CampaignDetailPage'; // Adjust path
import { AuthContext } from '../contexts/AuthContext'; // Adjust path

// Mock Firebase services
const mockGetDoc = vi.fn();
const mockGetDocs = vi.fn(); // For fetching proposals
const mockAddDoc = vi.fn();  // For submitting proposal
const mockUpdateDoc = vi.fn(); // For proposal status & campaign status
const mockIncrement = vi.fn((val) => ({ type: 'increment', value: val })); // Simplified mock
const mockQuery = vi.fn((ref, ...constraints) => ({ ref, constraints }));
const mockWhere = vi.fn((field, op, value) => ({ type: 'where', field, op, value }));
const mockOrderBy = vi.fn((field, direction) => ({ type: 'orderBy', field, direction }));
const mockTimestampFromDate = vi.fn((date) => ({
  toDate: () => date, seconds: date.getTime() / 1000, nanoseconds: 0,
}));


vi.mock('../firebase/firebaseConfig', () => ({ db: {} }));
vi.mock('firebase/firestore', () => ({
  doc: (...args) => ({ path: args.join('/') }),
  getDoc: (docRef) => mockGetDoc(docRef),
  getDocs: (query) => mockGetDocs(query),
  addDoc: (collectionRef, data) => mockAddDoc(collectionRef, data),
  updateDoc: (docRef, data) => mockUpdateDoc(docRef, data),
  increment: (val) => mockIncrement(val),
  collection: (...args) => ({ path: args.join('/') }),
  query: mockQuery,
  where: mockWhere,
  orderBy: mockOrderBy,
  Timestamp: { fromDate: (date) => mockTimestampFromDate(date) },
}));

// Mock react-router-dom's useParams
const mockUseParams = vi.fn();
vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    useParams: () => mockUseParams(),
    // Link component will work with BrowserRouter/MemoryRouter
  };
});

const mockInfluencerUser = { uid: 'influencer1', displayName: 'Influencer One', role: 'influencer' };
const mockBusinessOwnerUser = { uid: 'business1', displayName: 'Biz Owner', role: 'business' };
const mockOtherBusinessUser = { uid: 'business2', displayName: 'Other Biz', role: 'business' };

const mockCampaign = {
  id: 'campaignX1',
  title: 'Test Campaign X1',
  businessId: 'business1', // Owned by mockBusinessOwnerUser
  businessName: 'Biz Owner Ltd.',
  description: 'Detailed description here.',
  deliverables: 'Many things.',
  budget: 1200,
  niche: 'testing',
  status: 'open', // Initially open
  createdAt: { toDate: () => new Date(2023, 5, 10) },
  proposalsCount: 0,
};

const renderCampaignDetailPage = (currentUser, campaignData = mockCampaign, campaignId = 'campaignX1', initialProposals = [], hasApplied = false) => {
  mockUseParams.mockReturnValue({ campaignId });

  mockGetDoc.mockImplementation((docRef) => {
    if (docRef.path === `campaigns/${campaignId}`) {
      return Promise.resolve({
        exists: () => !!campaignData,
        data: () => campaignData,
        id: campaignId,
      });
    }
    return Promise.resolve({ exists: () => false }); // Default for other docs if any
  });

  // Mock for checkIfApplied and fetchProposals
  mockGetDocs.mockImplementation((q) => {
    if (q.constraints?.some(c => c.field === 'influencerId' && c.value === currentUser?.uid)) { // CheckIfApplied query
        return Promise.resolve({ empty: !hasApplied, docs: hasApplied ? [{id: 'p0', data: () => ({})}] : [] });
    }
    if (q.constraints?.some(c => c.field === 'campaignId' && c.value === campaignId)) { // FetchProposals query
        return Promise.resolve({ docs: initialProposals.map(p => ({ id: p.id, data: () => p })), empty: initialProposals.length === 0 });
    }
    return Promise.resolve({ docs: [], empty: true });
  });

  mockAddDoc.mockResolvedValue({ id: 'new-proposal-id' });
  mockUpdateDoc.mockResolvedValue(undefined);

  return render(
    <MemoryRouter initialEntries={[`/campaigns/${campaignId}`]}>
      <AuthContext.Provider value={{ currentUser, loadingAuth: false, logout: vi.fn() }}>
        <Routes>
            <Route path="/campaigns/:campaignId" element={<CampaignDetailPage />} />
        </Routes>
      </AuthContext.Provider>
    </MemoryRouter>
  );
};


describe('CampaignDetailPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders campaign details correctly', async () => {
    renderCampaignDetailPage(mockInfluencerUser);
    await waitFor(() => {
      expect(screen.getByText(mockCampaign.title)).toBeInTheDocument();
      expect(screen.getByText(mockCampaign.businessName)).toBeInTheDocument();
      expect(screen.getByText(mockCampaign.description)).toBeInTheDocument();
      expect(screen.getByText(`$${mockCampaign.budget.toLocaleString()}`)).toBeInTheDocument();
      expect(screen.getByText(new RegExp(mockCampaign.niche, 'i'))).toBeInTheDocument();
    });
  });

  describe('Influencer View', () => {
    it('shows "Apply" button if campaign is open and influencer has not applied', async () => {
      renderCampaignDetailPage(mockInfluencerUser, { ...mockCampaign, status: 'open' }, 'campaignX1', [], false);
      await waitFor(() => expect(screen.getByRole('button', { name: /apply to this campaign/i })).toBeInTheDocument());
    });

    it('does not show "Apply" button if campaign is not open', async () => {
      renderCampaignDetailPage(mockInfluencerUser, { ...mockCampaign, status: 'in-progress' });
      await waitFor(() => expect(screen.queryByRole('button', { name: /apply to this campaign/i })).not.toBeInTheDocument());
      expect(screen.getByText(/this campaign is no longer accepting new applications./i)).toBeInTheDocument();
    });

    it('shows "You have already applied" if influencer has applied', async () => {
      renderCampaignDetailPage(mockInfluencerUser, mockCampaign, 'campaignX1', [], true); // hasApplied = true
      await waitFor(() => expect(screen.getByText(/you have successfully applied to this campaign/i)).toBeInTheDocument());
    });

    it('allows influencer to submit a proposal', async () => {
      const user = userEvent.setup();
      renderCampaignDetailPage(mockInfluencerUser, { ...mockCampaign, status: 'open' }, 'campaignX1', [], false);

      const applyButton = await screen.findByRole('button', { name: /apply to this campaign/i });
      await user.click(applyButton);

      const messageTextarea = await screen.findByPlaceholderText(/explain why you're a good fit/i);
      await user.type(messageTextarea, 'I am a great fit!');

      const submitButton = screen.getByRole('button', { name: /submit proposal/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockAddDoc).toHaveBeenCalledTimes(1);
        expect(mockAddDoc).toHaveBeenCalledWith(
          expect.objectContaining({ path: 'proposals' }),
          expect.objectContaining({
            campaignId: mockCampaign.id,
            influencerId: mockInfluencerUser.uid,
            businessId: mockCampaign.businessId,
            message: 'I am a great fit!',
            status: 'pending',
          })
        );
        expect(mockUpdateDoc).toHaveBeenCalledWith( // For proposalsCount increment
            expect.objectContaining({ path: `campaigns/${mockCampaign.id}`}),
            { proposalsCount: expect.anything() } // mockIncrement will be complex to check directly here
        );
      });
      expect(await screen.findByText('Proposal submitted successfully!')).toBeInTheDocument();
    });
  });

  describe('Business Owner View', () => {
    const mockProposals = [
      { id: 'p1', influencerId: 'infA', influencerName: 'Alpha Influencer', message: 'Proposal A', status: 'pending', submittedAt: { toDate: () => new Date() } },
      { id: 'p2', influencerId: 'infB', influencerName: 'Beta Influencer', message: 'Proposal B', status: 'accepted', submittedAt: { toDate: () => new Date() } },
      { id: 'p3', influencerId: 'infC', influencerName: 'Charlie Influencer', message: 'Proposal C', status: 'pending', submittedAt: { toDate: () => new Date() } },
    ];

    it('displays submitted proposals for the campaign owner', async () => {
      renderCampaignDetailPage(mockBusinessOwnerUser, mockCampaign, 'campaignX1', mockProposals);
      await waitFor(() => {
        expect(screen.getByText(/submitted proposals/i)).toBeInTheDocument();
        expect(screen.getByText('Proposal from: Alpha Influencer')).toBeInTheDocument();
        expect(screen.getByText('Proposal from: Beta Influencer')).toBeInTheDocument();
      });
      // Check that query for proposals was made for this campaign
       expect(mockGetDocs).toHaveBeenCalledWith(expect.objectContaining({
         constraints: expect.arrayContaining([
            expect.objectContaining({ field: 'campaignId', op: '==', value: 'campaignX1' })
         ])
       }));
    });

    it('allows business owner to accept a pending proposal', async () => {
      const user = userEvent.setup();
      // Campaign must be 'open' to accept new proposals
      renderCampaignDetailPage(mockBusinessOwnerUser, { ...mockCampaign, status: 'open' }, 'campaignX1', mockProposals);

      const acceptButtons = await screen.findAllByRole('button', { name: /accept/i });
      expect(acceptButtons.length).toBeGreaterThan(0); // Should be one for p1, one for p3 (p2 is already accepted)
                                                       // Actually, p2 is accepted so it shouldn't have accept/reject.
                                                       // Only p1 and p3 (pending) should have these if campaign is open.

      // Find the Accept button for "Alpha Influencer" (proposal p1)
      const alphaProposalDiv = screen.getByText('Proposal from: Alpha Influencer').closest('div.bg-gray-50'); // Find parent div
      const acceptButtonForAlpha = Array.from(alphaProposalDiv.querySelectorAll('button')).find(b => b.textContent === 'Accept');

      await user.click(acceptButtonForAlpha);

      await waitFor(() => {
        // Proposal p1 status updated to 'accepted'
        expect(mockUpdateDoc).toHaveBeenCalledWith(expect.objectContaining({ path: 'proposals/p1' }), { status: 'accepted' });
        // Campaign status updated to 'in-progress'
        expect(mockUpdateDoc).toHaveBeenCalledWith(expect.objectContaining({ path: `campaigns/${mockCampaign.id}` }), { status: 'in-progress' });
        // Other pending proposal (p3) status updated to 'rejected'
        expect(mockUpdateDoc).toHaveBeenCalledWith(expect.objectContaining({ path: 'proposals/p3' }), { status: 'rejected' });
      });
    });

    it('allows business owner to reject a pending proposal', async () => {
        const user = userEvent.setup();
        renderCampaignDetailPage(mockBusinessOwnerUser, { ...mockCampaign, status: 'open' }, 'campaignX1', mockProposals);

        const charlieProposalDiv = screen.getByText('Proposal from: Charlie Influencer').closest('div.bg-gray-50');
        const rejectButtonForCharlie = Array.from(charlieProposalDiv.querySelectorAll('button')).find(b => b.textContent === 'Reject');

        await user.click(rejectButtonForCharlie);

        await waitFor(() => {
            expect(mockUpdateDoc).toHaveBeenCalledWith(expect.objectContaining({ path: 'proposals/p3' }), { status: 'rejected' });
        });
        // Campaign status should not change on reject
        expect(mockUpdateDoc).not.toHaveBeenCalledWith(expect.objectContaining({ path: `campaigns/${mockCampaign.id}` }), { status: 'in-progress' });
    });

    it('allows business owner to mark an "in-progress" campaign as complete', async () => {
      const user = userEvent.setup();
      renderCampaignDetailPage(mockBusinessOwnerUser, { ...mockCampaign, status: 'in-progress' }, 'campaignX1', []);

      const markCompleteButton = await screen.findByRole('button', { name: /mark as complete & paid/i });
      await user.click(markCompleteButton);

      await waitFor(() => {
        expect(mockUpdateDoc).toHaveBeenCalledWith(expect.objectContaining({ path: `campaigns/${mockCampaign.id}` }), { status: 'completed' });
      });
      expect(await screen.findByText(/this campaign has been marked as completed./i)).toBeInTheDocument();
    });
  });

  it('does not show proposal management or mark as complete for non-owner business user', async () => {
      renderCampaignDetailPage(mockOtherBusinessUser, mockCampaign); // Different business user
      await waitFor(() => expect(screen.getByText(mockCampaign.title)).toBeInTheDocument());

      expect(screen.queryByText(/submitted proposals/i)).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /accept/i })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /mark as complete & paid/i })).not.toBeInTheDocument();
  });

});
