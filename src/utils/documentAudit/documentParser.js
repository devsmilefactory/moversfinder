/**
 * Document Parser
 * Parses and extracts content from analysis document versions
 * for consolidation and naming alignment
 */

import fs from 'fs/promises';
import path from 'path';

/**
 * Parse source analysis documents
 * @param {string[]} documentPaths - Array of document file paths
 * @returns {Promise<AnalysisDocument[]>} Array of parsed analysis documents
 */
export async function parseSourceDocuments(documentPaths = [
  'COMPREHENSIVE_RIDE_FLOW_ANALYSIS.md',
  'COMPREHENSIVE_RIDE_FLOW_ANALYSIS_CORRECTED.md', 
  'UPDATED_COMPREHENSIVE_RIDE_FLOW_ANALYSIS.md',
  'GAP_ANALYSIS_IMPLEMENTATION_PATCHES.md'
]) {
  const documents = [];
  
  for (const docPath of documentPaths) {
    try {
      const content = await fs.readFile(docPath, 'utf-8');
      const parsedDoc = parseDocumentContent(content, docPath);
      documents.push(parsedDoc);
    } catch (error) {
      console.warn(`Warning: Could not read document ${docPath}:`, error.message);
      // Add placeholder for missing document
      documents.push({
        filePath: docPath,
        content: '',
        sections: [],
        metadata: {
          exists: false,
          error: error.message,
          parsedAt: new Date().toISOString()
        }
      });
    }
  }
  
  return documents;
}

/**
 * Parse document content into structured sections
 * @param {string} content - Document content
 * @param {string} filePath - Document file path
 * @returns {AnalysisDocument} Parsed document structure
 */
function parseDocumentContent(content, filePath) {
  const sections = parseDocumentSections(content);
  const metadata = extractDocumentMetadata(content, filePath);
  
  return {
    filePath,
    content,
    sections,
    metadata
  };
}

/**
 * Parse document into sections based on markdown headers
 * @param {string} content - Document content
 * @returns {DocumentSection[]} Array of document sections
 */
export function parseDocumentSections(content) {
  if (!content || typeof content !== 'string') {
    return [];
  }
  
  const sections = [];
  const lines = content.split('\n');
  let currentSection = null;
  let currentContent = [];
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const headerMatch = line.match(/^(#{1,6})\s+(.+)$/);
    
    if (headerMatch) {
      // Save previous section if exists
      if (currentSection) {
        currentSection.content = currentContent.join('\n').trim();
        currentSection.lineEnd = i - 1;
        sections.push(currentSection);
      }
      
      // Start new section
      const level = headerMatch[1].length;
      const title = headerMatch[2].trim();
      
      currentSection = {
        level,
        title,
        content: '',
        lineStart: i,
        lineEnd: -1,
        type: categorizeSection(title, level),
        subsections: []
      };
      currentContent = [];
    } else if (currentSection) {
      currentContent.push(line);
    } else {
      // Content before first header
      if (!sections.length) {
        sections.push({
          level: 0,
          title: 'Preamble',
          content: line,
          lineStart: 0,
          lineEnd: -1,
          type: 'preamble',
          subsections: []
        });
      } else {
        sections[0].content += '\n' + line;
      }
    }
  }
  
  // Save last section
  if (currentSection) {
    currentSection.content = currentContent.join('\n').trim();
    currentSection.lineEnd = lines.length - 1;
    sections.push(currentSection);
  }
  
  // Build section hierarchy
  return buildSectionHierarchy(sections);
}

/**
 * Categorize section based on title and level
 * @param {string} title - Section title
 * @param {number} level - Header level
 * @returns {string} Section type
 */
function categorizeSection(title, level) {
  const titleLower = title.toLowerCase();
  
  // Flow logic sections
  if (titleLower.includes('flow') || 
      titleLower.includes('process') || 
      titleLower.includes('workflow') ||
      titleLower.includes('sequence') ||
      titleLower.includes('lifecycle')) {
    return 'flow_logic';
  }
  
  // Database reference sections
  if (titleLower.includes('database') || 
      titleLower.includes('schema') || 
      titleLower.includes('table') ||
      titleLower.includes('field') ||
      titleLower.includes('migration')) {
    return 'database_reference';
  }
  
  // Component reference sections
  if (titleLower.includes('component') || 
      titleLower.includes('ui') || 
      titleLower.includes('interface') ||
      titleLower.includes('modal') ||
      titleLower.includes('form')) {
    return 'component_reference';
  }
  
  // API reference sections
  if (titleLower.includes('api') || 
      titleLower.includes('endpoint') || 
      titleLower.includes('rpc') ||
      titleLower.includes('function') ||
      titleLower.includes('service')) {
    return 'api_reference';
  }
  
  // Status reference sections
  if (titleLower.includes('status') || 
      titleLower.includes('state') || 
      titleLower.includes('enum') ||
      titleLower.includes('constant')) {
    return 'status_reference';
  }
  
  // Configuration sections
  if (titleLower.includes('config') || 
      titleLower.includes('setting') || 
      titleLower.includes('option') ||
      titleLower.includes('parameter')) {
    return 'configuration_reference';
  }
  
  // Gap analysis sections
  if (titleLower.includes('gap') || 
      titleLower.includes('missing') || 
      titleLower.includes('todo') ||
      titleLower.includes('implementation')) {
    return 'gap_analysis';
  }
  
  // Overview/summary sections
  if (titleLower.includes('overview') || 
      titleLower.includes('summary') || 
      titleLower.includes('introduction') ||
      titleLower.includes('conclusion')) {
    return 'overview';
  }
  
  // Default based on level
  if (level === 1) return 'main_section';
  if (level === 2) return 'subsection';
  return 'detail_section';
}

/**
 * Build hierarchical section structure
 * @param {DocumentSection[]} flatSections - Flat array of sections
 * @returns {DocumentSection[]} Hierarchical section structure
 */
function buildSectionHierarchy(flatSections) {
  const hierarchy = [];
  const stack = [];
  
  for (const section of flatSections) {
    // Pop sections from stack that are at same or higher level
    while (stack.length > 0 && stack[stack.length - 1].level >= section.level) {
      stack.pop();
    }
    
    if (stack.length === 0) {
      // Top level section
      hierarchy.push(section);
    } else {
      // Add as subsection to parent
      const parent = stack[stack.length - 1];
      parent.subsections.push(section);
    }
    
    stack.push(section);
  }
  
  return hierarchy;
}

/**
 * Extract document metadata
 * @param {string} content - Document content
 * @param {string} filePath - Document file path
 * @returns {Object} Document metadata
 */
export function extractDocumentMetadata(content, filePath) {
  const fileName = path.basename(filePath);
  const stats = {
    lineCount: content.split('\n').length,
    characterCount: content.length,
    wordCount: content.split(/\s+/).filter(word => word.length > 0).length
  };
  
  // Extract creation/modification dates from content if available
  const dateMatches = content.match(/\b\d{4}-\d{2}-\d{2}\b/g) || [];
  const dates = dateMatches.map(date => new Date(date)).filter(date => !isNaN(date));
  
  // Detect document version/type
  let documentType = 'unknown';
  if (fileName.includes('COMPREHENSIVE_RIDE_FLOW_ANALYSIS.md')) {
    documentType = 'original_analysis';
  } else if (fileName.includes('CORRECTED')) {
    documentType = 'corrected_analysis';
  } else if (fileName.includes('UPDATED')) {
    documentType = 'updated_analysis';
  } else if (fileName.includes('GAP_ANALYSIS')) {
    documentType = 'gap_analysis';
  }
  
  // Count different types of references
  const referenceStats = {
    databaseReferences: (content.match(/\b[a-z_]+\.[a-z_]+\b/g) || []).length,
    componentReferences: (content.match(/\b[A-Z][a-zA-Z0-9_]*(?:Component|Modal|Form|Card|Page|View)\b/g) || []).length,
    apiReferences: (content.match(/\b[a-z_]+\([^)]*\)/g) || []).length,
    statusReferences: (content.match(/\b[A-Z_]{2,}\b/g) || []).length
  };
  
  return {
    fileName,
    documentType,
    stats,
    referenceStats,
    dates,
    exists: true,
    parsedAt: new Date().toISOString()
  };
}

/**
 * Extract and categorize content by type
 * @param {AnalysisDocument[]} documents - Array of parsed documents
 * @returns {Object} Categorized content
 */
export function categorizeDocumentContent(documents) {
  const categorized = {
    flowLogic: [],
    databaseReferences: [],
    componentReferences: [],
    apiReferences: [],
    statusReferences: [],
    configReferences: [],
    gapAnalysis: [],
    overview: [],
    duplicateContent: []
  };
  
  documents.forEach(doc => {
    doc.sections.forEach(section => {
      const categoryKey = getCategoryKey(section.type);
      if (categoryKey && categorized[categoryKey]) {
        categorized[categoryKey].push({
          content: section.content,
          title: section.title,
          sourceDocument: doc.filePath,
          sectionType: section.type,
          level: section.level
        });
      }
    });
  });
  
  return categorized;
}

/**
 * Map section type to category key
 * @param {string} sectionType - Section type
 * @returns {string|null} Category key
 */
function getCategoryKey(sectionType) {
  const mapping = {
    'flow_logic': 'flowLogic',
    'database_reference': 'databaseReferences',
    'component_reference': 'componentReferences',
    'api_reference': 'apiReferences',
    'status_reference': 'statusReferences',
    'configuration_reference': 'configReferences',
    'gap_analysis': 'gapAnalysis',
    'overview': 'overview'
  };
  
  return mapping[sectionType] || null;
}

/**
 * Find duplicate content across documents
 * @param {AnalysisDocument[]} documents - Array of parsed documents
 * @returns {Object[]} Array of duplicate content items
 */
export function identifyDuplicates(documents) {
  const duplicates = [];
  const contentMap = new Map();
  
  // Build content map
  documents.forEach(doc => {
    doc.sections.forEach(section => {
      const normalizedContent = normalizeContent(section.content);
      if (normalizedContent.length > 50) { // Only check substantial content
        if (!contentMap.has(normalizedContent)) {
          contentMap.set(normalizedContent, []);
        }
        contentMap.get(normalizedContent).push({
          document: doc.filePath,
          section: section.title,
          content: section.content,
          type: section.type
        });
      }
    });
  });
  
  // Find duplicates
  contentMap.forEach((occurrences, content) => {
    if (occurrences.length > 1) {
      duplicates.push({
        normalizedContent: content,
        occurrences,
        duplicateCount: occurrences.length
      });
    }
  });
  
  return duplicates.sort((a, b) => b.duplicateCount - a.duplicateCount);
}

/**
 * Normalize content for duplicate detection
 * @param {string} content - Content to normalize
 * @returns {string} Normalized content
 */
function normalizeContent(content) {
  if (!content || typeof content !== 'string') {
    return '';
  }
  
  return content
    .toLowerCase()
    .replace(/\s+/g, ' ') // Normalize whitespace
    .replace(/[^\w\s]/g, '') // Remove punctuation
    .trim();
}

/**
 * Main function to parse all source analysis documents
 * @param {string[]} documentPaths - Optional array of document paths
 * @returns {Promise<Object>} Complete document analysis
 */
export async function parseAllSourceDocuments(documentPaths) {
  const documents = await parseSourceDocuments(documentPaths);
  const categorizedContent = categorizeDocumentContent(documents);
  const duplicates = identifyDuplicates(documents);
  
  return {
    documents,
    categorizedContent,
    duplicates,
    metadata: {
      totalDocuments: documents.length,
      existingDocuments: documents.filter(doc => doc.metadata.exists).length,
      totalSections: documents.reduce((sum, doc) => sum + doc.sections.length, 0),
      parsedAt: new Date().toISOString()
    }
  };
}