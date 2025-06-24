import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { db } from '../firebase/firebaseConfig';
import { useAuth } from '../contexts/AuthContext'; // For redirecting if not logged in/not influencer

const OpportunityMarketplacePage = () => {
  const { currentUser } = useAuth();
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [searchTerm, setSearchTerm] = useState('');
  const [filterNiche, setFilterNiche] = useState('');
  const [minBudget, setMinBudget] = useState('');
  const [maxBudget, setMaxBudget] = useState('');
  const [availableNiches, setAvailableNiches] = useState([]);

  useEffect(() => {
    const fetchCampaigns = async () => {
      setLoading(true);
      setError('');
      try {
        const campaignsRef = collection(db, "campaigns");
        const q = query(campaignsRef, where("status", "==", "open"), orderBy("createdAt", "desc"));
        const querySnapshot = await getDocs(q);
        const openCampaigns = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setCampaigns(openCampaigns);

        // Extract unique niches for filter dropdown
        const niches = [...new Set(openCampaigns.map(c => c.niche).filter(n => n))];
        setAvailableNiches(niches.sort());

      } catch (err) {
        console.error("Error fetching open campaigns:", err);
        setError("Failed to load campaign opportunities. Please try again.");
      } finally {
        setLoading(false);
      }
    };

    fetchCampaigns();
  }, []);

  const filteredCampaigns = useMemo(() => {
    return campaigns.filter(campaign => {
      const searchLower = searchTerm.toLowerCase();
      const titleMatch = campaign.title.toLowerCase().includes(searchLower);
      const businessMatch = campaign.businessName?.toLowerCase().includes(searchLower); // Optional chaining for safety
      const descriptionMatch = campaign.description.toLowerCase().includes(searchLower);

      const nicheMatch = filterNiche ? campaign.niche.toLowerCase() === filterNiche.toLowerCase() : true;

      const budget = campaign.budget;
      const minBudgetNum = parseFloat(minBudget);
      const maxBudgetNum = parseFloat(maxBudget);
      const minBudgetMatch = minBudget ? budget >= minBudgetNum : true;
      const maxBudgetMatch = maxBudget ? budget <= maxBudgetNum : true;

      return (titleMatch || businessMatch || descriptionMatch) && nicheMatch && minBudgetMatch && maxBudgetMatch;
    });
  }, [campaigns, searchTerm, filterNiche, minBudget, maxBudget]);

  // Basic redirect if user context is not available or not an influencer
  // This should ideally be fully handled by a ProtectedRoute wrapper in App.jsx
  if (!currentUser) return <p className="p-6 text-center">Loading user data...</p>; // Or redirect
  if (currentUser.role !== 'influencer') return <p className="p-6 text-red-500 text-center">Access Denied. This page is for influencers only.</p>;


  return (
    <div className="container mx-auto p-4 sm:p-6 lg:p-8">
      <h1 className="text-3xl font-bold mb-8 text-gray-800">Campaign Opportunities</h1>

      {/* Filters and Search Section */}
      <div className="mb-8 p-6 bg-white rounded-lg shadow-md">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
          <div>
            <label htmlFor="searchTerm" className="block text-sm font-medium text-gray-700 mb-1">Search</label>
            <input
              type="text"
              id="searchTerm"
              placeholder="Keywords (title, company...)"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            />
          </div>
          <div>
            <label htmlFor="filterNiche" className="block text-sm font-medium text-gray-700 mb-1">Niche</label>
            <select
              id="filterNiche"
              value={filterNiche}
              onChange={(e) => setFilterNiche(e.target.value)}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            >
              <option value="">All Niches</option>
              {availableNiches.map(niche => (
                <option key={niche} value={niche}>{niche.charAt(0).toUpperCase() + niche.slice(1)}</option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="minBudget" className="block text-sm font-medium text-gray-700 mb-1">Min Budget ($)</label>
            <input
              type="number"
              id="minBudget"
              placeholder="e.g., 100"
              value={minBudget}
              onChange={(e) => setMinBudget(e.target.value)}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            />
          </div>
          <div>
            <label htmlFor="maxBudget" className="block text-sm font-medium text-gray-700 mb-1">Max Budget ($)</label>
            <input
              type="number"
              id="maxBudget"
              placeholder="e.g., 1000"
              value={maxBudget}
              onChange={(e) => setMaxBudget(e.target.value)}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            />
          </div>
        </div>
      </div>

      {loading && <p className="text-center text-gray-600">Loading campaigns...</p>}
      {error && <p className="text-center text-red-500 bg-red-100 p-3 rounded-md">{error}</p>}

      {!loading && !error && filteredCampaigns.length === 0 && (
        <p className="text-center text-gray-600 py-10">No open campaigns match your criteria, or no campaigns available at the moment.</p>
      )}

      {!loading && !error && filteredCampaigns.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredCampaigns.map(campaign => (
            <div key={campaign.id} className="bg-white rounded-lg shadow-lg overflow-hidden flex flex-col">
              <div className="p-6 flex-grow">
                <h2 className="text-xl font-semibold text-indigo-700 mb-2">{campaign.title}</h2>
                <p className="text-sm text-gray-500 mb-1">by {campaign.businessName || 'A Business'}</p>
                <p className="text-sm text-gray-600 mb-3">
                  <span className="font-medium">Niche:</span> {campaign.niche ? campaign.niche.charAt(0).toUpperCase() + campaign.niche.slice(1) : 'General'}
                </p>
                <p className="text-sm text-gray-600 mb-4">
                  <span className="font-medium">Budget:</span> ${campaign.budget.toLocaleString()}
                </p>
                <p className="text-gray-700 text-sm mb-4 line-clamp-3 flex-grow">{campaign.description}</p>
              </div>
              <div className="p-6 bg-gray-50 border-t border-gray-200">
                <Link
                  to={`/campaigns/${campaign.id}`} // Link to campaign detail page
                  className="w-full text-center block bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2 px-4 rounded-md transition duration-150 ease-in-out"
                >
                  View Details & Apply
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default OpportunityMarketplacePage;
