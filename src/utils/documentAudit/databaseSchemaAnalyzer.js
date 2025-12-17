/**
 * Database Schema Analyzer
 * Extracts actual database schema information from migration files
 * to build naming reference maps for documentation alignment
 */

import fs from 'fs/promises';
import path from 'path';

/**
 * Extract table names from migration files
 * @param {string[]} migrationFiles - Array of migration file contents
 * @returns {string[]} Array of table names
 */
export function extractTableNames(migrationFiles) {
  const tableNames = new Set();
  
  migrationFiles.forEach(content => {
    // Match CREATE TABLE statements
    const createTableRegex = /CREATE TABLE(?:\s+IF NOT EXISTS)?\s+([a-zA-Z_][a-zA-Z0-9_]*)/gi;
    let match;
    
    while ((match = createTableRegex.exec(content)) !== null) {
      tableNames.add(match[1]);
    }
  });
  
  return Array.from(tableNames).sort();
}

/**
 * Extract field definitions from migration files
 * @param {string[]} migrationFiles - Array of migration file contents
 * @returns {FieldDefinition[]} Array of field definitions
 */
export function extractFieldDefinitions(migrationFiles) {
  const fields = [];
  
  migrationFiles.forEach(content => {
    // Extract table creation blocks
    const tableBlocks = content.match(/CREATE TABLE(?:\s+IF NOT EXISTS)?\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*\(([\s\S]*?)\);/gi);
    
    if (tableBlocks) {
      tableBlocks.forEach(block => {
        const tableMatch = block.match(/CREATE TABLE(?:\s+IF NOT EXISTS)?\s+([a-zA-Z_][a-zA-Z0-9_]*)/i);
        if (!tableMatch) return;
        
        const tableName = tableMatch[1];
        const columnSection = block.match(/\(([\s\S]*)\)/)[1];
        
        // Parse individual column definitions
        const lines = columnSection.split('\n');
        
        lines.forEach(line => {
          const trimmedLine = line.trim();
          
          // Skip comments, constraints, and empty lines
          if (trimmedLine.startsWith('--') || 
              trimmedLine.startsWith('CONSTRAINT') ||
              trimmedLine.startsWith('CHECK') ||
              trimmedLine.startsWith('FOREIGN KEY') ||
              trimmedLine.startsWith('PRIMARY KEY') ||
              trimmedLine.startsWith('UNIQUE') ||
              trimmedLine.startsWith('INDEX') ||
              trimmedLine === '' ||
              trimmedLine === ',' ||
              trimmedLine === ')') {
            return;
          }
          
          // Match column definition pattern: column_name TYPE [constraints]
          const columnMatch = trimmedLine.match(/^([a-zA-Z_][a-zA-Z0-9_]*)\s+([A-Z][A-Z0-9_()]*(?:\s*\([^)]+\))?)/i);
          
          if (columnMatch) {
            const fieldName = columnMatch[1];
            const fieldType = columnMatch[2].split(/\s+/)[0]; // Get just the type, not constraints
            
            // Extract constraints
            const constraints = [];
            if (trimmedLine.includes('NOT NULL')) constraints.push('NOT NULL');
            if (trimmedLine.includes('PRIMARY KEY')) constraints.push('PRIMARY KEY');
            if (trimmedLine.includes('UNIQUE')) constraints.push('UNIQUE');
            if (trimmedLine.includes('DEFAULT')) {
              const defaultMatch = trimmedLine.match(/DEFAULT\s+([^,\s]+(?:\s+[^,\s]+)*)/i);
              if (defaultMatch) constraints.push(`DEFAULT ${defaultMatch[1]}`);
            }
            if (trimmedLine.includes('REFERENCES')) {
              const refMatch = trimmedLine.match(/REFERENCES\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*\(([^)]+)\)/i);
              if (refMatch) constraints.push(`REFERENCES ${refMatch[1]}(${refMatch[2]})`);
            }
            
            fields.push({
              name: fieldName,
              type: fieldType,
              constraints,
              tableName
            });
          }
        });
      });
    }
  });
  
  return fields.sort((a, b) => a.tableName.localeCompare(b.tableName) || a.name.localeCompare(b.name));
}

/**
 * Extract enum definitions from migration files
 * @param {string[]} migrationFiles - Array of migration file contents
 * @returns {EnumDefinition[]} Array of enum definitions
 */
export function extractEnumDefinitions(migrationFiles) {
  const enums = [];
  
  migrationFiles.forEach(content => {
    // Match CREATE TYPE enum statements
    const enumRegex = /CREATE TYPE\s+([a-zA-Z_][a-zA-Z0-9_]*)\s+AS\s+ENUM\s*\(\s*([^)]+)\s*\)/gi;
    let match;
    
    while ((match = enumRegex.exec(content)) !== null) {
      const enumName = match[1];
      const valuesString = match[2];
      
      // Parse enum values
      const values = valuesString
        .split(',')
        .map(v => v.trim().replace(/^'|'$/g, '')) // Remove quotes
        .filter(v => v.length > 0);
      
      enums.push({
        name: enumName,
        values,
        source: 'enum_definition'
      });
    }
    
    // Also extract CHECK constraints that define enum-like values
    const checkConstraints = content.match(/CHECK\s*\(\s*[a-zA-Z_][a-zA-Z0-9_]*\s+IN\s*\([^)]+\)\s*\)/gi);
    
    if (checkConstraints) {
      checkConstraints.forEach(constraint => {
        const match = constraint.match(/CHECK\s*\(\s*([a-zA-Z_][a-zA-Z0-9_]*)\s+IN\s*\(([^)]+)\)\s*\)/i);
        if (match) {
          const fieldName = match[1];
          const valuesString = match[2];
          
          const values = valuesString
            .split(',')
            .map(v => v.trim().replace(/^'|'$/g, ''))
            .filter(v => v.length > 0);
          
          enums.push({
            name: `${fieldName}_check_values`,
            values,
            source: 'check_constraint',
            fieldName
          });
        }
      });
    }
  });
  
  return enums.sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * Extract relationship definitions from migration files
 * @param {string[]} migrationFiles - Array of migration file contents
 * @returns {RelationshipDefinition[]} Array of relationship definitions
 */
export function extractRelationships(migrationFiles) {
  const relationships = [];
  
  migrationFiles.forEach(content => {
    // Match REFERENCES clauses
    const referenceRegex = /([a-zA-Z_][a-zA-Z0-9_]*)\s+[A-Z][A-Z0-9_]*\s+REFERENCES\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*\(([^)]+)\)/gi;
    let match;
    
    while ((match = referenceRegex.exec(content)) !== null) {
      const sourceField = match[1];
      const targetTable = match[2];
      const targetField = match[3];
      
      // Find the table this field belongs to by looking at the context
      const beforeMatch = content.substring(0, match.index);
      const tableMatch = beforeMatch.match(/CREATE TABLE(?:\s+IF NOT EXISTS)?\s+([a-zA-Z_][a-zA-Z0-9_]*)[^;]*$/i);
      
      if (tableMatch) {
        const sourceTable = tableMatch[1];
        
        relationships.push({
          sourceTable,
          sourceField,
          targetTable,
          targetField,
          type: 'foreign_key'
        });
      }
    }
  });
  
  return relationships.sort((a, b) => 
    a.sourceTable.localeCompare(b.sourceTable) || 
    a.sourceField.localeCompare(b.sourceField)
  );
}

/**
 * Read migration files from the supabase directory
 * @param {string} migrationsPath - Path to migrations directory
 * @returns {Promise<string[]>} Array of migration file contents
 */
export async function readMigrationFiles(migrationsPath = 'supabase/migrations/') {
  try {
    const files = await fs.readdir(migrationsPath);
    const sqlFiles = files.filter(file => file.endsWith('.sql')).sort();
    
    const migrationContents = await Promise.all(
      sqlFiles.map(async (file) => {
        const filePath = path.join(migrationsPath, file);
        return await fs.readFile(filePath, 'utf-8');
      })
    );
    
    return migrationContents;
  } catch (error) {
    console.error('Error reading migration files:', error);
    return [];
  }
}

/**
 * Build comprehensive database naming map
 * @param {Object} schemaAnalysis - Analysis results from extraction functions
 * @returns {Object} Database naming reference map
 */
export function buildDatabaseNamingMap(schemaAnalysis) {
  const { tables, fields, enums, relationships } = schemaAnalysis;
  
  // Build field mapping
  const fieldMap = {};
  fields.forEach(field => {
    const key = `${field.tableName}.${field.name}`;
    fieldMap[field.name] = {
      actualName: field.name,
      tableName: field.tableName,
      dataType: field.type,
      constraints: field.constraints,
      source: 'migration'
    };
    
    // Also add fully qualified name
    fieldMap[key] = {
      actualName: field.name,
      tableName: field.tableName,
      dataType: field.type,
      constraints: field.constraints,
      source: 'migration'
    };
  });
  
  // Build enum mapping
  const enumMap = {};
  enums.forEach(enumDef => {
    enumMap[enumDef.name] = {
      actualName: enumDef.name,
      values: enumDef.values,
      source: enumDef.source,
      fieldName: enumDef.fieldName
    };
    
    // Also map individual enum values
    enumDef.values.forEach(value => {
      enumMap[value] = {
        actualValue: value,
        enumName: enumDef.name,
        source: enumDef.source
      };
    });
  });
  
  // Build relationship mapping
  const relationshipMap = {};
  relationships.forEach(rel => {
    const key = `${rel.sourceTable}.${rel.sourceField}`;
    relationshipMap[key] = {
      sourceTable: rel.sourceTable,
      sourceField: rel.sourceField,
      targetTable: rel.targetTable,
      targetField: rel.targetField,
      type: rel.type
    };
  });
  
  return {
    tables: tables.reduce((acc, table) => {
      acc[table] = {
        actualName: table,
        source: 'migration'
      };
      return acc;
    }, {}),
    fields: fieldMap,
    enums: enumMap,
    relationships: relationshipMap,
    metadata: {
      totalTables: tables.length,
      totalFields: fields.length,
      totalEnums: enums.length,
      totalRelationships: relationships.length,
      extractedAt: new Date().toISOString()
    }
  };
}

/**
 * Main function to extract all database naming information
 * @param {string} migrationsPath - Path to migrations directory
 * @returns {Promise<Object>} Complete database naming reference map
 */
export async function extractDatabaseNaming(migrationsPath = 'supabase/migrations/') {
  const migrationFiles = await readMigrationFiles(migrationsPath);
  
  const schemaAnalysis = {
    tables: extractTableNames(migrationFiles),
    fields: extractFieldDefinitions(migrationFiles),
    enums: extractEnumDefinitions(migrationFiles),
    relationships: extractRelationships(migrationFiles)
  };
  
  return buildDatabaseNamingMap(schemaAnalysis);
}