import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { collection, query, where, getDocs, orderBy, getDoc, doc } from 'firebase/firestore';
import { db } from '../firebase/firebaseConfig';
import { useAuth } from '../contexts/AuthContext';

const BusinessDashboardPage = () => {
  const { currentUser } = useAuth();
  const [myCampaigns, setMyCampaigns] = useState([]);
  const [incomingProposals, setIncomingProposals] = useState([]);
  const [loadingCampaigns, setLoadingCampaigns] = useState(true);
  const [loadingProposals, setLoadingProposals] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!currentUser || currentUser.role !== 'business') return;

    // Fetch Business's Campaigns
    const fetchMyCampaigns = async () => {
      setLoadingCampaigns(true);
      try {
        const campaignsRef = collection(db, "campaigns");
        const q = query(campaignsRef,
          where("businessId", "==", currentUser.uid),
          orderBy("createdAt", "desc")
        );
        const querySnapshot = await getDocs(q);
        const campaigns = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setMyCampaigns(campaigns);
      } catch (err) {
        console.error("Error fetching business campaigns:", err);
        setError(prev => prev + " Failed to load your campaigns.");
      } finally {
        setLoadingCampaigns(false);
      }
    };

    // Fetch Incoming Proposals for Business's Campaigns
    const fetchIncomingProposals = async () => {
      setLoadingProposals(true);
      try {
        // This query is a bit more complex as it's on the 'proposals' collection
        // but needs to be linked to the current business user.
        // We can query proposals where businessId matches currentUser.uid
        const proposalsRef = collection(db, "proposals");
        const q = query(proposalsRef,
          where("businessId", "==", currentUser.uid),
          where("status", "==", "pending"), // Only show pending proposals
          orderBy("submittedAt", "desc")
        );
        const querySnapshot = await getDocs(q);
        const proposals = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        // To display campaign titles with proposals, we might need to fetch campaign data
        // or ensure campaignTitle is denormalized in the proposal document.
        // For simplicity now, we'll assume campaignId is enough to link.
        // Let's try to fetch campaign titles for these proposals.
        const proposalsWithCampaignTitles = await Promise.all(proposals.map(async (proposal) => {
            let campaignTitle = 'N/A';
            if (proposal.campaignId) {
                const campaignDoc = await getDoc(doc(db, "campaigns", proposal.campaignId));
                if (campaignDoc.exists()) {
                    campaignTitle = campaignDoc.data().title;
                }
            }
            return { ...proposal, campaignTitle };
        }));
        setIncomingProposals(proposalsWithCampaignTitles);

      } catch (err) {
        console.error("Error fetching incoming proposals:", err);
        setError(prev => prev + " Failed to load incoming proposals.");
      } finally {
        setLoadingProposals(false);
      }
    };

    fetchMyCampaigns();
    fetchIncomingProposals();
  }, [currentUser]);

  if (!currentUser) return <p className="p-6 text-center">Loading...</p>;
  if (currentUser.role !== 'business') return <p className="p-6 text-red-500 text-center">Access Denied.</p>;

  const activeCampaigns = myCampaigns.filter(c => c.status === 'open' || c.status === 'in-progress');
  const completedCampaigns = myCampaigns.filter(c => c.status === 'completed');


  return (
    <div className="container mx-auto p-4 sm:p-6 lg:p-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-gray-800">Business Dashboard</h1>
        <Link
          to="/business/campaigns/new"
          className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-lg shadow-md transition duration-150"
        >
          + Create New Campaign
        </Link>
      </div>

      {error && <p className="bg-red-100 text-red-700 p-3 rounded-md mb-6">{error}</p>}

      {/* Incoming Proposals Section */}
      <section className="mb-10">
        <h2 className="text-2xl font-semibold text-gray-700 mb-4">Recent Pending Proposals</h2>
        {loadingProposals && <p>Loading proposals...</p>}
        {!loadingProposals && incomingProposals.length === 0 && (
          <p className="text-gray-600 bg-gray-50 p-4 rounded-md">No new pending proposals at the moment.</p>
        )}
        {!loadingProposals && incomingProposals.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {incomingProposals.slice(0, 6).map(proposal => ( // Show a few recent ones
              <div key={proposal.id} className="bg-white p-6 rounded-lg shadow-lg border border-indigo-100">
                <h3 className="text-lg font-semibold text-indigo-700 mb-1">
                  From: {proposal.influencerName || 'N/A'}
                </h3>
                <p className="text-sm text-gray-600 mb-2">
                  For Campaign: <span className="font-medium">{proposal.campaignTitle || proposal.campaignId}</span>
                </p>
                <p className="text-gray-700 text-sm line-clamp-3 mb-3">{proposal.message}</p>
                <Link
                  to={`/campaigns/${proposal.campaignId}`}
                  className="text-sm font-medium text-indigo-600 hover:text-indigo-800 transition duration-150"
                >
                  View Proposal &rarr;
                </Link>
              </div>
            ))}
          </div>
        )}
        {/* Link to a full proposals page could go here if many proposals */}
      </section>

      {/* Active Campaigns Section */}
      <section className="mb-10">
        <h2 className="text-2xl font-semibold text-gray-700 mb-4">My Active Campaigns ({activeCampaigns.length})</h2>
        {loadingCampaigns && <p>Loading campaigns...</p>}
        {!loadingCampaigns && activeCampaigns.length === 0 && (
          <p className="text-gray-600 bg-gray-50 p-4 rounded-md">You have no active campaigns. <Link to="/business/campaigns/new" className="text-indigo-600 hover:underline">Create one now!</Link></p>
        )}
        {!loadingCampaigns && activeCampaigns.length > 0 && (
          <div className="space-y-4">
            {activeCampaigns.map(campaign => (
              <div key={campaign.id} className="bg-white p-5 rounded-lg shadow-md border flex justify-between items-center">
                <div>
                  <h3 className="text-xl font-semibold text-blue-700">{campaign.title}</h3>
                  <p className="text-sm text-gray-500">
                    Status: <span className={`font-medium ${campaign.status === 'open' ? 'text-green-600' : 'text-yellow-600'}`}>{campaign.status.toUpperCase()}</span>
                    <span className="mx-2">|</span>
                    Proposals: {campaign.proposalsCount || 0}
                  </p>
                </div>
                <Link
                  to={`/campaigns/${campaign.id}`}
                  className="bg-blue-500 hover:bg-blue-600 text-white font-semibold py-2 px-4 rounded-md text-sm transition duration-150"
                >
                  View Details
                </Link>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Optionally, list completed campaigns or other summaries */}
       <section>
        <h2 className="text-2xl font-semibold text-gray-700 mb-4">My Completed Campaigns ({completedCampaigns.length})</h2>
        {loadingCampaigns && <p>Loading campaigns...</p>}
        {!loadingCampaigns && completedCampaigns.length === 0 && (
          <p className="text-gray-600 bg-gray-50 p-4 rounded-md">No campaigns completed yet.</p>
        )}
        {!loadingCampaigns && completedCampaigns.length > 0 && (
          <div className="space-y-4">
            {completedCampaigns.map(campaign => (
              <div key={campaign.id} className="bg-white p-5 rounded-lg shadow-sm border border-gray-200 flex justify-between items-center">
                <div>
                  <h3 className="text-lg font-medium text-gray-600">{campaign.title}</h3>
                   <p className="text-sm text-gray-400">Status: COMPLETED</p>
                </div>
                <Link
                  to={`/campaigns/${campaign.id}`}
                  className="bg-gray-300 hover:bg-gray-400 text-gray-700 font-semibold py-2 px-3 rounded-md text-xs transition duration-150"
                >
                  View Archive
                </Link>
              </div>
            ))}
          </div>
        )}
      </section>


    </div>
  );
};

export default BusinessDashboardPage;
