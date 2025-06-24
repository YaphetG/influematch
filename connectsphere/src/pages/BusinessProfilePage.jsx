import React, { useState, useEffect, useCallback } from 'react';
import { doc, getDoc, setDoc, Timestamp } from 'firebase/firestore';
import { db } from '../firebase/firebaseConfig';
import { useAuth } from '../contexts/AuthContext';

const BusinessProfilePage = () => {
  const { currentUser } = useAuth();
  const [profile, setProfile] = useState({
    companyName: '',
    website: '',
    businessDescription: '',
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
            companyName: data.companyName || '',
            website: data.website || '',
            businessDescription: data.businessDescription || '',
          });
        } else {
          // Profile sub-document might not exist if signup didn't create it fully.
          console.log("No such business profile document! Initializing with defaults.");
        }
      } catch (err) {
        console.error("Error fetching business profile:", err);
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
      await setDoc(profileDocRef(), {
        ...profile,
        updatedAt: Timestamp.fromDate(new Date())
      }, { merge: true }); // merge:true ensures we don't overwrite other role-specific fields
      setSuccessMessage("Business profile updated successfully!");
    } catch (err) {
      console.error("Error updating business profile:", err);
      setError("Failed to update profile. Please try again.");
    } finally {
      setSaving(false);
      setTimeout(() => setSuccessMessage(''), 3000);
    }
  };

  if (loading) return <div className="p-6 text-center">Loading business profile...</div>;
  if (!currentUser) return <div className="p-6 text-center text-red-500">Not authorized. Please log in.</div>;

  return (
    <div className="container mx-auto p-4 sm:p-6 lg:p-8 max-w-3xl">
      <h1 className="text-3xl font-bold mb-8 text-gray-800">Manage Your Business Profile</h1>
      {error && <p className="bg-red-100 text-red-700 p-3 rounded-md mb-4">{error}</p>}
      {successMessage && <p className="bg-green-100 text-green-700 p-3 rounded-md mb-4">{successMessage}</p>}

      <form onSubmit={handleSubmit} className="space-y-8 bg-white p-8 rounded-lg shadow-xl">
        <section>
          <h2 className="text-xl font-semibold mb-4 text-gray-700">Company Information</h2>
          <div className="space-y-4">
            <div>
              <label htmlFor="companyName" className="block text-sm font-medium text-gray-700 mb-1">Company Name</label>
              <input
                type="text"
                name="companyName"
                id="companyName"
                value={profile.companyName}
                onChange={handleChange}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                placeholder="Your Company's Name"
                required
              />
            </div>
            <div>
              <label htmlFor="website" className="block text-sm font-medium text-gray-700 mb-1">Company Website</label>
              <input
                type="url"
                name="website"
                id="website"
                value={profile.website}
                onChange={handleChange}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                placeholder="https://yourcompany.com"
              />
            </div>
            <div>
              <label htmlFor="businessDescription" className="block text-sm font-medium text-gray-700 mb-1">Business Description</label>
              <textarea
                name="businessDescription"
                id="businessDescription"
                rows="4"
                value={profile.businessDescription}
                onChange={handleChange}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                placeholder="Describe your business, its mission, and the types of collaborations you seek."
                required
              ></textarea>
            </div>
          </div>
        </section>

        <div className="pt-5">
          <button
            type="submit"
            disabled={saving || loading}
            className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-base font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:bg-indigo-300"
          >
            {saving ? 'Saving...' : 'Save Business Profile'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default BusinessProfilePage;
