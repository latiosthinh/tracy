import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { QaRecipeSelector } from './QaRecipeSelector';
import { QA_RECIPES } from '@/src/data/qaRecipes';

describe('QaRecipeSelector Component', () => {
  it('renders all QA recipe chips', () => {
    const handleSelect = vi.fn();
    render(<QaRecipeSelector onSelectRecipe={handleSelect} />);

    expect(screen.getByText('QA Test Recipes')).toBeInTheDocument();
    expect(screen.getByText('Form Validation & Errors')).toBeInTheDocument();
    expect(screen.getByText('Responsive & Mobile Menu')).toBeInTheDocument();
    expect(screen.getByText('Accessibility & ARIA Audit')).toBeInTheDocument();
    expect(screen.getByText('Auth & Session Edge Cases')).toBeInTheDocument();
    expect(screen.getByText('E-Commerce Checkout & Payment')).toBeInTheDocument();
  });

  it('triggers onSelectRecipe callback when clicked', () => {
    const handleSelect = vi.fn();
    render(<QaRecipeSelector onSelectRecipe={handleSelect} />);

    const formRecipeBtn = screen.getByText('Form Validation & Errors');
    fireEvent.click(formRecipeBtn);

    expect(handleSelect).toHaveBeenCalledTimes(1);
    expect(handleSelect).toHaveBeenCalledWith(QA_RECIPES[0]);
  });

  it('disables buttons when disabled prop is true', () => {
    const handleSelect = vi.fn();
    render(<QaRecipeSelector onSelectRecipe={handleSelect} disabled={true} />);

    const formRecipeBtn = screen.getByText('Form Validation & Errors').closest('button');
    expect(formRecipeBtn).toBeDisabled();

    if (formRecipeBtn) {
      fireEvent.click(formRecipeBtn);
    }
    expect(handleSelect).not.toHaveBeenCalled();
  });
});
