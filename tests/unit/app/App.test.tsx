import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { App } from '@/app/App';

describe('App', () => {
  it('renders header, main content, and footer', () => {
    render(<App />);

    expect(screen.getByRole('banner')).toBeInTheDocument();
    expect(screen.getByText('Transform Studio', { selector: 'h1' })).toBeInTheDocument();
    expect(screen.getByRole('contentinfo')).toBeInTheDocument();
    expect(screen.getByText('Ready')).toBeInTheDocument();
  });
});
