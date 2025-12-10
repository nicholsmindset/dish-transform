import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@/test/utils';
import Pricing from './Pricing';

// Mock useNavigate
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

describe('Pricing Page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the pricing page with title', () => {
    render(<Pricing />);
    expect(screen.getByText('Professional Food Photography')).toBeInTheDocument();
  });

  it('shows subscription plans by default', () => {
    render(<Pricing />);
    expect(screen.getByText('Monthly Plans')).toBeInTheDocument();
    expect(screen.getByText('Starter')).toBeInTheDocument();
    expect(screen.getByText('Growth')).toBeInTheDocument();
    expect(screen.getByText('Premium')).toBeInTheDocument();
  });

  it('shows subscription perks banner', () => {
    render(<Pricing />);
    expect(screen.getByText('All Subscription Plans Include')).toBeInTheDocument();
    expect(screen.getByText('Priority Turnaround')).toBeInTheDocument();
    expect(screen.getByText('Rollover Images')).toBeInTheDocument();
    expect(screen.getByText('Free Re-edits')).toBeInTheDocument();
    expect(screen.getByText('Locked-in Pricing')).toBeInTheDocument();
  });

  it('has A La Carte tab available', () => {
    render(<Pricing />);
    expect(screen.getByText('A La Carte')).toBeInTheDocument();
  });

  it('shows correct pricing for subscription plans', () => {
    render(<Pricing />);

    // Check Starter pricing
    expect(screen.getByText('80')).toBeInTheDocument();

    // Check Growth pricing
    expect(screen.getByText('150')).toBeInTheDocument();

    // Check Premium pricing
    expect(screen.getByText('280')).toBeInTheDocument();
  });

  it('displays FAQ section', () => {
    render(<Pricing />);
    expect(screen.getByText('Frequently Asked Questions')).toBeInTheDocument();
    expect(screen.getByText('What happens to unused subscription images?')).toBeInTheDocument();
  });

  it('displays How It Works section', () => {
    render(<Pricing />);
    expect(screen.getByText('How It Works')).toBeInTheDocument();
    expect(screen.getByText('Upload')).toBeInTheDocument();
    expect(screen.getByText('AI Enhancement')).toBeInTheDocument();
    expect(screen.getByText('3 Variations')).toBeInTheDocument();
    expect(screen.getByText('Download')).toBeInTheDocument();
  });

  it('navigates to home when logo is clicked', () => {
    render(<Pricing />);

    const logo = screen.getByText('Dish Transform');
    fireEvent.click(logo);

    expect(mockNavigate).toHaveBeenCalledWith('/');
  });

  it('navigates to dashboard when Dashboard button is clicked', () => {
    render(<Pricing />);

    const dashboardButton = screen.getByText('Dashboard');
    fireEvent.click(dashboardButton);

    expect(mockNavigate).toHaveBeenCalledWith('/dashboard');
  });

  it('shows Most Popular badge on Growth plan', () => {
    render(<Pricing />);
    expect(screen.getByText('Most Popular')).toBeInTheDocument();
  });

  it('shows Best Value badge on Premium plan', () => {
    render(<Pricing />);
    expect(screen.getByText('Best Value')).toBeInTheDocument();
  });
});
