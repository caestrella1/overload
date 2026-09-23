import { render, screen } from '@testing-library/react';
import { App } from './App';

describe('App', () => {
  it('renders navigation and the empty dashboard', async () => {
    render(<App />);
    // Both navs render; CSS shows one per width, so each carries its own label.
    expect(screen.getByRole('navigation', { name: 'Main' })).toBeInTheDocument();
    expect(screen.getByRole('navigation', { name: 'Main, bottom bar' })).toBeInTheDocument();
    expect(await screen.findByText('No workouts yet')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Import a Strong CSV export/ })).toHaveAttribute(
      'href',
      '#/import',
    );
  });
});
