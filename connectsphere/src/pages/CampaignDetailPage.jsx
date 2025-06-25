import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { doc, getDoc, collection, addDoc, query, where, getDocs, Timestamp, updateDoc, increment, orderBy } from 'firebase/firestore';
import { db } from '../firebase/firebaseConfig';
import { useAuth } from '../contexts/AuthContext';

const CampaignDetailPage = () => {
  const { campaignId } = useParams();
  const { currentUser } = useAuth();
  const navigate = useNavigate();

  const [campaign, setCampaign] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [showProposalForm, setShowProposalForm] = useState(false);
  const [proposalMessage, setProposalMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [proposalError, setProposalError] = useState('');
  const [proposalSuccess, setProposalSuccess] = useState('');
  const [hasApplied, setHasApplied] = useState(false);
  const [proposals, setProposals] = useState([]);
  const [loadingProposals, setLoadingProposals] = useState(false);

  const fetchCampaignDetails = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const campaignDocRef = doc(db, "campaigns", campaignId);
      const docSnap = await getDoc(campaignDocRef);
      if (docSnap.exists()) {
        setCampaign({ id: docSnap.id, ...docSnap.data() });
      } else {
        setError("Campaign not found.");
        setCampaign(null);
      }
    } catch (err) {
      console.error("Error fetching campaign details:", err);
      setError("Failed to load campaign details.");
    } finally {
      setLoading(false);
    }
  }, [campaignId]);

  const checkIfApplied = useCallback(async () => {
    if (!currentUser || !campaignId || currentUser.role !== 'influencer') {
      return;
    }
    try {
      const proposalsRef = collection(db, "proposals");
      const q = query(proposalsRef,
        where("campaignId", "==", campaignId),
        where("influencerId", "==", currentUser.uid)
      );
      const querySnapshot = await getDocs(q);
      setHasApplied(!querySnapshot.empty);
    } catch (err) {
      console.error("Error checking existing proposals:", err);
      // Gracefully handle: allow applying if check fails, backend rules should prevent duplicates too.
    }
  }, [currentUser, campaignId]);

  useEffect(() => {
    fetchCampaignDetails();
  }, [fetchCampaignDetails]);

  useEffect(() => {
    if (campaign && currentUser && currentUser.role === 'influencer') {
      checkIfApplied();
    }
    // Fetch proposals if the current user is the business owner of this campaign
    if (campaign && currentUser && currentUser.uid === campaign.businessId) {
      const fetchProposals = async () => {
        setLoadingProposals(true);
        try {
          const proposalsRef = collection(db, "proposals");
          const q = query(proposalsRef, where("campaignId", "==", campaign.id), orderBy("submittedAt", "desc"));
          const querySnapshot = await getDocs(q);
          const fetchedProposals = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
          setProposals(fetchedProposals);
        } catch (err) {
          console.error("Error fetching proposals:", err);
          setError("Failed to load proposals for your campaign."); // Show error specific to proposals
        } finally {
          setLoadingProposals(false);
        }
      };
      fetchProposals();
    }
  }, [campaign, currentUser, checkIfApplied]); // checkIfApplied is for influencer context, but campaign/currentUser trigger this effect

  const handleProposalSubmit = async (e) => {
    e.preventDefault();
    if (!currentUser || currentUser.role !== 'influencer' || !campaign) {
      setProposalError("You must be logged in as an influencer to apply.");
      return;
    }
    if (hasApplied) {
      setProposalError("You have already applied to this campaign.");
      return;
    }
    if (!proposalMessage.trim()) {
      setProposalError("Please include a message in your proposal.");
      return;
    }

    setIsSubmitting(true);
    setProposalError('');
    setProposalSuccess('');

    try {
      await addDoc(collection(db, "proposals"), {
        campaignId: campaign.id,
        influencerId: currentUser.uid,
        influencerName: currentUser.displayName, // Denormalized for easier display
        businessId: campaign.businessId,
        status: 'pending', // pending, accepted, rejected
        message: proposalMessage.trim(),
        submittedAt: Timestamp.fromDate(new Date()),
      });

      // Increment proposalsCount on the campaign (optional, for quick display)
      const campaignDocRef = doc(db, "campaigns", campaign.id);
      await updateDoc(campaignDocRef, {
        proposalsCount: increment(1)
      });

      setProposalSuccess("Proposal submitted successfully!");
      setHasApplied(true); // Update UI immediately
      setShowProposalForm(false); // Hide form on success
      setProposalMessage('');
    } catch (err) {
      console.error("Error submitting proposal:", err);
      setProposalError("Failed to submit proposal. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) return <div className="p-6 text-center">Loading campaign details...</div>;
  if (error) return <div className="p-6 text-center text-red-500 bg-red-100 rounded-md">{error}</div>;
  if (!campaign) return <div className="p-6 text-center">Campaign data is not available.</div>;

  const isCampaignOwner = currentUser && currentUser.uid === campaign.businessId;

  const handleProposalStatusChange = async (proposalId, newStatus) => {
    if (!isCampaignOwner) return;

    setIsSubmitting(true); // Reuse for generic loading state on button
    try {
      const proposalDocRef = doc(db, "proposals", proposalId);
      await updateDoc(proposalDocRef, { status: newStatus });

      // If accepted, update campaign status and potentially reject others
      if (newStatus === 'accepted') {
        const campaignDocRef = doc(db, "campaigns", campaign.id);
        await updateDoc(campaignDocRef, { status: 'in-progress' });
        setCampaign(prev => ({ ...prev, status: 'in-progress' })); // Update local campaign state

        // Optional: Reject all other pending proposals for this campaign
        const otherProposalsToUpdate = proposals.filter(p => p.id !== proposalId && p.status === 'pending');
        for (const prop of otherProposalsToUpdate) {
          const otherPropRef = doc(db, "proposals", prop.id);
          await updateDoc(otherPropRef, { status: 'rejected' });
        }
      }

      // Refetch proposals to update the list or update local state
      setProposals(prevProposals =>
        prevProposals.map(p =>
          p.id === proposalId ? { ...p, status: newStatus } :
          (newStatus === 'accepted' && p.status === 'pending' ? { ...p, status: 'rejected'} : p) // if we rejected others
        )
      );
      // fetchCampaignDetails(); // Could also refetch all campaign details if status change affects other parts

    } catch (err) {
      console.error(`Error updating proposal ${proposalId} to ${newStatus}:`, err);
      // Set an error message specific to this action if needed
      setError(`Failed to update proposal status. Please try again.`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleMarkAsComplete = async () => {
    if (!isCampaignOwner || campaign.status !== 'in-progress') return;

    setIsSubmitting(true); // Reuse for loading state
    setError(''); // Clear previous main errors
    try {
      const campaignDocRef = doc(db, "campaigns", campaign.id);
      await updateDoc(campaignDocRef, { status: 'completed' });
      setCampaign(prev => ({ ...prev, status: 'completed' })); // Update local campaign state
      // Optionally, update related proposal statuses if needed (e.g. if any were 'accepted' but not yet 'completed')
      // For now, just updating campaign status.
      // Add a success message if desired
    } catch (err) {
      console.error("Error marking campaign as complete:", err);
      setError("Failed to update campaign status. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="container mx-auto p-4 sm:p-6 lg:p-8 max-w-4xl">
      <div className="bg-white p-8 rounded-lg shadow-xl">
        <h1 className="text-3xl md:text-4xl font-bold text-gray-800 mb-4">{campaign.title}</h1>
        <p className="text-md text-gray-600 mb-2">
          Posted by: <span className="font-semibold text-indigo-700">{campaign.businessName || 'A Business'}</span>
        </p>
        <p className="text-sm text-gray-500 mb-6">
          Created: {campaign.createdAt?.toDate().toLocaleDateString()}
        </p>

        <div className="mb-6">
          <h2 className="text-xl font-semibold text-gray-700 mb-2">Campaign Details</h2>
          <p className="text-gray-700 whitespace-pre-wrap leading-relaxed"><span className="font-semibold">Description:</span> {campaign.description}</p>
        </div>

        <div className="mb-6">
          <h2 className="text-xl font-semibold text-gray-700 mb-2">Deliverables</h2>
          <p className="text-gray-700 whitespace-pre-wrap leading-relaxed">{campaign.deliverables}</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div>
            <p className="text-gray-700"><span className="font-semibold">Budget:</span> ${campaign.budget.toLocaleString()}</p>
          </div>
          <div>
            <p className="text-gray-700"><span className="font-semibold">Niche:</span> {campaign.niche ? campaign.niche.charAt(0).toUpperCase() + campaign.niche.slice(1) : 'General'}</p>
          </div>
           <div>
            <p className="text-gray-700"><span className="font-semibold">Status:</span> <span className={`px-2 py-1 text-xs font-semibold rounded-full ${campaign.status === 'open' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>{campaign.status.toUpperCase()}</span></p>
          </div>
        </div>

        {/* Influencer: Apply to Campaign Section */}
        {currentUser && currentUser.role === 'influencer' && !isCampaignOwner && campaign.status === 'open' && (
          <div className="mt-8 border-t pt-6">
            {!hasApplied && !showProposalForm && (
              <button
                onClick={() => setShowProposalForm(true)}
                className="w-full sm:w-auto bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-6 rounded-lg transition duration-150 ease-in-out"
              >
                Apply to this Campaign
              </button>
            )}
            {hasApplied && (
              <p className="text-green-600 font-semibold bg-green-50 p-3 rounded-md">You have successfully applied to this campaign.</p>
            )}

            {showProposalForm && !hasApplied && (
              <form onSubmit={handleProposalSubmit} className="mt-4 space-y-4">
                <h3 className="text-lg font-semibold text-gray-700">Submit Your Proposal</h3>
                <div>
                  <label htmlFor="proposalMessage" className="block text-sm font-medium text-gray-700 mb-1">
                    Your Message to the Business
                  </label>
                  <textarea
                    id="proposalMessage"
                    name="proposalMessage"
                    rows="5"
                    value={proposalMessage}
                    onChange={(e) => setProposalMessage(e.target.value)}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                    placeholder="Explain why you're a good fit for this campaign, your ideas, and any relevant experience."
                    required
                  ></textarea>
                </div>
                {proposalError && <p className="text-red-500 text-sm">{proposalError}</p>}
                {proposalSuccess && <p className="text-green-500 text-sm">{proposalSuccess}</p>}
                <div className="flex space-x-3">
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2 px-4 rounded-md transition duration-150 ease-in-out disabled:bg-indigo-300"
                  >
                    {isSubmitting ? 'Submitting...' : 'Submit Proposal'}
                  </button>
                  <button
                    type="button"
                    onClick={() => { setShowProposalForm(false); setProposalError(''); }}
                    className="bg-gray-300 hover:bg-gray-400 text-gray-800 font-semibold py-2 px-4 rounded-md transition duration-150 ease-in-out"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            )}
          </div>
        )}

        {/* Business Owner: View (Placeholder for now, will be implemented in Proposal Review step) */}
        {isCampaignOwner && (
          <div className="mt-10 border-t pt-8">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-semibold text-gray-800">Campaign Management</h2>
              {campaign.status === 'in-progress' && (
                <button
                  onClick={handleMarkAsComplete}
                  disabled={isSubmitting}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg shadow-md transition duration-150 disabled:bg-blue-300"
                >
                  {isSubmitting ? 'Updating...' : 'Mark as Complete & Paid'}
                </button>
              )}
            </div>
            {campaign.status === 'completed' && (
                <p className="text-green-600 font-semibold bg-green-50 p-3 rounded-md">This campaign has been marked as completed.</p>
            )}

            <h3 className="text-xl font-semibold text-gray-700 mb-4 mt-4">Submitted Proposals ({proposals.length})</h3>
            {loadingProposals && <p>Loading proposals...</p>}
            {!loadingProposals && proposals.length === 0 && <p className="text-gray-600">No proposals submitted yet for this campaign.</p>}
            {!loadingProposals && proposals.length > 0 && (
              <div className="space-y-6">
                {proposals.map(proposal => (
                  <div key={proposal.id} className="bg-gray-50 p-6 rounded-lg shadow-sm border">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <h3 className="text-lg font-semibold text-indigo-700">
                          Proposal from: {proposal.influencerName || 'N/A'}
                        </h3>
                        <p className="text-xs text-gray-500">Submitted: {proposal.submittedAt?.toDate().toLocaleDateString()}</p>
                      </div>
                      <span className={`px-3 py-1 text-xs font-semibold rounded-full uppercase
                        ${proposal.status === 'pending' ? 'bg-yellow-100 text-yellow-700' : ''}
                        ${proposal.status === 'accepted' ? 'bg-green-100 text-green-700' : ''}
                        ${proposal.status === 'rejected' ? 'bg-red-100 text-red-700' : ''}
                      `}>
                        {proposal.status}
                      </span>
                    </div>
                    <p className="text-gray-700 mb-4 whitespace-pre-wrap">{proposal.message}</p>

                    {/* Show accept/reject only if campaign is open AND this proposal is pending */}
                    {proposal.status === 'pending' && campaign.status === 'open' && (
                      <div className="flex space-x-3">
                        <button
                          onClick={() => handleProposalStatusChange(proposal.id, 'accepted')}
                          disabled={isSubmitting}
                          className="bg-green-500 hover:bg-green-600 text-white font-semibold py-2 px-4 rounded-md text-sm disabled:bg-gray-300"
                        >
                          Accept
                        </button>
                        <button
                          onClick={() => handleProposalStatusChange(proposal.id, 'rejected')}
                          disabled={isSubmitting}
                          className="bg-red-500 hover:bg-red-600 text-white font-semibold py-2 px-4 rounded-md text-sm disabled:bg-gray-300"
                        >
                          Reject
                        </button>
                      </div>
                    )}
                     {/* If campaign is in-progress (meaning another proposal was accepted), these pending ones are effectively auto-rejected by logic in handleProposalStatusChange */}
                     {/* but we can add a message if proposal is still pending and campaign is in-progress */}
                    {proposal.status === 'pending' && campaign.status === 'in-progress' && (
                        <p className="text-sm text-yellow-600 italic">This proposal was not selected as another was accepted for this campaign.</p>
                     )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {campaign.status !== 'open' && campaign.status !== 'in-progress' && currentUser?.role === 'influencer' && !hasApplied && ( // Show if not applied and campaign closed/completed
             <p className="mt-6 text-yellow-700 font-semibold bg-yellow-50 p-3 rounded-md">This campaign is no longer accepting new applications.</p>
        )}

      </div>
    </div>
  );
};

export default CampaignDetailPage;
