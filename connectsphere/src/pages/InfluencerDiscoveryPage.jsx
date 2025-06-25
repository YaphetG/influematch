import React, { useState, useEffect, useMemo } from 'react';
import { collection, query, where, getDocs, doc, getDoc as getFirestoreDoc } from 'firebase/firestore'; // Renamed getDoc to avoid conflict
import { db } from '../firebase/firebaseConfig';
import { useAuth } from '../contexts/AuthContext';
import InfluencerCard from '../components/influencers/InfluencerCard'; // Import the new card component

const InfluencerDiscoveryPage = () => {
  const { currentUser } = useAuth();
  const [influencers, setInfluencers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [searchTerm, setSearchTerm] = useState('');
  const [filterNiche, setFilterNiche] = useState('');
  const [filterLocation, setFilterLocation] = useState(''); // New filter state
  const [minAudienceSize, setMinAudienceSize] = useState(''); // New filter state
  const [maxAudienceSize, setMaxAudienceSize] = useState(''); // New filter state
  const [availableNiches, setAvailableNiches] = useState([]);

  useEffect(() => {
    const fetchInfluencers = async () => {
      if (!currentUser || currentUser.role !== 'business') {
        setError("Access denied. Only businesses can discover influencers.");
        setLoading(false);
        return;
      }
      setLoading(true);
      setError('');
      try {
        const usersRef = collection(db, "users");
        const q = query(usersRef, where("role", "==", "influencer"));
        const usersSnapshot = await getDocs(q);

        const influencerProfilesPromises = usersSnapshot.docs.map(async (userDoc) => {
          const userData = userDoc.data();
          const profileDocRef = doc(db, "users", userDoc.id, "profile", userDoc.id);
          const profileSnap = await getFirestoreDoc(profileDocRef); // Use renamed getFirestoreDoc
          if (profileSnap.exists()) {
            return {
              id: userDoc.id,
              displayName: userData.displayName,
              email: userData.email, // Though maybe not shown publicly
              profileImageUrl: userData.profileImageUrl || '',
              ...profileSnap.data() // Niche, bio, socialLinks, etc.
            };
          }
          return null; // Or a basic profile if sub-collection doc doesn't exist
        });

        const resolvedProfiles = (await Promise.all(influencerProfilesPromises)).filter(profile => profile !== null);
        setInfluencers(resolvedProfiles);

        // Extract unique niches for filter dropdown
        const niches = [...new Set(resolvedProfiles.map(inf => inf.niche).filter(n => n))];
        setAvailableNiches(niches.sort());

      } catch (err) {
        console.error("Error fetching influencers:", err);
        setError("Failed to load influencer profiles. Please try again.");
      } finally {
        setLoading(false);
      }
    };

    fetchInfluencers();
  }, [currentUser]);

  const filteredInfluencers = useMemo(() => {
    return influencers.filter(influencer => {
      const searchLower = searchTerm.toLowerCase();
      const nameMatch = influencer.displayName?.toLowerCase().includes(searchLower);
      const nicheKeywordMatch = influencer.niche?.toLowerCase().includes(searchLower);
      const bioMatch = influencer.bio?.toLowerCase().includes(searchLower);

      const nicheFilterMatch = filterNiche ? influencer.niche?.toLowerCase() === filterNiche.toLowerCase() : true;

      const locationFilterMatch = filterLocation
        ? influencer.location?.toLowerCase().includes(filterLocation.toLowerCase())
        : true;

      const audienceSize = typeof influencer.audienceSize === 'number' ? influencer.audienceSize : 0;
      const minAudience = minAudienceSize ? parseInt(minAudienceSize, 10) : 0;
      const maxAudience = maxAudienceSize ? parseInt(maxAudienceSize, 10) : Infinity;

      const audienceSizeMatch = audienceSize >= minAudience && audienceSize <= maxAudience;

      return (nameMatch || nicheKeywordMatch || bioMatch) && nicheFilterMatch && locationFilterMatch && audienceSizeMatch;
    });
  }, [influencers, searchTerm, filterNiche, filterLocation, minAudienceSize, maxAudienceSize]);

  if (!currentUser) return <div className="p-6 text-center">Loading user data...</div>; // Handled by ProtectedRoute mostly
  if (currentUser.role !== 'business' && !loading && error) { // Show error if it was set due to role
      return <p className="p-6 text-red-500 text-center">{error}</p>;
  }
  if (currentUser.role !== 'business' && !loading && !error) { // Generic denial if error wasn't set by role check
    return <p className="p-6 text-red-500 text-center">Access Denied. This page is for businesses only.</p>;
  }


  return (
    <div className="container mx-auto p-4 sm:p-6 lg:p-8">
      <h1 className="text-3xl font-bold mb-8 text-gray-800">Discover Influencers</h1>

      {/* Filters and Search Section */}
      <div className="mb-8 p-6 bg-white rounded-lg shadow-md">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 items-end">
          {/* Search Term */}
          <div className="lg:col-span-1 xl:col-span-1"> {/* Adjusted span for better layout with more filters */}
            <label htmlFor="searchTerm" className="block text-sm font-medium text-gray-700 mb-1">Search Influencers</label>
            <input
              type="text"
              id="searchTerm"
              placeholder="Name, niche, bio keywords..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            />
          </div>
          {/* Niche Filter */}
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
          {/* Location Filter */}
          <div>
            <label htmlFor="filterLocation" className="block text-sm font-medium text-gray-700 mb-1">Location</label>
            <input
              type="text"
              id="filterLocation"
              placeholder="City, Country..."
              value={filterLocation}
              onChange={(e) => setFilterLocation(e.target.value)}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            />
          </div>
          {/* Min Audience Size Filter */}
          <div>
            <label htmlFor="minAudienceSize" className="block text-sm font-medium text-gray-700 mb-1">Min Audience</label>
            <input
              type="number"
              id="minAudienceSize"
              placeholder="e.g., 5000"
              value={minAudienceSize}
              onChange={(e) => setMinAudienceSize(e.target.value)}
              min="0"
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            />
          </div>
          {/* Max Audience Size Filter */}
          <div>
            <label htmlFor="maxAudienceSize" className="block text-sm font-medium text-gray-700 mb-1">Max Audience</label>
            <input
              type="number"
              id="maxAudienceSize"
              placeholder="e.g., 100000"
              value={maxAudienceSize}
              onChange={(e) => setMaxAudienceSize(e.target.value)}
              min="0"
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            />
          </div>
        </div>
      </div>

      {loading && <p className="text-center text-gray-600 py-10">Loading influencer profiles...</p>}
      {error && !loading && <p className="text-center text-red-500 bg-red-100 p-3 rounded-md">{error}</p>}

      {!loading && !error && filteredInfluencers.length === 0 && (
        <p className="text-center text-gray-600 py-10">No influencers found matching your criteria, or no influencers available.</p>
      )}

      {!loading && !error && filteredInfluencers.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-8"> {/* Adjusted xl:grid-cols and gap */}
          {filteredInfluencers.map(influencer => (
            <InfluencerCard key={influencer.id} influencer={influencer} />
          ))}
        </div>
      )}
    </div>
  );
};

export default InfluencerDiscoveryPage;
