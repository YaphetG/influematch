import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext'; // Adjusted path

const Navbar = () => {
  const { currentUser, logout } = useAuth();

  return (
    <nav className="bg-gray-800 text-white shadow-md">
      <div className="container mx-auto px-6 py-3 flex justify-between items-center">
        <Link to="/" className="text-2xl font-bold hover:text-gray-300">
          ConnectSphere
        </Link>
        <div className="flex items-center">
          {currentUser ? (
            <>
              {currentUser.role === 'influencer' && (
                <>
                  <Link to="/influencer/dashboard" className="px-3 py-2 rounded-md text-sm font-medium hover:bg-gray-700">
                    Dashboard
                  </Link>
                  <Link to="/influencer/opportunities" className="px-3 py-2 rounded-md text-sm font-medium hover:bg-gray-700">
                    Find Opportunities
                  </Link>
                </>
              )}
              {currentUser.role === 'business' && (
                <Link to="/business/dashboard" className="px-3 py-2 rounded-md text-sm font-medium hover:bg-gray-700">
                  Dashboard
                </Link>
                <Link to="/business/campaigns/new" className="px-3 py-2 rounded-md text-sm font-medium hover:bg-gray-700">
                  Create Campaign
                </Link>
                <Link to="/business/find-influencers" className="px-3 py-2 rounded-md text-sm font-medium hover:bg-gray-700">
                  Find Influencers
                </Link>
              )}
              <Link to="/profile" className="px-3 py-2 rounded-md text-sm font-medium hover:bg-gray-700">
                Profile
              </Link>
              {/* Add more role-specific links here as needed */}
              <button
                onClick={logout}
                className="ml-4 px-3 py-2 rounded-md text-sm font-medium text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-red-500"
              >
                Logout
              </button>
            </>
          ) : (
            <>
              <Link to="/login" className="px-3 py-2 rounded-md text-sm font-medium hover:bg-gray-700">
                Log In
              </Link>
              <Link
                to="/signup"
                className="ml-4 px-3 py-2 rounded-md text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-indigo-500"
              >
                Sign Up
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
