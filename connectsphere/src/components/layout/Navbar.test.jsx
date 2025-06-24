import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import Navbar from './Navbar'; // Adjust path
import { AuthContext } from '../../contexts/AuthContext'; // Adjust path

// Mock react-router-dom's Link component for simplicity if needed, or rely on BrowserRouter
vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    // Link: vi.fn(({ to, children }) => <a href={to}>{children}</a>), // Optional: simple Link mock
  };
});


const mockLogout = vi.fn();

const renderNavbarWithUser = (currentUser) => {
  return render(
    <BrowserRouter>
      <AuthContext.Provider value={{ currentUser, logout: mockLogout, loadingAuth: false }}>
        <Navbar />
      </AuthContext.Provider>
    </BrowserRouter>
  );
};

describe('Navbar Component', () => {
  it('renders login and sign-up links when no user is authenticated', () => {
    renderNavbarWithUser(null);
    expect(screen.getByText(/connectsphere/i)).toBeInTheDocument(); // App Name / Logo
    expect(screen.getByRole('link', { name: /log in/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /sign up/i })).toBeInTheDocument();
    expect(screen.queryByText(/dashboard/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/profile/i)).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /logout/i })).not.toBeInTheDocument();
  });

  it('renders dashboard, profile, and logout links for an authenticated influencer', () => {
    const influencerUser = {
      uid: 'influencer1',
      displayName: 'Influencer User',
      role: 'influencer'
    };
    renderNavbarWithUser(influencerUser);

    expect(screen.getByText(/connectsphere/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /dashboard/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /dashboard/i })).toHaveAttribute('href', '/influencer/dashboard');
    expect(screen.getByRole('link', { name: /find opportunities/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /profile/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /logout/i })).toBeInTheDocument();

    expect(screen.queryByRole('link', { name: /log in/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /sign up/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /create campaign/i })).not.toBeInTheDocument(); // Business link
  });

  it('renders dashboard, create campaign, profile, and logout links for an authenticated business user', () => {
    const businessUser = {
      uid: 'business1',
      displayName: 'Business User',
      role: 'business'
    };
    renderNavbarWithUser(businessUser);

    expect(screen.getByText(/connectsphere/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /dashboard/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /dashboard/i })).toHaveAttribute('href', '/business/dashboard');
    expect(screen.getByRole('link', { name: /create campaign/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /profile/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /logout/i })).toBeInTheDocument();

    expect(screen.queryByRole('link', { name: /log in/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /sign up/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /find opportunities/i })).not.toBeInTheDocument(); // Influencer link
  });

  it('calls logout function when logout button is clicked', () => {
    const businessUser = { uid: 'business1', displayName: 'Business User', role: 'business' };
    renderNavbarWithUser(businessUser);

    const logoutButton = screen.getByRole('button', { name: /logout/i });
    logoutButton.click(); // Using fireEvent as userEvent might be overkill for a simple click

    expect(mockLogout).toHaveBeenCalledTimes(1);
  });
});
