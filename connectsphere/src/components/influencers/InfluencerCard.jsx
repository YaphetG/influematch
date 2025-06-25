import React from 'react';
import { Link } from 'react-router-dom'; // Optional: if linking to a full profile page

const InfluencerCard = ({ influencer }) => {
  const {
    id,
    displayName,
    profileImageUrl,
    niche,
    bio,
    // socialLinks, // Could be used to display icons or links
    // rateCard, // Probably too much detail for a card view
  } = influencer;

  const placeholderImage = `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName || 'Connect Sphere')}&background=random&color=fff&size=128`;

  return (
    <div className="bg-white rounded-xl shadow-lg overflow-hidden flex flex-col transition-all duration-300 hover:shadow-2xl">
      <div className="h-32 bg-gradient-to-r from-indigo-500 to-purple-600"></div> {/* Decorative header */}
      <div className="p-6 flex flex-col items-center -mt-16"> {/* Negative margin to pull avatar up */}
        <img
          src={profileImageUrl || placeholderImage}
          alt={displayName || 'Influencer'}
          className="w-28 h-28 rounded-full border-4 border-white shadow-md object-cover bg-gray-200"
          onError={(e) => { e.target.onerror = null; e.target.src = placeholderImage; }} // Fallback for broken image URLs
        />
        <h2 className="text-2xl font-bold text-gray-800 mt-4 text-center">{displayName || 'Influencer Name'}</h2>
        {niche && (
          <p className="text-sm text-indigo-600 font-semibold mt-1 capitalize bg-indigo-50 px-2 py-0.5 rounded-full">
            {niche}
          </p>
        )}
        {bio && (
          <p className="text-gray-600 text-sm mt-3 text-center line-clamp-3 leading-relaxed">
            {bio}
          </p>
        )}
      </div>
      <div className="mt-auto p-6 border-t border-gray-200 bg-gray-50">
        {/*
          Placeholder for future actions.
          A full public profile view for influencers is not explicitly part of this feature iteration.
          If it were, this link would go to `/influencers/${id}` or similar.
        */}
        <Link
          to={`#`} // Replace with actual profile link if/when available e.g. `/influencer/${id}/profile_view`
          className="block w-full text-center bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2 px-4 rounded-md transition duration-150 ease-in-out focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-opacity-50"
          onClick={(e) => { e.preventDefault(); alert(`Viewing full profile for ${displayName} (feature pending).`); }} // Placeholder action
        >
          View Profile (Coming Soon)
        </Link>
        {/* Or display some social links here if desired */}
        {/* Example:
          <div className="flex justify-center space-x-3 mt-3">
            {socialLinks?.instagram && <a href={socialLinks.instagram} target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-pink-500">IG</a>}
            {socialLinks?.youtube && <a href={socialLinks.youtube} target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-red-500">YT</a>}
          </div>
        */}
      </div>
    </div>
  );
};

export default InfluencerCard;
