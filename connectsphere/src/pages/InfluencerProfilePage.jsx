import React, { useState, useEffect, useCallback } from 'react';
import { doc, getDoc, setDoc, updateDoc, Timestamp } from 'firebase/firestore';
import { db } from '../firebase/firebaseConfig';
import { useAuth } from '../contexts/AuthContext'; // To get current user

const InfluencerProfilePage = () => {
  const { currentUser } = useAuth();
  const [profile, setProfile] = useState({
    niche: '',
    bio: '',
    socialLinks: { youtube: '', instagram: '', tiktok: '', twitter: '', other: '' },
    audienceDemographics: { ageRange: '', genderSplit: '', topLocations: '' }, // Simplified for now
    rateCard: [{ service: '', price: '' }],
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const profileDocRef = useCallback(() => {
    if (currentUser) {
      return doc(db, "users", currentUser.uid, "profile", currentUser.uid);
    }
    return null;
  }, [currentUser]);

  useEffect(() => {
    const fetchProfile = async () => {
      if (!currentUser || !profileDocRef()) {
        setLoading(false);
        return;
      }
      try {
        setError('');
        const docSnap = await getDoc(profileDocRef());
        if (docSnap.exists()) {
          const data = docSnap.data();
          setProfile({
            niche: data.niche || '',
            bio: data.bio || '',
            socialLinks: data.socialLinks || { youtube: '', instagram: '', tiktok: '', twitter: '', other: '' },
            audienceDemographics: data.audienceDemographics || { ageRange: '', genderSplit: '', topLocations: '' },
            rateCard: data.rateCard && data.rateCard.length > 0 ? data.rateCard : [{ service: '', price: '' }],
          });
        } else {
          // Profile sub-document might not exist if signup didn't create it or it was deleted
          // Initialize with default structure from useState
          console.log("No such profile document! Initializing with defaults.");
        }
      } catch (err) {
        console.error("Error fetching profile:", err);
        setError("Failed to load profile data. Please try again.");
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [currentUser, profileDocRef]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setProfile(prev => ({ ...prev, [name]: value }));
  };

  const handleSocialLinkChange = (e) => {
    const { name, value } = e.target;
    setProfile(prev => ({
      ...prev,
      socialLinks: { ...prev.socialLinks, [name]: value }
    }));
  };

  const handleAudienceChange = (e) => {
    const { name, value } = e.target;
    setProfile(prev => ({
      ...prev,
      audienceDemographics: { ...prev.audienceDemographics, [name]: value }
    }));
  };

  const handleRateCardChange = (index, e) => {
    const { name, value } = e.target;
    const updatedRateCard = [...profile.rateCard];
    updatedRateCard[index] = { ...updatedRateCard[index], [name]: value };
    setProfile(prev => ({ ...prev, rateCard: updatedRateCard }));
  };

  const addRateCardItem = () => {
    setProfile(prev => ({
      ...prev,
      rateCard: [...prev.rateCard, { service: '', price: '' }]
    }));
  };

  const removeRateCardItem = (index) => {
    const updatedRateCard = profile.rateCard.filter((_, i) => i !== index);
    setProfile(prev => ({ ...prev, rateCard: updatedRateCard.length > 0 ? updatedRateCard : [{ service: '', price: '' }] }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!currentUser || !profileDocRef()) {
      setError("User not found. Cannot save profile.");
      return;
    }
    setSaving(true);
    setError('');
    setSuccessMessage('');
    try {
      // Check if document exists to decide between setDoc and updateDoc
      // For simplicity, using setDoc with merge:true will create or overwrite.
      // Or, use updateDoc if sure it exists, setDoc if creating.
      // Since signup should create it, updateDoc is usually fine.
      // Using set with merge to be safe if it was somehow deleted.
      await setDoc(profileDocRef(), {
        ...profile,
        updatedAt: Timestamp.fromDate(new Date())
      }, { merge: true }); // merge:true ensures we don't overwrite fields not in the form
      setSuccessMessage("Profile updated successfully!");
    } catch (err) {
      console.error("Error updating profile:", err);
      setError("Failed to update profile. Please try again.");
    } finally {
      setSaving(false);
      setTimeout(() => setSuccessMessage(''), 3000); // Clear message after 3s
    }
  };

  if (loading) return <div className="p-6 text-center">Loading profile...</div>;
  if (!currentUser) return <div className="p-6 text-center text-red-500">Not authorized. Please log in.</div>;
  // Assuming role check is handled by ProtectedRoute in App.jsx

  return (
    <div className="container mx-auto p-4 sm:p-6 lg:p-8 max-w-3xl">
      <h1 className="text-3xl font-bold mb-8 text-gray-800">Manage Your Influencer Profile</h1>
      {error && <p className="bg-red-100 text-red-700 p-3 rounded-md mb-4">{error}</p>}
      {successMessage && <p className="bg-green-100 text-green-700 p-3 rounded-md mb-4">{successMessage}</p>}

      <form onSubmit={handleSubmit} className="space-y-8 bg-white p-8 rounded-lg shadow-xl">
        {/* Basic Info */}
        <section>
          <h2 className="text-xl font-semibold mb-4 text-gray-700">Basic Information</h2>
          <div className="space-y-4">
            <div>
              <label htmlFor="niche" className="block text-sm font-medium text-gray-700 mb-1">Niche (e.g., Fashion, Gaming, Food)</label>
              <input type="text" name="niche" id="niche" value={profile.niche} onChange={handleChange} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" placeholder="Your primary content category" />
            </div>
            <div>
              <label htmlFor="bio" className="block text-sm font-medium text-gray-700 mb-1">Bio / About You</label>
              <textarea name="bio" id="bio" rows="4" value={profile.bio} onChange={handleChange} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" placeholder="Tell businesses about yourself, your style, and what you offer."></textarea>
            </div>
          </div>
        </section>

        {/* Social Links */}
        <section>
          <h2 className="text-xl font-semibold mb-4 text-gray-700">Social Media Links</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {Object.keys(profile.socialLinks).map(key => (
              <div key={key}>
                <label htmlFor={`social-${key}`} className="block text-sm font-medium text-gray-700 capitalize mb-1">{key}</label>
                <input type="url" name={key} id={`social-${key}`} value={profile.socialLinks[key]} onChange={handleSocialLinkChange} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" placeholder={`https:// ${key}.com/yourprofile`} />
              </div>
            ))}
          </div>
        </section>

        {/* Audience Demographics */}
        <section>
          <h2 className="text-xl font-semibold mb-4 text-gray-700">Audience Demographics (Optional)</h2>
          <div className="space-y-4">
             <div>
                <label htmlFor="audience-ageRange" className="block text-sm font-medium text-gray-700 mb-1">Primary Age Range</label>
                <input type="text" name="ageRange" id="audience-ageRange" value={profile.audienceDemographics.ageRange} onChange={handleAudienceChange} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" placeholder="e.g., 18-24, 25-34" />
            </div>
            <div>
                <label htmlFor="audience-genderSplit" className="block text-sm font-medium text-gray-700 mb-1">Gender Split</label>
                <input type="text" name="genderSplit" id="audience-genderSplit" value={profile.audienceDemographics.genderSplit} onChange={handleAudienceChange} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" placeholder="e.g., 60% Female, 40% Male" />
            </div>
            <div>
                <label htmlFor="audience-topLocations" className="block text-sm font-medium text-gray-700 mb-1">Top Locations (Countries/Cities)</label>
                <input type="text" name="topLocations" id="audience-topLocations" value={profile.audienceDemographics.topLocations} onChange={handleAudienceChange} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" placeholder="e.g., USA, UK, Canada" />
            </div>
          </div>
        </section>

        {/* Rate Card */}
        <section>
          <h2 className="text-xl font-semibold mb-4 text-gray-700">Rate Card</h2>
          {profile.rateCard.map((item, index) => (
            <div key={index} className="flex items-center gap-4 mb-3 p-3 border border-gray-200 rounded-md">
              <div className="flex-grow">
                <label htmlFor={`service-${index}`} className="sr-only">Service</label>
                <input type="text" name="service" id={`service-${index}`} value={item.service} onChange={(e) => handleRateCardChange(index, e)} className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" placeholder="Service (e.g., 1 Instagram Post)" />
              </div>
              <div className="w-1/3">
                <label htmlFor={`price-${index}`} className="sr-only">Price</label>
                <input type="number" name="price" id={`price-${index}`} value={item.price} onChange={(e) => handleRateCardChange(index, e)} className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" placeholder="Price (USD)" />
              </div>
              {profile.rateCard.length > 1 && (
                <button type="button" onClick={() => removeRateCardItem(index)} className="text-red-500 hover:text-red-700 font-medium">Remove</button>
              )}
            </div>
          ))}
          <button type="button" onClick={addRateCardItem} className="mt-2 text-sm text-indigo-600 hover:text-indigo-800 font-medium">
            + Add Service
          </button>
        </section>

        <div className="pt-5">
          <button
            type="submit"
            disabled={saving || loading}
            className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-base font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:bg-indigo-300"
          >
            {saving ? 'Saving...' : 'Save Profile'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default InfluencerProfilePage;
