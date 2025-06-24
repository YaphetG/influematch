import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext'; // Path to AuthContext

const LandingPage = () => {
  const { currentUser } = useAuth();

  return (
    <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white min-h-[calc(100vh-64px)] flex flex-col justify-center items-center text-center px-4 sm:px-6 lg:px-8">
      {/* 64px is approx height of Navbar, adjust if Navbar height changes */}
      <header className="mb-12">
        <h1 className="text-5xl md:text-6xl font-extrabold tracking-tight mb-4">
          Welcome to ConnectSphere!
        </h1>
        <p className="text-xl md:text-2xl text-indigo-100 max-w-3xl mx-auto">
          The ultimate marketplace connecting innovative businesses with influential creators for powerful marketing collaborations.
        </p>
      </header>

      {!currentUser && (
        <div className="space-y-4 sm:space-y-0 sm:space-x-4">
          <Link
            to="/signup"
            className="inline-block bg-white text-indigo-600 font-semibold py-3 px-8 rounded-lg shadow-lg hover:bg-indigo-50 text-lg transition duration-150 ease-in-out transform hover:scale-105"
          >
            Get Started as an Influencer or Business
          </Link>
          <Link
            to="/login"
            className="inline-block bg-purple-500 hover:bg-purple-700 text-white font-semibold py-3 px-6 rounded-lg shadow-lg hover:bg-opacity-90 text-lg transition duration-150 ease-in-out"
          >
            Already have an account? Log In
          </Link>
        </div>
      )}

      {currentUser && (
         <div className="mt-8">
            <p className="text-xl text-indigo-200 mb-4">You are logged in as {currentUser.displayName}.</p>
            <Link
              to={currentUser.role === 'business' ? '/business/dashboard' : '/influencer/dashboard'}
              className="bg-white text-indigo-600 font-semibold py-3 px-8 rounded-lg shadow-lg hover:bg-indigo-50 text-lg transition duration-150 ease-in-out transform hover:scale-105"
            >
              Go to Your Dashboard
            </Link>
        </div>
      )}

      <section className="mt-20 max-w-4xl w-full">
        <h2 className="text-3xl font-bold mb-8 text-center text-white">How It Works</h2>
        <div className="grid md:grid-cols-3 gap-8 text-left">
          <div className="bg-white bg-opacity-20 p-6 rounded-lg shadow-xl backdrop-filter backdrop-blur-lg">
            <h3 className="text-xl font-semibold mb-2 text-indigo-100">1. Sign Up & Create Profile</h3>
            <p className="text-indigo-200">Businesses post campaigns. Influencers showcase their reach and niche.</p>
          </div>
          <div className="bg-white bg-opacity-20 p-6 rounded-lg shadow-xl backdrop-filter backdrop-blur-lg">
            <h3 className="text-xl font-semibold mb-2 text-indigo-100">2. Discover & Connect</h3>
            <p className="text-indigo-200">Browse opportunities or find the perfect influencer for your brand.</p>
          </div>
          <div className="bg-white bg-opacity-20 p-6 rounded-lg shadow-xl backdrop-filter backdrop-blur-lg">
            <h3 className="text-xl font-semibold mb-2 text-indigo-100">3. Collaborate & Grow</h3>
            <p className="text-indigo-200">Manage proposals, track progress, and achieve your marketing goals.</p>
          </div>
        </div>
      </section>

      <footer className="mt-20 text-center text-indigo-300 text-sm">
        <p>&copy; {new Date().getFullYear()} ConnectSphere. All rights reserved.</p>
      </footer>
    </div>
  );
};

export default LandingPage;
