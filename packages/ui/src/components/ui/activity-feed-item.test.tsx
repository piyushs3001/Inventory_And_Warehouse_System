import { describe, it, expect } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { render, screen } from '@testing-library/react';
import { Package } from 'lucide-react';
import { ActivityFeedItem } from './activity-feed-item';

describe('ActivityFeedItem', () => {
  it('renders actor, action and timestamp', () => {
    render(<ActivityFeedItem icon={<Package />} tone="ok" actor="Marcus" action="received 320 units" time="2m ago" />);
    expect(screen.getByText('Marcus')).toBeInTheDocument();
    expect(screen.getByText('received 320 units')).toBeInTheDocument();
    expect(screen.getByText('2m ago')).toBeInTheDocument();
  });
});
