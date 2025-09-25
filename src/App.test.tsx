import React from 'react';
import { render, screen } from '@testing-library/react';
import App from './App';

test('renders Blaze Intelligence header link', () => {
  render(<App />);
  const linkElement = screen.getByRole('link', { name: /blaze/i });
  expect(linkElement).toBeInTheDocument();
});
