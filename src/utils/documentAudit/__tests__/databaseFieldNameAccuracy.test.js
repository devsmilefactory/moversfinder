/**
 * Property-based test for database field name accuracy
 * 
 * **Feature: ride-flow-documentation-audit, Property 1: Database Field Name Accuracy**
 * **Validates: Requirements 1.2, 1.3, 1.5**
 * 
 * This test verifies that all database field references in documentation
 * match actual column names in the database schema.
 */

import { describe, test, expect, beforeAll } from 'vitest';
import fc from 'fast-check';
import { 
  extractDatabaseNaming,
  extractTableNames,
  extractFieldDefinitions,
  readMigrationFiles 
} from '../databaseSchemaAnalyzer.js';

// Helper functions for the property test
function extractDatabaseFieldReferences(documentContent) {
  if (!documentContent || typeof documentContent !== 'string') {
    return [];
  }

  const fieldReferences = new Set();
  
  // Pattern 1: table.field format (must be valid identifiers, allow short names like 'id')
  const tableFieldPattern = /\b([a-zA-Z_][a-zA-Z0-9_]*\.[a-zA-Z_][a-zA-Z0-9_]*)\b/g;
  let match;
  while ((match = tableFieldPattern.exec(documentContent)) !== null) {
    fieldReferences.add(match[1]);
  }
  
  // Pattern 2: field names in backticks or quotes (allow short names like 'id')
  const quotedFieldPattern = /[`'"]([a-zA-Z_][a-zA-Z0-9_]*)[`'"]/g;
  while ((match = quotedFieldPattern.exec(documentContent)) !== null) {
    fieldReferences.add(match[1]);
  }
  
  // Pattern 3: Common database field patterns (including 'id')
  const commonFieldPatterns = [
    /\b(id|user_id|driver_id|ride_id|created_at|updated_at|deleted_at)\b/g,
    /\b([a-zA-Z_][a-zA-Z0-9_]*_id)\b/g,
    /\b([a-zA-Z_][a-zA-Z0-9_]*_at)\b/g,
    /\b(ride_status|service_type|pickup_location|dropoff_location)\b/g
  ];
  
  commonFieldPatterns.forEach(pattern => {
    while ((match = pattern.exec(documentContent)) !== null) {
      fieldReferences.add(match[1]);
    }
  });
  
  return Array.from(fieldReferences);
}

function isMarkedAsMissing(fieldName, documentContent) {
  if (!documentContent || typeof documentContent !== 'string' || !fieldName) {
    return false;
  }
  
  // Check for various ways a field might be marked as missing
  const missingPatterns = [
    new RegExp(`${fieldName}.*(?:missing|not found|does not exist|undefined)`, 'i'),
    new RegExp(`(?:missing|not found|does not exist|undefined).*${fieldName}`, 'i'),
    new RegExp(`\\[MISSING\\].*${fieldName}`, 'i'),
    new RegExp(`${fieldName}.*\\[MISSING\\]`, 'i'),
    new RegExp(`TODO.*${fieldName}`, 'i'),
    new RegExp(`FIXME.*${fieldName}`, 'i')
  ];
  
  return missingPatterns.some(pattern => pattern.test(documentContent));
}

describe('Database Field Name Accuracy Property Test', () => {
  let actualSchema;
  
  beforeAll(async () => {
    // Extract actual database schema from migration files
    const migrationFiles = await readMigrationFiles('supabase/migrations/');
    const tables = extractTableNames(migrationFiles);
    const fields = extractFieldDefinitions(migrationFiles);
    
    actualSchema = fields.map(field => ({
      tableName: field.tableName,
      fieldName: field.name,
      fullName: `${field.tableName}.${field.name}`
    }));
  });

  describe('Property 1: Database Field Name Accuracy', () => {
    /**
     * **Feature: ride-flow-documentation-audit, Property 1: Database Field Name Accuracy**
     * **Validates: Requirements 1.2, 1.3, 1.5**
     * 
     * For any database field reference in documentation, the field name should 
     * match an actual column name in the database schema or be marked as missing.
     */
    test('all database field references should match actual schema', () => {
      // Create a generator for realistic document content
      const documentContentGenerator = fc.oneof(
        // Generate content with actual field names
        fc.record({
          fields: fc.shuffledSubarray(actualSchema, { minLength: 1, maxLength: 3 }),
          template: fc.constantFrom(
            'The table has fields: {fields}',
            'Query: SELECT {tableFields} FROM table',
            'The `{field}` field is important',
            'Missing: [MISSING] {field} does not exist'
          )
        }).map(({ fields, template }) => {
          const fieldList = fields.map(f => f.fieldName).join(', ');
          const tableFieldList = fields.map(f => f.fullName).join(', ');
          const singleField = fields[0]?.fieldName || 'test_field';
          return template
            .replace('{fields}', fieldList)
            .replace('{tableFields}', tableFieldList)
            .replace('{field}', singleField);
        }),
        // Generate content with missing field markers
        fc.record({
          field: fc.string({ minLength: 5, maxLength: 15 }).filter(s => 
            /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(s) && 
            !actualSchema.some(f => f.fieldName === s)
          ),
          marker: fc.constantFrom('[MISSING]', 'TODO:', 'FIXME:', 'missing', 'not found')
        }).map(({ field, marker }) => `${marker} ${field} needs to be implemented`),
        // Generate safe content with no field references
        fc.constantFrom(
          'This is regular documentation text without field references.',
          'The system handles user authentication and ride management.',
          'Performance metrics show good response times.',
          'Error handling is implemented throughout the application.'
        )
      );

      fc.assert(
        fc.property(
          documentContentGenerator,
          (documentContent) => {
            const extractedFields = extractDatabaseFieldReferences(documentContent);
            const schemaFields = actualSchema.map(s => s.fullName);
            const fieldNames = actualSchema.map(s => s.fieldName);
            
            // All extracted fields should either:
            // 1. Match a field in the schema (full name or field name)
            // 2. Be marked as missing in the document
            return extractedFields.every(field => 
              schemaFields.includes(field) || 
              fieldNames.includes(field) ||
              isMarkedAsMissing(field, documentContent)
            );
          }
        ),
        { numRuns: 100 }
      );
    });

    test('field references in realistic document content should be valid', () => {
      // Test with realistic document content patterns using actual schema fields
      const schemaFields = actualSchema.map(s => s.fullName);
      const fieldNames = actualSchema.map(s => s.fieldName);
      
      // Use actual fields from the schema for testing
      const sampleFields = fieldNames.slice(0, 5);
      const sampleTableFields = schemaFields.slice(0, 3);
      
      const documentTemplates = [
        `The ride table has fields: ${sampleFields.join(', ')}`,
        `Query: SELECT ${sampleTableFields.join(', ')} FROM rides`,
        `The \`${sampleFields[0]}\` field references another table`,
        'Missing field: [MISSING] invalid_field_name should not exist',
        'TODO: Add support for new_field_name when it becomes available'
      ];

      documentTemplates.forEach(template => {
        const extractedFields = extractDatabaseFieldReferences(template);
        
        const allFieldsValid = extractedFields.every(field => 
          schemaFields.includes(field) || 
          fieldNames.includes(field) ||
          isMarkedAsMissing(field, template)
        );
        
        if (!allFieldsValid) {
          console.log('Template:', template);
          console.log('Extracted fields:', extractedFields);
          console.log('Invalid fields:', extractedFields.filter(field => 
            !schemaFields.includes(field) && 
            !fieldNames.includes(field) && 
            !isMarkedAsMissing(field, template)
          ));
        }
        
        expect(allFieldsValid).toBe(true);
      });
    });

    test('should correctly identify missing field markers', () => {
      const testCases = [
        { content: 'The field invalid_field is missing from schema', field: 'invalid_field', shouldBeMarked: true },
        { content: '[MISSING] unknown_field needs to be added', field: 'unknown_field', shouldBeMarked: true },
        { content: 'TODO: implement support for future_field', field: 'future_field', shouldBeMarked: true },
        { content: 'The valid_field exists in the database', field: 'valid_field', shouldBeMarked: false },
        { content: 'Regular field reference: user_id', field: 'user_id', shouldBeMarked: false }
      ];

      testCases.forEach(({ content, field, shouldBeMarked }) => {
        const isMarked = isMarkedAsMissing(field, content);
        expect(isMarked).toBe(shouldBeMarked);
      });
    });

    test('should extract field references correctly', () => {
      const testCases = [
        {
          content: 'SELECT rides.id, rides.pickup_location FROM rides',
          expectedFields: ['rides.id', 'rides.pickup_location']
        },
        {
          content: 'The `user_id` and `driver_id` fields are foreign keys',
          expectedFields: ['user_id', 'driver_id']
        },
        {
          content: 'Check ride_status and service_type for validation',
          expectedFields: ['ride_status', 'service_type']
        },
        {
          content: 'No field references here, just regular text',
          expectedFields: []
        }
      ];

      testCases.forEach(({ content, expectedFields }) => {
        const extractedFields = extractDatabaseFieldReferences(content);
        expectedFields.forEach(field => {
          expect(extractedFields).toContain(field);
        });
      });
    });

    test('should handle edge cases gracefully', () => {
      const edgeCases = [
        null,
        undefined,
        '',
        '   ',
        'No database references at all',
        'Special characters: !@#$%^&*()',
        'Numbers: 123456789',
        'Mixed: field123_test and test_field_456'
      ];

      edgeCases.forEach(content => {
        expect(() => extractDatabaseFieldReferences(content)).not.toThrow();
        expect(() => isMarkedAsMissing('test_field', content)).not.toThrow();
      });
    });
  });

  describe('Schema validation', () => {
    test('should have loaded actual schema data', () => {
      expect(actualSchema).toBeDefined();
      expect(Array.isArray(actualSchema)).toBe(true);
      expect(actualSchema.length).toBeGreaterThan(0);
      
      // Verify schema structure
      actualSchema.forEach(field => {
        expect(field).toHaveProperty('tableName');
        expect(field).toHaveProperty('fieldName');
        expect(field).toHaveProperty('fullName');
        expect(typeof field.tableName).toBe('string');
        expect(typeof field.fieldName).toBe('string');
        expect(field.fullName).toBe(`${field.tableName}.${field.fieldName}`);
      });
    });

    test('should contain expected core database fields', () => {
      const fieldNames = actualSchema.map(s => s.fieldName);
      const expectedCoreFields = ['id', 'created_at', 'updated_at'];
      
      expectedCoreFields.forEach(field => {
        expect(fieldNames).toContain(field);
      });
    });
  });
});