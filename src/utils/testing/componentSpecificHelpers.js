import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import { act } from '@testing-library/react';

/**
 * Component-Specific Test Helpers
 * 
 * Specialized utilities for testing different types of components
 */

// =============================================================================
// FORM COMPONENT HELPERS
// =============================================================================

/**
 * Test form validation behavior
 */
export const testFormValidation = async (FormComponent, testCases) => {
  const results = [];
  
  for (const testCase of testCases) {
    const { input, expectedErrors, description } = testCase;
    const mockOnSubmit = vi.fn();
    
    const { container, rerender } = render(
      <FormComponent onSubmit={mockOnSubmit} initialData={input} />
    );
    
    // Try to submit the form
    const submitButton = container.querySelector('[type="submit"]') || 
                        container.querySelector('[data-testid="submit"]');
    
    if (submitButton) {
      await act(async () => {
        fireEvent.click(submitButton);
      });
    }
    
    // Check for validation errors
    const errorElements = container.querySelectorAll('[data-testid*="error"], .error, [role="alert"]');
    const actualErrors = Array.from(errorElements).map(el => el.textContent);
    
    results.push({
      description,
      input,
      expectedErrors,
      actualErrors,
      formSubmitted: mockOnSubmit.mock.calls.length > 0,
      passed: expectedErrors.every(error => 
        actualErrors.some(actual => actual.includes(error))
      )
    });
  }
  
  return results;
};

/**
 * Test multi-step form navigation
 */
export const testMultiStepForm = async (FormComponent, steps) => {
  const mockOnComplete = vi.fn();
  const { container } = render(<FormComponent onComplete={mockOnComplete} />);
  
  const results = [];
  
  for (let i = 0; i < steps.length; i++) {
    const step = steps[i];
    
    // Fill current step
    if (step.data) {
      for (const [fieldName, value] of Object.entries(step.data)) {
        const field = container.querySelector(`[name="${fieldName}"]`);
        if (field) {
          await act(async () => {
            fireEvent.change(field, { target: { value } });
          });
        }
      }
    }
    
    // Navigate to next step
    const nextButton = container.querySelector('[data-testid="next"]') ||
                      container.querySelector('.next-button') ||
                      container.querySelector('button:contains("Next")');
    
    if (nextButton && i < steps.length - 1) {
      await act(async () => {
        fireEvent.click(nextButton);
      });
    }
    
    // Verify step content
    const stepIndicator = container.querySelector('[data-testid="current-step"]');
    const currentStep = stepIndicator ? parseInt(stepIndicator.textContent) : i + 1;
    
    results.push({
      stepNumber: i + 1,
      expectedStep: i + 1,
      actualStep: currentStep,
      stepData: step.data,
      stepValid: currentStep === i + 1
    });
  }
  
  return results;
};

// =============================================================================
// MODAL COMPONENT HELPERS
// =============================================================================

/**
 * Test modal behavior (open, close, backdrop, etc.)
 */
export const testModalBehavior = async (ModalComponent, props = {}) => {
  const mockOnClose = vi.fn();
  const defaultProps = { isOpen: false, onClose: mockOnClose, ...props };
  
  const { rerender } = render(<ModalComponent {...defaultProps} />);
  
  const results = {
    initiallyHidden: !screen.queryByRole('dialog'),
    opensCorrectly: false,
    closesOnBackdrop: false,
    closesOnEscape: false,
    trapsfocus: false
  };
  
  // Test opening
  rerender(<ModalComponent {...defaultProps} isOpen={true} />);
  await waitFor(() => {
    results.opensCorrectly = !!screen.queryByRole('dialog');
  });
  
  if (results.opensCorrectly) {
    const modal = screen.getByRole('dialog');
    
    // Test backdrop click
    const backdrop = modal.parentElement;
    if (backdrop) {
      await act(async () => {
        fireEvent.click(backdrop);
      });
      results.closesOnBackdrop = mockOnClose.mock.calls.length > 0;
    }
    
    // Reset mock
    mockOnClose.mockClear();
    
    // Test escape key
    await act(async () => {
      fireEvent.keyDown(document, { key: 'Escape' });
    });
    results.closesOnEscape = mockOnClose.mock.calls.length > 0;
    
    // Test focus trap
    const focusableElements = modal.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    
    if (focusableElements.length > 1) {
      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];
      
      // Focus should start on first element
      firstElement.focus();
      results.trapsocus = document.activeElement === firstElement;
      
      // Tab from last element should go to first
      lastElement.focus();
      await act(async () => {
        fireEvent.keyDown(lastElement, { key: 'Tab' });
      });
      results.trapsocus = results.trapsocus && document.activeElement === firstElement;
    }
  }
  
  return results;
};

// =============================================================================
// LIST COMPONENT HELPERS
// =============================================================================

/**
 * Test list rendering and interactions
 */
export const testListComponent = async (ListComponent, testData) => {
  const mockOnItemClick = vi.fn();
  const mockOnItemSelect = vi.fn();
  
  const { container, rerender } = render(
    <ListComponent 
      items={testData.items}
      onItemClick={mockOnItemClick}
      onItemSelect={mockOnItemSelect}
    />
  );
  
  const results = {
    rendersAllItems: false,
    handlesEmptyState: false,
    handlesItemClick: false,
    handlesItemSelection: false,
    supportsKeyboardNavigation: false
  };
  
  // Test item rendering
  const listItems = container.querySelectorAll('[data-testid*="item"], li, [role="listitem"]');
  results.rendersAllItems = listItems.length === testData.items.length;
  
  // Test empty state
  rerender(
    <ListComponent 
      items={[]}
      onItemClick={mockOnItemClick}
      onItemSelect={mockOnItemSelect}
    />
  );
  
  const emptyState = container.querySelector('[data-testid="empty-state"], .empty-state');
  results.handlesEmptyState = !!emptyState;
  
  // Restore items for further testing
  rerender(
    <ListComponent 
      items={testData.items}
      onItemClick={mockOnItemClick}
      onItemSelect={mockOnItemSelect}
    />
  );
  
  // Test item interactions
  const firstItem = container.querySelector('[data-testid*="item"], li, [role="listitem"]');
  if (firstItem) {
    await act(async () => {
      fireEvent.click(firstItem);
    });
    results.handlesItemClick = mockOnItemClick.mock.calls.length > 0;
    
    // Test keyboard navigation
    await act(async () => {
      fireEvent.keyDown(firstItem, { key: 'ArrowDown' });
    });
    
    const secondItem = container.querySelectorAll('[data-testid*="item"], li, [role="listitem"]')[1];
    if (secondItem) {
      results.supportsKeyboardNavigation = document.activeElement === secondItem;
    }
  }
  
  return results;
};

/**
 * Test infinite scroll or pagination
 */
export const testListPagination = async (ListComponent, paginationProps) => {
  const mockLoadMore = vi.fn();
  const { container } = render(
    <ListComponent 
      {...paginationProps}
      onLoadMore={mockLoadMore}
    />
  );
  
  const results = {
    showsLoadMoreButton: false,
    triggersLoadMore: false,
    handlesInfiniteScroll: false
  };
  
  // Check for load more button
  const loadMoreButton = container.querySelector('[data-testid="load-more"], .load-more');
  results.showsLoadMoreButton = !!loadMoreButton;
  
  if (loadMoreButton) {
    await act(async () => {
      fireEvent.click(loadMoreButton);
    });
    results.triggersLoadMore = mockLoadMore.mock.calls.length > 0;
  }
  
  // Test infinite scroll
  const scrollContainer = container.querySelector('[data-testid="scroll-container"]') || container;
  await act(async () => {
    fireEvent.scroll(scrollContainer, { target: { scrollTop: scrollContainer.scrollHeight } });
  });
  
  // Wait a bit for scroll handler
  await new Promise(resolve => setTimeout(resolve, 100));
  results.handlesInfiniteScroll = mockLoadMore.mock.calls.length > 0;
  
  return results;
};

// =============================================================================
// CARD COMPONENT HELPERS
// =============================================================================

/**
 * Test card component interactions
 */
export const testCardComponent = async (CardComponent, cardProps) => {
  const mockOnClick = vi.fn();
  const mockOnAction = vi.fn();
  
  const { container } = render(
    <CardComponent 
      {...cardProps}
      onClick={mockOnClick}
      onAction={mockOnAction}
    />
  );
  
  const results = {
    rendersContent: false,
    handlesClick: false,
    handlesActions: false,
    showsLoadingState: false,
    showsErrorState: false
  };
  
  // Check content rendering
  const cardContent = container.querySelector('[data-testid="card-content"]') ||
                     container.querySelector('.card-content') ||
                     container.firstChild;
  
  results.rendersContent = !!cardContent && cardContent.textContent.length > 0;
  
  // Test click handling
  if (cardContent) {
    await act(async () => {
      fireEvent.click(cardContent);
    });
    results.handlesClick = mockOnClick.mock.calls.length > 0;
  }
  
  // Test action buttons
  const actionButtons = container.querySelectorAll('[data-testid*="action"], .action-button');
  if (actionButtons.length > 0) {
    await act(async () => {
      fireEvent.click(actionButtons[0]);
    });
    results.handlesActions = mockOnAction.mock.calls.length > 0;
  }
  
  return results;
};

// =============================================================================
// NAVIGATION COMPONENT HELPERS
// =============================================================================

/**
 * Test navigation component behavior
 */
export const testNavigationComponent = async (NavComponent, navProps) => {
  const mockOnNavigate = vi.fn();
  
  const { container } = render(
    <NavComponent 
      {...navProps}
      onNavigate={mockOnNavigate}
    />
  );
  
  const results = {
    rendersNavItems: false,
    handlesNavigation: false,
    highlightsActiveItem: false,
    supportsKeyboardNav: false
  };
  
  // Check nav items
  const navItems = container.querySelectorAll('[data-testid*="nav-item"], .nav-item, a');
  results.rendersNavItems = navItems.length > 0;
  
  if (navItems.length > 0) {
    // Test navigation
    await act(async () => {
      fireEvent.click(navItems[0]);
    });
    results.handlesNavigation = mockOnNavigate.mock.calls.length > 0;
    
    // Test active state
    const activeItem = container.querySelector('.active, [aria-current="page"]');
    results.highlightsActiveItem = !!activeItem;
    
    // Test keyboard navigation
    await act(async () => {
      fireEvent.keyDown(navItems[0], { key: 'ArrowRight' });
    });
    
    if (navItems[1]) {
      results.supportsKeyboardNav = document.activeElement === navItems[1];
    }
  }
  
  return results;
};

// =============================================================================
// SEARCH COMPONENT HELPERS
// =============================================================================

/**
 * Test search component functionality
 */
export const testSearchComponent = async (SearchComponent, searchProps) => {
  const mockOnSearch = vi.fn();
  const mockOnClear = vi.fn();
  
  const { container } = render(
    <SearchComponent 
      {...searchProps}
      onSearch={mockOnSearch}
      onClear={mockOnClear}
    />
  );
  
  const results = {
    hasSearchInput: false,
    handlesSearch: false,
    handlesDebouncing: false,
    handlesClear: false,
    showsSuggestions: false
  };
  
  // Check search input
  const searchInput = container.querySelector('input[type="search"], input[placeholder*="search" i]');
  results.hasSearchInput = !!searchInput;
  
  if (searchInput) {
    // Test search functionality
    await act(async () => {
      fireEvent.change(searchInput, { target: { value: 'test query' } });
    });
    
    // Wait for debouncing
    await new Promise(resolve => setTimeout(resolve, 500));
    results.handlesSearch = mockOnSearch.mock.calls.length > 0;
    results.handlesDebouncing = mockOnSearch.mock.calls.length === 1; // Should only be called once due to debouncing
    
    // Test clear functionality
    const clearButton = container.querySelector('[data-testid="clear"], .clear-button');
    if (clearButton) {
      await act(async () => {
        fireEvent.click(clearButton);
      });
      results.handlesClear = mockOnClear.mock.calls.length > 0;
    }
    
    // Test suggestions
    const suggestions = container.querySelector('[data-testid="suggestions"], .suggestions');
    results.showsSuggestions = !!suggestions;
  }
  
  return results;
};

// =============================================================================
// DATA TABLE HELPERS
// =============================================================================

/**
 * Test data table functionality
 */
export const testDataTable = async (TableComponent, tableProps) => {
  const mockOnSort = vi.fn();
  const mockOnFilter = vi.fn();
  const mockOnRowClick = vi.fn();
  
  const { container } = render(
    <TableComponent 
      {...tableProps}
      onSort={mockOnSort}
      onFilter={mockOnFilter}
      onRowClick={mockOnRowClick}
    />
  );
  
  const results = {
    rendersHeaders: false,
    rendersRows: false,
    handlesSorting: false,
    handlesFiltering: false,
    handlesRowSelection: false,
    supportsPagination: false
  };
  
  // Check table structure
  const headers = container.querySelectorAll('th, [data-testid*="header"]');
  const rows = container.querySelectorAll('tr:not(:first-child), [data-testid*="row"]');
  
  results.rendersHeaders = headers.length > 0;
  results.rendersRows = rows.length > 0;
  
  // Test sorting
  if (headers.length > 0) {
    const sortableHeader = Array.from(headers).find(h => 
      h.querySelector('[data-testid="sort"]') || h.classList.contains('sortable')
    );
    
    if (sortableHeader) {
      await act(async () => {
        fireEvent.click(sortableHeader);
      });
      results.handlesSorting = mockOnSort.mock.calls.length > 0;
    }
  }
  
  // Test row interaction
  if (rows.length > 0) {
    await act(async () => {
      fireEvent.click(rows[0]);
    });
    results.handlesRowSelection = mockOnRowClick.mock.calls.length > 0;
  }
  
  // Test pagination
  const paginationControls = container.querySelector('[data-testid="pagination"], .pagination');
  results.supportsPagination = !!paginationControls;
  
  return results;
};

// =============================================================================
// EXPORT ALL HELPERS
// =============================================================================

export default {
  // Form helpers
  testFormValidation,
  testMultiStepForm,
  
  // Modal helpers
  testModalBehavior,
  
  // List helpers
  testListComponent,
  testListPagination,
  
  // Card helpers
  testCardComponent,
  
  // Navigation helpers
  testNavigationComponent,
  
  // Search helpers
  testSearchComponent,
  
  // Table helpers
  testDataTable
};