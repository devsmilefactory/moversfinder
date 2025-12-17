import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { renderHook, act } from '@testing-library/react';
import React from 'react';
import fc from 'fast-check';

// Import performance testing utilities
import { 
  measureRenderTime, 
  countReRenders, 
  testMemoryUsage,
  measureComponentPerformance,
  detectPerformanceIssues
} from '../testHelpers';

/**
 * Performance Testing and Optimization
 * 
 * Tests for component performance, render optimization, and memory usage
 * **Validates: Requirements 4.1, 4.2, 4.3, 4.4**
 */

describe('Performance Testing and Optimization', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Mock performance API if not available
    if (!global.performance) {
      global.performance = {
        now: vi.fn(() => Date.now()),
        mark: vi.fn(),
        measure: vi.fn(),
        getEntriesByType: vi.fn(() => []),
        memory: {
          usedJSHeapSize: 1000000,
          totalJSHeapSize: 2000000,
          jsHeapSizeLimit: 4000000
        }
      };
    }
  });

  afterEach(() => {
    cleanup();
  });

  describe('Component Render Performance', () => {
    it('should render components within acceptable time limits', () => {
      fc.assert(
        fc.property(
          fc.record({
            componentComplexity: fc.constantFrom('simple', 'medium', 'complex'),
            propsCount: fc.integer({ min: 0, max: 20 }),
            childrenCount: fc.integer({ min: 0, max: 10 }),
            hasState: fc.boolean(),
            hasEffects: fc.boolean()
          }),
          async (testData) => {
            // Create component based on complexity
            const TestComponent = ({ props, children }) => {
              const [state, setState] = React.useState(testData.hasState ? 'initial' : null);
              
              React.useEffect(() => {
                if (testData.hasEffects) {
                  // Simulate some effect work
                  const timer = setTimeout(() => setState('updated'), 1);
                  return () => clearTimeout(timer);
                }
              }, []);

              // Render complexity based on test data
              const renderComplexContent = () => {
                switch (testData.componentComplexity) {
                  case 'simple':
                    return <div data-testid="simple-content">Simple content</div>;
                  
                  case 'medium':
                    return (
                      <div data-testid="medium-content">
                        {Array.from({ length: 10 }, (_, i) => (
                          <div key={i}>Item {i}</div>
                        ))}
                      </div>
                    );
                  
                  case 'complex':
                    return (
                      <div data-testid="complex-content">
                        {Array.from({ length: 50 }, (_, i) => (
                          <div key={i} style={{ padding: '2px', margin: '1px' }}>
                            <span>Complex item {i}</span>
                            <button onClick={() => setState(`clicked-${i}`)}>
                              Click {i}
                            </button>
                          </div>
                        ))}
                      </div>
                    );
                  
                  default:
                    return <div>Default content</div>;
                }
              };

              return (
                <div data-testid="test-component">
                  {renderComplexContent()}
                  {children}
                  {state && <div data-testid="state-display">{state}</div>}
                </div>
              );
            };

            // Measure render performance
            const { renderTime, result } = await measureRenderTime(async () => {
              return render(
                <TestComponent>
                  {Array.from({ length: testData.childrenCount }, (_, i) => (
                    <div key={i}>Child {i}</div>
                  ))}
                </TestComponent>
              );
            });

            // Performance thresholds based on complexity
            const thresholds = {
              simple: 50,   // 50ms for simple components
              medium: 100,  // 100ms for medium complexity
              complex: 200  // 200ms for complex components
            };

            const threshold = thresholds[testData.componentComplexity] || 100;

            // Component should render within acceptable time
            expect(renderTime).toBeLessThan(threshold);
            
            // Component should actually render
            expect(result.container).toBeInTheDocument();
            expect(result.getByTestId('test-component')).toBeInTheDocument();
          }
        ),
        { numRuns: 10 }
      );
    });

    it('should minimize unnecessary re-renders', () => {
      fc.assert(
        fc.property(
          fc.record({
            propUpdates: fc.integer({ min: 1, max: 10 }),
            stateUpdates: fc.integer({ min: 1, max: 10 }),
            shouldMemoize: fc.boolean(),
            hasExpensiveCalculation: fc.boolean()
          }),
          (testData) => {
            let expensiveCalculationCount = 0;
            
            const TestComponent = React.memo(({ value, onUpdate }) => {
              const [internalState, setInternalState] = React.useState(0);
              
              // Expensive calculation that we want to minimize
              const expensiveValue = React.useMemo(() => {
                if (testData.hasExpensiveCalculation) {
                  expensiveCalculationCount++;
                  // Simulate expensive calculation
                  let result = 0;
                  for (let i = 0; i < 1000; i++) {
                    result += Math.random();
                  }
                  return result + value;
                }
                return value;
              }, [value]);

              return (
                <div data-testid="memoized-component">
                  <div data-testid="value-display">{expensiveValue}</div>
                  <div data-testid="state-display">{internalState}</div>
                  <button 
                    data-testid="update-state"
                    onClick={() => setInternalState(prev => prev + 1)}
                  >
                    Update State
                  </button>
                  <button 
                    data-testid="update-prop"
                    onClick={() => onUpdate(value + 1)}
                  >
                    Update Prop
                  </button>
                </div>
              );
            });

            const ParentComponent = () => {
              const [propValue, setPropValue] = React.useState(1);
              
              return (
                <TestComponent 
                  value={propValue} 
                  onUpdate={setPropValue}
                />
              );
            };

            const { renderCount, getRenderCount, rerender } = countReRenders(ParentComponent);
            
            // Initial render
            expect(getRenderCount()).toBe(1);
            
            // Simulate prop updates
            for (let i = 0; i < testData.propUpdates; i++) {
              rerender();
            }
            
            // Check render count after prop updates
            const finalRenderCount = getRenderCount();
            
            if (testData.shouldMemoize && testData.hasExpensiveCalculation) {
              // With memoization, expensive calculation should be minimized
              expect(expensiveCalculationCount).toBeLessThanOrEqual(testData.propUpdates + 1);
            }
            
            // Total renders should not exceed updates + initial render significantly
            expect(finalRenderCount).toBeLessThanOrEqual(testData.propUpdates + 2);
          }
        ),
        { numRuns: 8 }
      );
    });
  });

  describe('Memory Usage Optimization', () => {
    it('should not cause memory leaks during component lifecycle', () => {
      fc.assert(
        fc.property(
          fc.record({
            componentCount: fc.integer({ min: 1, max: 20 }),
            hasEventListeners: fc.boolean(),
            hasTimers: fc.boolean(),
            hasSubscriptions: fc.boolean(),
            mountUnmountCycles: fc.integer({ min: 1, max: 5 })
          }),
          async (testData) => {
            const cleanupFunctions = [];
            
            const TestComponent = ({ id }) => {
              React.useEffect(() => {
                const cleanup = [];
                
                if (testData.hasEventListeners) {
                  const handler = () => {};
                  window.addEventListener('resize', handler);
                  cleanup.push(() => window.removeEventListener('resize', handler));
                }
                
                if (testData.hasTimers) {
                  const timer = setInterval(() => {}, 1000);
                  cleanup.push(() => clearInterval(timer));
                }
                
                if (testData.hasSubscriptions) {
                  // Mock subscription
                  const subscription = { unsubscribe: vi.fn() };
                  cleanup.push(() => subscription.unsubscribe());
                }
                
                return () => {
                  cleanup.forEach(fn => fn());
                };
              }, []);
              
              return <div data-testid={`component-${id}`}>Component {id}</div>;
            };

            const ComponentContainer = ({ components }) => (
              <div>
                {components.map(id => (
                  <TestComponent key={id} id={id} />
                ))}
              </div>
            );

            // Measure memory usage through mount/unmount cycles
            const memoryResults = await testMemoryUsage(async () => {
              for (let cycle = 0; cycle < testData.mountUnmountCycles; cycle++) {
                const components = Array.from({ length: testData.componentCount }, (_, i) => i);
                
                const { unmount } = render(<ComponentContainer components={components} />);
                
                // Let components mount and run effects
                await new Promise(resolve => setTimeout(resolve, 10));
                
                // Unmount to test cleanup
                unmount();
                
                // Allow cleanup to complete
                await new Promise(resolve => setTimeout(resolve, 10));
              }
            }, testData.mountUnmountCycles * testData.componentCount);

            // Memory delta should be reasonable (not growing indefinitely)
            const memoryGrowthPerComponent = memoryResults.memoryDelta / (testData.componentCount * testData.mountUnmountCycles);
            
            // Should not leak more than 1KB per component cycle
            expect(memoryGrowthPerComponent).toBeLessThan(1024);
          }
        ),
        { numRuns: 5 }
      );
    });

    it('should handle large datasets efficiently', () => {
      fc.assert(
        fc.property(
          fc.record({
            dataSize: fc.integer({ min: 100, max: 1000 }),
            useVirtualization: fc.boolean(),
            useMemoization: fc.boolean(),
            itemComplexity: fc.constantFrom('simple', 'medium', 'complex')
          }),
          async (testData) => {
            // Generate test data
            const testItems = Array.from({ length: testData.dataSize }, (_, i) => ({
              id: i,
              name: `Item ${i}`,
              description: testData.itemComplexity === 'complex' ? 
                `Complex description for item ${i} with lots of text and details` : 
                `Description ${i}`,
              value: Math.random() * 1000,
              category: ['A', 'B', 'C'][i % 3]
            }));

            const ListItem = React.memo(({ item }) => {
              const processedValue = testData.useMemoization ? 
                React.useMemo(() => item.value * 2, [item.value]) :
                item.value * 2;

              return (
                <div data-testid={`item-${item.id}`} style={{ padding: '4px', border: '1px solid #ccc' }}>
                  <h4>{item.name}</h4>
                  {testData.itemComplexity !== 'simple' && (
                    <p>{item.description}</p>
                  )}
                  <span>Value: {processedValue}</span>
                  {testData.itemComplexity === 'complex' && (
                    <div>
                      <button onClick={() => {}}>Action 1</button>
                      <button onClick={() => {}}>Action 2</button>
                    </div>
                  )}
                </div>
              );
            });

            const LargeList = ({ items }) => {
              if (testData.useVirtualization && items.length > 50) {
                // Simulate virtualization by only rendering visible items
                const visibleItems = items.slice(0, 20); // Simulate viewport
                return (
                  <div data-testid="virtualized-list">
                    {visibleItems.map(item => (
                      <ListItem key={item.id} item={item} />
                    ))}
                    <div data-testid="virtual-spacer" style={{ height: `${(items.length - 20) * 60}px` }} />
                  </div>
                );
              }

              return (
                <div data-testid="full-list">
                  {items.map(item => (
                    <ListItem key={item.id} item={item} />
                  ))}
                </div>
              );
            };

            // Measure render performance for large dataset
            const { renderTime, result } = await measureRenderTime(async () => {
              return render(<LargeList items={testItems} />);
            });

            // Performance expectations based on configuration
            let expectedMaxTime = 1000; // Base expectation
            
            if (testData.useVirtualization && testData.dataSize > 50) {
              expectedMaxTime = 200; // Virtualization should be much faster
            } else if (testData.useMemoization) {
              expectedMaxTime = 800; // Memoization helps
            }
            
            if (testData.itemComplexity === 'complex') {
              expectedMaxTime *= 1.5; // Complex items take longer
            }

            expect(renderTime).toBeLessThan(expectedMaxTime);
            
            // Verify correct rendering approach was used
            if (testData.useVirtualization && testData.dataSize > 50) {
              expect(result.queryByTestId('virtualized-list')).toBeInTheDocument();
              expect(result.queryByTestId('virtual-spacer')).toBeInTheDocument();
            } else {
              expect(result.queryByTestId('full-list')).toBeInTheDocument();
            }
          }
        ),
        { numRuns: 6 }
      );
    });
  });

  describe('Bundle Size and Code Splitting', () => {
    it('should load components efficiently with code splitting', async () => {
      // Simulate dynamic import performance
      const mockDynamicImport = vi.fn().mockImplementation((path) => {
        const loadTime = Math.random() * 100 + 50; // 50-150ms load time
        return new Promise(resolve => {
          setTimeout(() => {
            resolve({
              default: () => React.createElement('div', { 'data-testid': 'lazy-component' }, 'Lazy loaded')
            });
          }, loadTime);
        });
      });

      const LazyComponent = React.lazy(() => mockDynamicImport('./LazyComponent'));

      const App = () => (
        <React.Suspense fallback={<div data-testid="loading">Loading...</div>}>
          <LazyComponent />
        </React.Suspense>
      );

      const startTime = performance.now();
      const { getByTestId } = render(<App />);

      // Should show loading initially
      expect(getByTestId('loading')).toBeInTheDocument();

      // Wait for lazy component to load
      await waitFor(() => {
        expect(getByTestId('lazy-component')).toBeInTheDocument();
      });

      const loadTime = performance.now() - startTime;

      // Should load within reasonable time
      expect(loadTime).toBeLessThan(500);
      expect(mockDynamicImport).toHaveBeenCalledTimes(1);
    });
  });

  describe('Performance Monitoring and Alerts', () => {
    it('should detect performance issues and provide recommendations', () => {
      fc.assert(
        fc.property(
          fc.record({
            renderTime: fc.float({ min: 10, max: 500 }),
            reRenderCount: fc.integer({ min: 1, max: 20 }),
            memoryUsage: fc.integer({ min: 1000000, max: 100000000 }), // 1MB to 100MB
            componentSize: fc.integer({ min: 10, max: 1000 }) // lines of code
          }),
          (testData) => {
            const performanceMetrics = {
              renderTime: testData.renderTime,
              reRenderCount: testData.reRenderCount,
              memoryUsage: testData.memoryUsage,
              componentSize: testData.componentSize
            };

            const issues = detectPerformanceIssues(performanceMetrics);

            // Should return an array of issues
            expect(Array.isArray(issues)).toBe(true);

            // Check for specific performance issues
            if (testData.renderTime > 100) {
              expect(issues.some(issue => issue.type === 'slow_render')).toBe(true);
            }

            if (testData.reRenderCount > 10) {
              expect(issues.some(issue => issue.type === 'excessive_rerenders')).toBe(true);
            }

            if (testData.memoryUsage > 50000000) { // 50MB
              expect(issues.some(issue => issue.type === 'high_memory_usage')).toBe(true);
            }

            if (testData.componentSize > 500) {
              expect(issues.some(issue => issue.type === 'large_component')).toBe(true);
            }

            // Each issue should have required properties
            issues.forEach(issue => {
              expect(issue).toHaveProperty('type');
              expect(issue).toHaveProperty('severity');
              expect(issue).toHaveProperty('message');
              expect(issue).toHaveProperty('recommendation');
              expect(['low', 'medium', 'high', 'critical']).toContain(issue.severity);
            });
          }
        ),
        { numRuns: 15 }
      );
    });
  });

  describe('Real-world Performance Scenarios', () => {
    it('should handle complex user interactions efficiently', async () => {
      const ComplexInteractiveComponent = () => {
        const [items, setItems] = React.useState([]);
        const [filter, setFilter] = React.useState('');
        const [sortBy, setSortBy] = React.useState('name');
        const [loading, setLoading] = React.useState(false);

        const filteredAndSortedItems = React.useMemo(() => {
          let result = items.filter(item => 
            item.name.toLowerCase().includes(filter.toLowerCase())
          );
          
          result.sort((a, b) => {
            if (sortBy === 'name') return a.name.localeCompare(b.name);
            if (sortBy === 'value') return a.value - b.value;
            return 0;
          });
          
          return result;
        }, [items, filter, sortBy]);

        const addItems = React.useCallback(async () => {
          setLoading(true);
          // Simulate async operation
          await new Promise(resolve => setTimeout(resolve, 50));
          
          const newItems = Array.from({ length: 100 }, (_, i) => ({
            id: items.length + i,
            name: `Item ${items.length + i}`,
            value: Math.random() * 1000
          }));
          
          setItems(prev => [...prev, ...newItems]);
          setLoading(false);
        }, [items.length]);

        return (
          <div data-testid="complex-component">
            <div>
              <input
                data-testid="filter-input"
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                placeholder="Filter items..."
              />
              <select
                data-testid="sort-select"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
              >
                <option value="name">Sort by Name</option>
                <option value="value">Sort by Value</option>
              </select>
              <button
                data-testid="add-items"
                onClick={addItems}
                disabled={loading}
              >
                {loading ? 'Adding...' : 'Add Items'}
              </button>
            </div>
            
            <div data-testid="items-list">
              {filteredAndSortedItems.map(item => (
                <div key={item.id} data-testid={`item-${item.id}`}>
                  {item.name} - {item.value.toFixed(2)}
                </div>
              ))}
            </div>
            
            <div data-testid="items-count">
              Showing {filteredAndSortedItems.length} of {items.length} items
            </div>
          </div>
        );
      };

      const { getByTestId } = render(<ComplexInteractiveComponent />);

      // Measure performance of adding items
      const addStartTime = performance.now();
      fireEvent.click(getByTestId('add-items'));
      
      await waitFor(() => {
        expect(getByTestId('items-count')).toHaveTextContent('Showing 100 of 100 items');
      });
      
      const addEndTime = performance.now();
      const addItemsTime = addEndTime - addStartTime;

      // Should add items efficiently
      expect(addItemsTime).toBeLessThan(200);

      // Measure performance of filtering
      const filterStartTime = performance.now();
      fireEvent.change(getByTestId('filter-input'), { target: { value: 'Item 1' } });
      
      await waitFor(() => {
        const countText = getByTestId('items-count').textContent;
        expect(countText).toMatch(/Showing \d+ of 100 items/);
      });
      
      const filterEndTime = performance.now();
      const filterTime = filterEndTime - filterStartTime;

      // Filtering should be fast
      expect(filterTime).toBeLessThan(50);

      // Measure performance of sorting
      const sortStartTime = performance.now();
      fireEvent.change(getByTestId('sort-select'), { target: { value: 'value' } });
      
      // Allow sort to complete
      await new Promise(resolve => setTimeout(resolve, 10));
      
      const sortEndTime = performance.now();
      const sortTime = sortEndTime - sortStartTime;

      // Sorting should be fast
      expect(sortTime).toBeLessThan(50);
    });
  });
});

// Helper function to detect performance issues
function detectPerformanceIssues(metrics) {
  const issues = [];

  if (metrics.renderTime > 100) {
    issues.push({
      type: 'slow_render',
      severity: metrics.renderTime > 200 ? 'high' : 'medium',
      message: `Component render time is ${metrics.renderTime.toFixed(2)}ms`,
      recommendation: 'Consider using React.memo, useMemo, or useCallback to optimize rendering'
    });
  }

  if (metrics.reRenderCount > 10) {
    issues.push({
      type: 'excessive_rerenders',
      severity: metrics.reRenderCount > 15 ? 'high' : 'medium',
      message: `Component re-rendered ${metrics.reRenderCount} times`,
      recommendation: 'Check for unnecessary prop changes or missing dependencies in useEffect'
    });
  }

  if (metrics.memoryUsage > 50000000) { // 50MB
    issues.push({
      type: 'high_memory_usage',
      severity: metrics.memoryUsage > 100000000 ? 'critical' : 'high',
      message: `High memory usage: ${(metrics.memoryUsage / 1000000).toFixed(2)}MB`,
      recommendation: 'Check for memory leaks, large objects, or missing cleanup in useEffect'
    });
  }

  if (metrics.componentSize > 500) {
    issues.push({
      type: 'large_component',
      severity: metrics.componentSize > 800 ? 'high' : 'medium',
      message: `Component is ${metrics.componentSize} lines long`,
      recommendation: 'Consider breaking down into smaller, focused components'
    });
  }

  return issues;
}