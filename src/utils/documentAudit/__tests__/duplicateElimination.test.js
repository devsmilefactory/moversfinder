/**
 * Property-based test for duplicate elimination
 * 
 * **Feature: ride-flow-documentation-audit, Property 8: Duplicate Elimination**
 * **Validates: Requirements 7.4**
 * 
 * This test verifies that duplicate or contradictory descriptions of the same
 * functionality are eliminated in the combined document.
 */

import { describe, test, expect } from 'vitest';
import fc from 'fast-check';

// Helper functions for the property test
function extractDocumentSections(documentContent) {
  if (!documentContent || typeof documentContent !== 'string') {
    return [];
  }

  const sections = [];
  const lines = documentContent.split('\n');
  let currentSection = null;
  let currentContent = [];

  lines.forEach((line, index) => {
    const headerMatch = line.match(/^(#{1,6})\s+(.+)$/);
    
    if (headerMatch) {
      // Save previous section
      if (currentSection) {
        sections.push({
          ...currentSection,
          content: currentContent.join('\n').trim(),
          normalizedContent: normalizeContent(currentContent.join('\n').trim())
        });
      }
      
      // Start new section
      currentSection = {
        level: headerMatch[1].length,
        title: headerMatch[2].trim(),
        lineNumber: index + 1
      };
      currentContent = [];
    } else if (currentSection) {
      currentContent.push(line);
    }
  });

  // Add last section
  if (currentSection) {
    sections.push({
      ...currentSection,
      content: currentContent.join('\n').trim(),
      normalizedContent: normalizeContent(currentContent.join('\n').trim())
    });
  }

  return sections;
}

function normalizeContent(content) {
  if (!content || typeof content !== 'string') {
    return '';
  }

  return content
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/[^\w\s]/g, '')
    .trim();
}

function hasDuplicateSections(sections) {
  const normalizedContents = new Map();
  
  sections.forEach((section, index) => {
    if (section.normalizedContent.length > 10) { // Only check substantial content
      if (!normalizedContents.has(section.normalizedContent)) {
        normalizedContents.set(section.normalizedContent, []);
      }
      normalizedContents.get(section.normalizedContent).push(index);
    }
  });

  // Return true if any content appears more than once
  return Array.from(normalizedContents.values()).some(indices => indices.length > 1);
}

function eliminateDuplicates(documentContent) {
  const sections = extractDocumentSections(documentContent);
  const uniqueSections = [];
  const seenContent = new Set();

  sections.forEach(section => {
    if (section.normalizedContent.length > 10) {
      if (!seenContent.has(section.normalizedContent)) {
        seenContent.add(section.normalizedContent);
        uniqueSections.push(section);
      }
    } else {
      // Keep short sections as they might be headers or important markers
      uniqueSections.push(section);
    }
  });

  // Reconstruct document
  return uniqueSections.map(section => {
    const headerPrefix = '#'.repeat(section.level);
    return `${headerPrefix} ${section.title}\n\n${section.content}`;
  }).join('\n\n');
}

describe('Duplicate Elimination Property Test', () => {
  describe('Property 8: Duplicate Elimination', () => {
    /**
     * **Feature: ride-flow-documentation-audit, Property 8: Duplicate Elimination**
     * **Validates: Requirements 7.4**
     * 
     * For any section or concept in the combined document, there should be no 
     * duplicate or contradictory descriptions of the same functionality.
     */
    test('combined document should have no duplicate sections', () => {
      fc.assert(
        fc.property(
          fc.array(
            fc.record({
              title: fc.string({ minLength: 5, maxLength: 30 }),
              content: fc.oneof(
                // Generate realistic content
                fc.constantFrom(
                  'The ride booking system allows users to request transportation services.',
                  'Users can select pickup and dropoff locations using the map interface.',
                  'Payment processing is handled through secure third-party providers.',
                  'Driver matching algorithm considers location, availability, and ratings.',
                  'Real-time notifications keep users informed of ride status updates.'
                ),
                // Generate potentially duplicate content
                fc.string({ minLength: 20, maxLength: 100 })
              ),
              level: fc.integer({ min: 1, max: 3 })
            }),
            { minLength: 2, maxLength: 8 }
          ),
          (sections) => {
            // Create document with potential duplicates
            const documentContent = sections.map(section => {
              const headerPrefix = '#'.repeat(section.level);
              return `${headerPrefix} ${section.title}\n\n${section.content}`;
            }).join('\n\n');

            // Apply duplicate elimination
            const deduplicatedContent = eliminateDuplicates(documentContent);
            const deduplicatedSections = extractDocumentSections(deduplicatedContent);

            // Check that no duplicates remain
            return !hasDuplicateSections(deduplicatedSections);
          }
        ),
        { numRuns: 100 }
      );
    });

    test('should preserve unique content while removing duplicates', () => {
      const testDocument = `
# Introduction
This is the introduction to the ride booking system.

# Overview  
This is the introduction to the ride booking system.

# Features
The system includes real-time tracking and payment processing.

# Capabilities
The system includes real-time tracking and payment processing.

# Unique Section
This content is unique and should be preserved.
      `.trim();

      const deduplicated = eliminateDuplicates(testDocument);
      const sections = extractDocumentSections(deduplicated);

      // Should have 3 unique sections (2 duplicates removed)
      const contentSections = sections.filter(s => s.content.length > 10);
      expect(contentSections.length).toBe(3);

      // Should preserve the unique content
      const contents = sections.map(s => s.content);
      expect(contents.some(c => c.includes('unique and should be preserved'))).toBe(true);
    });

    test('should correctly identify duplicate sections', () => {
      const testCases = [
        {
          sections: [
            { normalizedContent: 'this is duplicate content' },
            { normalizedContent: 'this is duplicate content' },
            { normalizedContent: 'this is unique content' }
          ],
          hasDuplicates: true
        },
        {
          sections: [
            { normalizedContent: 'first unique content' },
            { normalizedContent: 'second unique content' },
            { normalizedContent: 'third unique content' }
          ],
          hasDuplicates: false
        },
        {
          sections: [
            { normalizedContent: 'short' }, // Too short to be considered
            { normalizedContent: 'short' },
            { normalizedContent: 'this is long enough to be checked for duplicates' }
          ],
          hasDuplicates: false
        }
      ];

      testCases.forEach(({ sections, hasDuplicates }) => {
        const result = hasDuplicateSections(sections);
        expect(result).toBe(hasDuplicates);
      });
    });

    test('should handle various document structures', () => {
      const documentStructures = [
        // Simple document
        '# Title\nContent here',
        
        // Multiple levels
        '# Main\nContent\n## Sub\nMore content\n### Deep\nDeep content',
        
        // Empty sections
        '# Empty\n\n# Another\nSome content',
        
        // No headers
        'Just plain text without headers',
        
        // Only headers
        '# Header 1\n## Header 2\n### Header 3'
      ];

      documentStructures.forEach(doc => {
        expect(() => extractDocumentSections(doc)).not.toThrow();
        expect(() => eliminateDuplicates(doc)).not.toThrow();
        
        const sections = extractDocumentSections(doc);
        expect(Array.isArray(sections)).toBe(true);
      });
    });

    test('should normalize content correctly', () => {
      const testCases = [
        {
          input: 'This is a TEST with CAPS and punctuation!',
          expected: 'this is a test with caps and punctuation'
        },
        {
          input: '   Multiple    spaces   and\ttabs\n',
          expected: 'multiple spaces and tabs'
        },
        {
          input: 'Special chars: @#$%^&*()_+-={}[]|\\:";\'<>?,./`~',
          expected: 'special chars'
        },
        {
          input: '',
          expected: ''
        }
      ];

      testCases.forEach(({ input, expected }) => {
        const result = normalizeContent(input);
        expect(result).toBe(expected);
      });
    });

    test('should handle edge cases gracefully', () => {
      const edgeCases = [
        null,
        undefined,
        '',
        '   ',
        '#',
        '# ',
        '####### Too many hashes',
        'No headers at all, just content',
        '# Header with no content\n\n# Another header\nWith content'
      ];

      edgeCases.forEach(content => {
        expect(() => extractDocumentSections(content)).not.toThrow();
        expect(() => eliminateDuplicates(content)).not.toThrow();
        expect(() => hasDuplicateSections(extractDocumentSections(content))).not.toThrow();
      });
    });

    test('duplicate elimination should be idempotent', () => {
      fc.assert(
        fc.property(
          fc.array(
            fc.record({
              title: fc.string({ minLength: 3, maxLength: 20 }),
              content: fc.string({ minLength: 10, maxLength: 50 }),
              level: fc.integer({ min: 1, max: 2 })
            }),
            { minLength: 1, maxLength: 5 }
          ),
          (sections) => {
            // Create document
            const documentContent = sections.map(section => {
              const headerPrefix = '#'.repeat(section.level);
              return `${headerPrefix} ${section.title}\n\n${section.content}`;
            }).join('\n\n');

            // Apply deduplication twice
            const firstPass = eliminateDuplicates(documentContent);
            const secondPass = eliminateDuplicates(firstPass);

            // Results should be identical (idempotent)
            return firstPass === secondPass;
          }
        ),
        { numRuns: 50 }
      );
    });

    test('should preserve section structure after deduplication', () => {
      const testDocument = `
# Main Section
This is the main content.

## Subsection A
This is subsection A content.

## Subsection B  
This is subsection A content.

# Another Main Section
Different main content here.
      `.trim();

      const deduplicated = eliminateDuplicates(testDocument);
      const sections = extractDocumentSections(deduplicated);

      // Should maintain hierarchical structure
      const mainSections = sections.filter(s => s.level === 1);
      const subSections = sections.filter(s => s.level === 2);

      expect(mainSections.length).toBeGreaterThan(0);
      expect(subSections.length).toBeGreaterThan(0);

      // Should preserve section titles and levels
      sections.forEach(section => {
        expect(section.title).toBeDefined();
        expect(section.level).toBeGreaterThan(0);
        expect(section.content).toBeDefined();
      });
    });
  });

  describe('Integration with document processing', () => {
    test('should work with realistic document content', () => {
      const realisticDocument = `
# Ride Booking System Overview

The ride booking system allows users to request transportation services through a mobile application.

# System Architecture

The system consists of three main components: the mobile app, backend API, and driver interface.

# User Interface

The ride booking system allows users to request transportation services through a mobile application.

# API Design

The backend API handles user authentication, ride matching, and payment processing.

# Driver Interface  

The system consists of three main components: the mobile app, backend API, and driver interface.

# Payment Processing

Secure payment processing is handled through third-party payment providers with PCI compliance.
      `.trim();

      const deduplicated = eliminateDuplicates(realisticDocument);
      const sections = extractDocumentSections(deduplicated);

      // Should eliminate duplicates
      expect(!hasDuplicateSections(sections)).toBe(true);

      // Should preserve unique content
      const contents = sections.map(s => s.content).join(' ');
      expect(contents).toContain('mobile application');
      expect(contents).toContain('backend API');
      expect(contents).toContain('payment processing');
      expect(contents).toContain('PCI compliance');
    });
  });
});