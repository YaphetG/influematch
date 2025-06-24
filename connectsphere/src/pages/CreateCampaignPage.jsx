import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, addDoc, Timestamp } from 'firebase/firestore';
import { db } from '../firebase/firebaseConfig';
import { useAuth } from '../contexts/AuthContext';

const CreateCampaignPage = () => {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [campaign, setCampaign] = useState({
    title: '',
    description: '',
    deliverables: '',
    budget: '', // Stored as number in Firestore, but input is string initially
    niche: '', // Could be a dropdown or tags input later
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const handleChange = (e) => {
    const { name, value } = e.target;
    setCampaign(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!currentUser || currentUser.role !== 'business') {
      setError("You must be logged in as a business to create a campaign.");
      return;
    }

    // Basic validation
    if (!campaign.title.trim() || !campaign.description.trim() || !campaign.deliverables.trim()) {
        setError("Please fill in all required fields: Title, Description, Deliverables.");
        return;
    }
    if (isNaN(parseFloat(campaign.budget)) || parseFloat(campaign.budget) <= 0) {
        setError("Budget must be a positive number.");
        return;
    }

    setLoading(true);
    setError('');
    setSuccessMessage('');

    try {
      await addDoc(collection(db, "campaigns"), {
        businessId: currentUser.uid,
        businessName: currentUser.displayName, // Store denormalized business name for easier display
        title: campaign.title.trim(),
        description: campaign.description.trim(),
        deliverables: campaign.deliverables.trim(),
        budget: parseFloat(campaign.budget),
        niche: campaign.niche.trim().toLowerCase(), // Normalize niche
        status: 'open',
        createdAt: Timestamp.fromDate(new Date()),
        proposalsCount: 0, // Initialize proposals count
      });
      setSuccessMessage("Campaign created successfully!");
      // Optionally reset form
      setCampaign({ title: '', description: '', deliverables: '', budget: '', niche: '' });
      // Navigate to business dashboard or campaign list after a delay
      setTimeout(() => {
        navigate('/business/dashboard'); // Or a page showing "My Campaigns"
      }, 2000);
    } catch (err) {
      console.error("Error creating campaign:", err);
      setError("Failed to create campaign. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Redirect if not a business user or not logged in (though ProtectedRoute should also handle this)
  if (!currentUser) {
    navigate('/login');
    return null;
  }
  if (currentUser.role !== 'business') {
    navigate('/'); // Or an unauthorized page
    return <p className="p-6 text-red-500">You are not authorized to view this page.</p>;
  }

  return (
    <div className="container mx-auto p-4 sm:p-6 lg:p-8 max-w-3xl">
      <h1 className="text-3xl font-bold mb-8 text-gray-800">Create New Marketing Campaign</h1>
      {error && <p className="bg-red-100 text-red-700 p-3 rounded-md mb-4">{error}</p>}
      {successMessage && <p className="bg-green-100 text-green-700 p-3 rounded-md mb-4">{successMessage}</p>}

      <form onSubmit={handleSubmit} className="space-y-6 bg-white p-8 rounded-lg shadow-xl">
        <div>
          <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">Campaign Title</label>
          <input
            type="text"
            name="title"
            id="title"
            value={campaign.title}
            onChange={handleChange}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            placeholder="e.g., Summer Product Launch"
            required
          />
        </div>

        <div>
          <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">Campaign Description</label>
          <textarea
            name="description"
            id="description"
            rows="4"
            value={campaign.description}
            onChange={handleChange}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            placeholder="Detailed description of the campaign, goals, and target audience."
            required
          ></textarea>
        </div>

        <div>
          <label htmlFor="deliverables" className="block text-sm font-medium text-gray-700 mb-1">Key Deliverables</label>
          <textarea
            name="deliverables"
            id="deliverables"
            rows="3"
            value={campaign.deliverables}
            onChange={handleChange}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            placeholder="e.g., 2 Instagram posts, 1 YouTube video, 3 stories."
            required
          ></textarea>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label htmlFor="budget" className="block text-sm font-medium text-gray-700 mb-1">Budget (USD)</label>
            <input
              type="number"
              name="budget"
              id="budget"
              value={campaign.budget}
              onChange={handleChange}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              placeholder="e.g., 500"
              min="0"
              step="any"
              required
            />
          </div>
          <div>
            <label htmlFor="niche" className="block text-sm font-medium text-gray-700 mb-1">Target Niche/Category</label>
            <input
              type="text"
              name="niche"
              id="niche"
              value={campaign.niche}
              onChange={handleChange}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              placeholder="e.g., Fashion, Technology, Travel (comma-separated if multiple)"
            />
          </div>
        </div>

        <div className="pt-5">
          <button
            type="submit"
            disabled={loading}
            className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-base font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:bg-green-300"
          >
            {loading ? 'Creating Campaign...' : 'Create Campaign'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default CreateCampaignPage;
