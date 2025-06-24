import React from 'react';
import { Routes, Route, Link, Navigate } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';
import SignUp from './pages/SignUp';
import Login from './pages/Login';
import LandingPage from './pages/LandingPage'; // Import new LandingPage
import Navbar from './components/layout/Navbar'; // Import Navbar

// Placeholder components for dashboards
// const LandingPage = () => ( ... ) // Removed

import InfluencerProfilePage from './pages/InfluencerProfilePage'; // Import InfluencerProfilePage
// Placeholder for BusinessProfilePage - will be created in the next step
// import BusinessProfilePage from './pages/BusinessProfilePage';

const InfluencerDashboard = () => <h1 className="text-2xl p-4">Influencer Dashboard</h1>;
const BusinessDashboard = () => <h1 className="text-2xl p-4">Business Dashboard</h1>;

// This component will decide which profile page to show
const ProfilePageRouter = () => {
  const { currentUser } = useAuth();
  if (!currentUser) return <Navigate to="/login" replace />;

  if (currentUser.role === 'influencer') {
    return <InfluencerProfilePage />;
  } else if (currentUser.role === 'business') {
    // return <BusinessProfilePage />; // Uncomment when BusinessProfilePage is ready
    return <div className="p-6">Business Profile Page (Coming Soon)</div>; // Placeholder
  }
  return <div className="p-6">Unknown user role. Cannot display profile.</div>;
};

// Basic ProtectedRoute component
const ProtectedRoute = ({ children, allowedRoles }) => {
  const { currentUser, loadingAuth } = useAuth();

  if (loadingAuth) {
    return <div>Loading...</div>; // Or a spinner component
  }

  if (!currentUser) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(currentUser.role)) {
    // If role is not allowed, redirect to a generic dashboard or home
    // Or show an "Unauthorized" page
    // For now, redirecting to a generic path based on their role if they try to access wrong dashboard
    return <Navigate to={currentUser.role === 'business' ? '/business/dashboard' : '/influencer/dashboard'} replace />;
  }

  return children;
};


function App() {
  const { currentUser, loadingAuth, logout } = useAuth(); // Add logout

  if (loadingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-xl">Loading ConnectSphere...</p>
        {/* You can add a spinner here */}
      </div>
    );
  }

  return (
    <>
      <Navbar /> {/* Use the Navbar component */}

      {/* Main content area: Apply min-h-screen if footer is not always at bottom or if pages are short */}
      {/* For pages like LandingPage that define their own min-height, this p-4 might be extra or could be on a wrapper inside the page itself */}
      <main> {/* Replaced div with main for semantics */}
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/signup" element={!currentUser ? <SignUp /> : <Navigate to="/" />} />
          <Route path="/login" element={!currentUser ? <Login /> : <Navigate to="/" />} />

          {/* Protected Routes */}
          <Route
            path="/influencer/dashboard"
            element={
              <ProtectedRoute allowedRoles={['influencer']}>
                <InfluencerDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/business/dashboard"
            element={
              <ProtectedRoute allowedRoles={['business']}>
                <BusinessDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/profile"
            element={
              <ProtectedRoute>
                {/* No specific role, just needs login */}
                <UserProfile />
              </ProtectedRoute>
            }
          />

          {/* Add other routes here */}
          <Route path="*" element={<Navigate to="/" replace />} /> {/* Fallback for unknown paths */}
        </Routes>
      </div>
    </>
  );
}

export default App;
