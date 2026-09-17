import React from 'react';
import { BraidsCatalog } from '../components/BraidsCatalog';

export const BraidsPage = ({ onSelectBraidForBooking }) => {
  return (
    <div style={{ paddingTop: '100px' }}>
      <BraidsCatalog onSelectBraidForBooking={onSelectBraidForBooking} />
    </div>
  );
};
