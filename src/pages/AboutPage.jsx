import React from 'react';
import { SalonInfo } from '../components/SalonInfo';
import { ClientNotificationWidget } from '../components/ClientNotificationWidget';
import { Testimonials } from '../components/Testimonials';

export const AboutPage = () => {
  return (
    <div style={{ paddingTop: '100px' }}>
      <SalonInfo />
      <ClientNotificationWidget />
      <Testimonials />
    </div>
  );
};
