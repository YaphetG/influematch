import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { BrowserRouter } from 'react-router-dom'; // For <Link> if used actively
import InfluencerCard from './InfluencerCard'; // Adjust path

describe('InfluencerCard Component', () => {
  const mockInfluencer = {
    id: 'infTest1',
    displayName: 'Test Influencer Extraordinaire',
    profileImageUrl: 'http://example.com/profile.jpg',
    niche: 'Testing & QA',
    bio: 'I test all the things with great style and flair. Finding bugs is my passion.',
    location: 'Cyberspace',
    audienceSize: 123456,
  };

  const renderCard = (influencerProps = mockInfluencer) => {
    return render(
      <BrowserRouter> {/* Added BrowserRouter to handle potential Link component */}
        <InfluencerCard influencer={influencerProps} />
      </BrowserRouter>
    );
  };

  it('renders all influencer details correctly', () => {
    renderCard();
    expect(screen.getByText(mockInfluencer.displayName)).toBeInTheDocument();
    expect(screen.getByAltText(mockInfluencer.displayName)).toHaveAttribute('src', mockInfluencer.profileImageUrl);
    expect(screen.getByText(mockInfluencer.niche)).toBeInTheDocument();
    expect(screen.getByText(mockInfluencer.bio)).toBeInTheDocument();
    expect(screen.getByText(new RegExp(mockInfluencer.location, 'i'))).toBeInTheDocument();
    expect(screen.getByText(new RegExp(mockInfluencer.audienceSize.toLocaleString(), 'i'))).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /view profile \(coming soon\)/i })).toBeInTheDocument();
  });

  it('renders placeholder image if profileImageUrl is missing', () => {
    const influencerWithoutImage = { ...mockInfluencer, profileImageUrl: null };
    renderCard(influencerWithoutImage);
    const img = screen.getByAltText(influencerWithoutImage.displayName);
    expect(img.src).toContain('https://ui-avatars.com/api/');
  });

  it('renders displayName as "Influencer Name" if displayName is missing', () => {
    const influencerWithoutName = { ...mockInfluencer, displayName: null };
    renderCard(influencerWithoutName);
    expect(screen.getByText('Influencer Name')).toBeInTheDocument();
    // Check alt text of image too
    const img = screen.getByAltText('Influencer'); // Fallback alt text
    expect(img.src).toContain('https://ui-avatars.com/api/?name=Connect%20Sphere'); // Default name for ui-avatars if displayName is null
  });

  it('does not display niche if missing', () => {
    const influencerWithoutNiche = { ...mockInfluencer, niche: null };
    renderCard(influencerWithoutNiche);
    // Check that the specific niche rendering structure is not present
    // For example, if niche is wrapped in a specific element or has specific class:
    // expect(screen.queryByText(new RegExp(mockInfluencer.niche, 'i'))).not.toBeInTheDocument();
    // A more robust way is to ensure it doesn't render the "Niche:" label or the value itself if the structure is simple
    // For now, check if the value is absent
    expect(screen.queryByText(mockInfluencer.niche)).not.toBeInTheDocument();
  });

  it('does not display location if missing', () => {
    const influencerWithoutLocation = { ...mockInfluencer, location: null };
    renderCard(influencerWithoutLocation);
    expect(screen.queryByText(new RegExp('Location:', 'i'))).not.toBeInTheDocument();
    expect(screen.queryByText(new RegExp(mockInfluencer.location, 'i'))).not.toBeInTheDocument();
  });

  it('does not display audienceSize if missing or zero', () => {
    const influencerWithoutAudience = { ...mockInfluencer, audienceSize: null };
    renderCard(influencerWithoutAudience);
    expect(screen.queryByText(new RegExp('Audience:', 'i'))).not.toBeInTheDocument();

    const influencerZeroAudience = { ...mockInfluencer, audienceSize: 0 };
    renderCard(influencerZeroAudience);
    expect(screen.queryByText(new RegExp('Audience:', 'i'))).not.toBeInTheDocument();
  });

  it('formats audienceSize with toLocaleString', () => {
    const influencerWithLargeAudience = { ...mockInfluencer, audienceSize: 1234567 };
    renderCard(influencerWithLargeAudience);
    expect(screen.getByText('1,234,567')).toBeInTheDocument(); // Assuming en-US locale for testing
  });

  // Test for the placeholder link behavior (optional, as it's simple)
  it('View Profile link has a placeholder action', () => {
    window.alert = vi.fn(); // Mock window.alert
    renderCard();
    const link = screen.getByRole('link', { name: /view profile \(coming soon\)/i });
    link.click(); // userEvent.click(link) would also work
    expect(window.alert).toHaveBeenCalledWith(`Viewing full profile for ${mockInfluencer.displayName} (feature pending).`);
    window.alert.mockRestore(); // Clean up mock
  });
});
