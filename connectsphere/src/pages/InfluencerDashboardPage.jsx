import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { collection, query, where, getDocs, orderBy, doc, documentId, getDoc } from 'firebase/firestore'; // Added documentId
import { db } from '../firebase/firebaseConfig';
import { useAuth } from '../contexts/AuthContext';

const InfluencerDashboardPage = () => {
  const { currentUser } = useAuth();
  const [myProposals, setMyProposals] = useState([]);
  const [activeCollaborations, setActiveCollaborations] = useState([]);
  const [loadingProposals, setLoadingProposals] = useState(true);
  const [loadingCollabs, setLoadingCollabs] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!currentUser || currentUser.role !== 'influencer') return;

    // Fetch Influencer's Submitted Proposals
    const fetchMyProposals = async () => {
      setLoadingProposals(true);
      try {
        const proposalsRef = collection(db, "proposals");
        const q = query(proposalsRef,
          where("influencerId", "==", currentUser.uid),
          orderBy("submittedAt", "desc")
        );
        const querySnapshot = await getDocs(q);
        const proposalsData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        // Fetch campaign titles for these proposals
        const proposalsWithCampaignTitles = await Promise.all(proposalsData.map(async (proposal) => {
            let campaignTitle = 'N/A';
            let campaignStatus = 'N/A';
            if (proposal.campaignId) {
                const campaignDocSnap = await getDoc(doc(db, "campaigns", proposal.campaignId));
                if (campaignDocSnap.exists()) {
                    campaignTitle = campaignDocSnap.data().title;
                    campaignStatus = campaignDocSnap.data().status;
                }
            }
            return { ...proposal, campaignTitle, campaignStatus };
        }));
        setMyProposals(proposalsWithCampaignTitles);

      } catch (err) {
        console.error("Error fetching influencer proposals:", err);
        setError(prev => prev + " Failed to load your proposals.");
      } finally {
        setLoadingProposals(false);
      }
    };

    // Fetch Active Collaborations (Campaigns where proposal was accepted)
    const fetchActiveCollaborations = async () => {
      setLoadingCollabs(true);
      try {
        const proposalsRef = collection(db, "proposals");
        const qAccepted = query(proposalsRef,
          where("influencerId", "==", currentUser.uid),
          where("status", "==", "accepted")
        );
        const acceptedSnapshot = await getDocs(qAccepted);
        const acceptedCampaignIds = acceptedSnapshot.docs.map(doc => doc.data().campaignId);

        if (acceptedCampaignIds.length > 0) {
          const campaignsRef = collection(db, "campaigns");
          // Query for campaigns that are 'in-progress' and match the accepted IDs
          // Firestore 'in' query limit is 10. If more, need multiple queries or different strategy.
          // For now, assuming acceptedCampaignIds will be < 10 for active collabs.
          // A more robust way might be to fetch all campaigns with id in acceptedCampaignIds, then filter by status locally.
          const qCampaigns = query(campaignsRef,
            where(documentId(), "in", acceptedCampaignIds.slice(0,10)), // documentId() needs to be imported from firebase/firestore
            where("status", "==", "in-progress") // Only active ones
          );
          // Re-import documentId if used: import { collection, query, where, getDocs, orderBy, doc, documentId } from 'firebase/firestore';
          // Simpler: fetch all accepted campaigns, then filter locally by status 'in-progress'

          const collabs = [];
          for (const campaignId of acceptedCampaignIds) {
            const campaignDocSnap = await getDoc(doc(db, "campaigns", campaignId));
            if (campaignDocSnap.exists() && campaignDocSnap.data().status === 'in-progress') {
              collabs.push({ id: campaignDocSnap.id, ...campaignDocSnap.data() });
            }
          }
          setActiveCollaborations(collabs);
        } else {
          setActiveCollaborations([]);
        }
      } catch (err) {
        console.error("Error fetching active collaborations:", err);
        setError(prev => prev + " Failed to load active collaborations.");
      } finally {
        setLoadingCollabs(false);
      }
    };

    fetchMyProposals();
    fetchActiveCollaborations();
  }, [currentUser]);

  if (!currentUser) return <p className="p-6 text-center">Loading...</p>;
  if (currentUser.role !== 'influencer') return <p className="p-6 text-red-500 text-center">Access Denied.</p>;

  return (
    <div className="container mx-auto p-4 sm:p-6 lg:p-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-gray-800">Influencer Dashboard</h1>
        <Link
          to="/influencer/opportunities"
          className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-lg shadow-md transition duration-150"
        >
          Find New Opportunities
        </Link>
      </div>

      {error && <p className="bg-red-100 text-red-700 p-3 rounded-md mb-6">{error}</p>}

      {/* Active Collaborations Section */}
      <section className="mb-10">
        <h2 className="text-2xl font-semibold text-gray-700 mb-4">My Active Collaborations ({activeCollaborations.length})</h2>
        {loadingCollabs && <p>Loading collaborations...</p>}
        {!loadingCollabs && activeCollaborations.length === 0 && (
          <p className="text-gray-600 bg-gray-50 p-4 rounded-md">You have no active collaborations. <Link to="/influencer/opportunities" className="text-indigo-600 hover:underline">Find one now!</Link></p>
        )}
        {!loadingCollabs && activeCollaborations.length > 0 && (
          <div className="space-y-4">
            {activeCollaborations.map(campaign => (
              <div key={campaign.id} className="bg-white p-5 rounded-lg shadow-md border border-green-200 flex justify-between items-center">
                <div>
                  <h3 className="text-xl font-semibold text-green-700">{campaign.title}</h3>
                  <p className="text-sm text-gray-500">
                    With: {campaign.businessName || 'A Business'} <span className="mx-2">|</span> Status: <span className="font-medium text-yellow-600">IN PROGRESS</span>
                  </p>
                </div>
                <Link
                  to={`/campaigns/${campaign.id}`}
                  className="bg-green-500 hover:bg-green-600 text-white font-semibold py-2 px-4 rounded-md text-sm transition duration-150"
                >
                  View Campaign
                </Link>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* My Submitted Proposals Section */}
      <section className="mb-10">
        <h2 className="text-2xl font-semibold text-gray-700 mb-4">My Applications ({myProposals.length})</h2>
        {loadingProposals && <p>Loading applications...</p>}
        {!loadingProposals && myProposals.length === 0 && (
          <p className="text-gray-600 bg-gray-50 p-4 rounded-md">You haven't applied to any campaigns yet.</p>
        )}
        {!loadingProposals && myProposals.length > 0 && (
          <div className="bg-white p-2 rounded-lg shadow">
            <ul className="divide-y divide-gray-200">
              {myProposals.map(proposal => (
                <li key={proposal.id} className="px-4 py-4 sm:px-6 flex justify-between items-center hover:bg-gray-50">
                  <div>
                    <p className="text-md font-semibold text-indigo-600 truncate">
                      {proposal.campaignTitle || 'Campaign Details Missing'}
                    </p>
                    <p className="text-sm text-gray-500">
                      Submitted: {proposal.submittedAt?.toDate().toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex flex-col items-end">
                     <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full
                        ${proposal.status === 'pending' ? 'bg-yellow-100 text-yellow-800' : ''}
                        ${proposal.status === 'accepted' ? 'bg-green-100 text-green-800' : ''}
                        ${proposal.status === 'rejected' ? 'bg-red-100 text-red-800' : ''}
                      `}>
                        {proposal.status}
                      </span>
                    <Link
                      to={`/campaigns/${proposal.campaignId}`}
                      className="mt-1 text-xs font-medium text-indigo-500 hover:text-indigo-700"
                    >
                      View Campaign
                    </Link>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>
    </div>
  );
};

export default InfluencerDashboardPage;
