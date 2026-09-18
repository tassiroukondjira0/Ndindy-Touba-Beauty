import React from 'react';
import { Hero } from '../components/Hero';
import { SalonInfo } from '../components/SalonInfo';
import { QuickTrackingBanner } from '../components/QuickTrackingBanner';
import { Testimonials } from '../components/Testimonials';

export const HomePage = ({ onOpenBooking, navigateTo }) => {
  return (
    <div>
      <Hero onOpenBooking={onOpenBooking} navigateTo={navigateTo} />
      <SalonInfo />
      <QuickTrackingBanner navigateTo={navigateTo} />
      <Testimonials />
    </div>
  );
};
