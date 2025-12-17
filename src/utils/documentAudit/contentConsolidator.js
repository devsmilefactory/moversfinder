/**
 * Content Consolidator
 * 
 * Combines all document versions while preserving unique flow logic
 * and applying naming corrections systematically across all content types.
 */

import { parseAllSourceDocuments } from './documentParser.js';
import { buildContentCategorizationSystem } from './contentCategorizer.js';
import { detectAndHandleDuplicates } from './duplicateDetector.js';
import { NamingReplacementEngine } from './namingReplacementEngine.js';

/**
 * Main class for content consolidation
 */
export class ContentConsolidator {
  constructor() {
    this.namingEngine = null;
    this.consolidationStats = {
      documentsProcessed: 0,
      sectionsConsolidated: 0,
      duplicatesRemoved: 0,
      namingCorrections: 0,
      flowLogicPreserved: 0,
      conflictsResolved: 0
    };
  }

  /**
   * Initialize the consolidator
   * @returns {Promise<void>}
   */
  async initialize() {
    console.log('Initializing content consolidator...');
    this.namingEngine = new NamingReplacementEngine();
    await this.namingEngine.initialize();
    console.log('Content consolidator initialized successfully');
  }

  /**
   * Consolidate all analysis documents
   * @param {string[]} documentPaths - Paths to documents to consolidate
   * @param {Object} options - Consolidation options
   * @returns {Promise<Object>} Consolidated content and metadata
   */
  async consolidateDocuments(documentPaths, options = {}) {
    if (!this.namingEngine) {
      throw new Error('Content consolidator not initialized. Call initialize() first.');
    }

    const {
      preserveFlowLogic = true,
      applyNamingCorrections = true,
      eliminateDuplicates = true,
      resolveConflicts = true,
      prioritizeLatestVersions = true
    } = options;

    console.log('Starting document consolidation...');

    // Step 1: Parse all source documents
    const documentAnalysis = await parseAllSourceDocuments(documentPaths);
    this.consolidationStats.documentsProcessed = documentAnalysis.documents.length;

    // Step 2: Build content categorization system
    const categorization = buildContentCategorizationSystem(documentAnalysis.documents);

    // Step 3: Handle duplicates and conflicts
    let deduplicationResults = null;
    if (eliminateDuplicates) {
      deduplicationResults = await detectAndHandleDuplicates(
        documentAnalysis.documents,
        { preferLatestDocument: prioritizeLatestVersions }
      );
      this.consolidationStats.duplicatesRemoved = deduplicationResults.deduplicatedResults.itemsRemoved;
    }

    // Step 4: Merge content with conflict resolution
    const mergedContent = this.mergeContentWithConflictResolution(
      categorization,
      deduplicationResults,
      { resolveConflicts, prioritizeLatestVersions }
    );

    // Step 5: Apply naming corrections
    let correctedContent = mergedContent;
    if (applyNamingCorrections) {
      correctedContent = this.applyNamingCorrections(mergedContent);
      const namingStats = this.namingEngine.getReplacementStats();
      this.consolidationStats.namingCorrections = namingStats.totalReplacements;
    }

    // Step 6: Preserve and organize flow logic
    const finalContent = this.preserveAndOrganizeFlowLogic(
      correctedContent,
      { preserveFlowLogic }
    );

    return {
      consolidatedContent: finalContent,
      originalDocuments: documentAnalysis,
      categorization,
      deduplicationResults,
      consolidationStats: this.consolidationStats,
      metadata: {
        consolidatedAt: new Date().toISOString(),
        totalSections: finalContent.sections.length,
        options
      }
    };
  }
  /**
   * Merge content with conflict resolution
   * @param {Object} categorization - Categorized content
   * @param {Object} deduplicationResults - Deduplication results
   * @param {Object} options - Merge options
   * @returns {Object} Merged content structure
   */
  mergeContentWithConflictResolution(categorization, deduplicationResults, options = {}) {
    const { resolveConflicts = true, prioritizeLatestVersions = true } = options;
    
    const mergedSections = [];
    const conflicts = [];
    
    // Process each content category
    Object.entries(categorization.categorizedContent).forEach(([category, items]) => {
      const categorySection = {
        title: this.getCategoryTitle(category),
        type: category,
        content: '',
        subsections: [],
        sourceDocuments: [],
        conflicts: []
      };

      // Group items by similarity
      const groupedItems = this.groupSimilarItems(items);
      
      groupedItems.forEach(group => {
        if (group.length === 1) {
          // Single item - add directly
          const item = group[0];
          categorySection.subsections.push({
            title: item.title,
            content: item.content,
            sourceDocument: item.sourceDocument,
            type: item.sectionType,
            level: item.level
          });
          categorySection.sourceDocuments.push(item.sourceDocument);
        } else {
          // Multiple similar items - resolve conflicts
          const resolved = this.resolveContentConflict(group, {
            resolveConflicts,
            prioritizeLatestVersions
          });
          
          if (resolved.hasConflict && !resolveConflicts) {
            conflicts.push(resolved);
          } else {
            categorySection.subsections.push(resolved.mergedContent);
            categorySection.sourceDocuments.push(...resolved.sourceDocuments);
          }
        }
      });

      if (categorySection.subsections.length > 0) {
        mergedSections.push(categorySection);
        this.consolidationStats.sectionsConsolidated += categorySection.subsections.length;
      }
    });

    return {
      sections: mergedSections,
      conflicts,
      metadata: {
        totalSections: mergedSections.length,
        totalConflicts: conflicts.length,
        mergedAt: new Date().toISOString()
      }
    };
  }

  /**
   * Group similar content items
   * @param {Object[]} items - Content items to group
   * @returns {Object[][]} Groups of similar items
   */
  groupSimilarItems(items) {
    const groups = [];
    const processed = new Set();

    items.forEach((item, index) => {
      if (processed.has(index)) return;

      const group = [item];
      processed.add(index);

      // Find similar items
      for (let i = index + 1; i < items.length; i++) {
        if (processed.has(i)) continue;

        const similarity = this.calculateContentSimilarity(item.content, items[i].content);
        if (similarity > 0.7) { // 70% similarity threshold
          group.push(items[i]);
          processed.add(i);
        }
      }

      groups.push(group);
    });

    return groups;
  }

  /**
   * Calculate content similarity
   * @param {string} content1 - First content
   * @param {string} content2 - Second content
   * @returns {number} Similarity score (0-1)
   */
  calculateContentSimilarity(content1, content2) {
    if (!content1 || !content2) return 0;
    if (content1 === content2) return 1;

    const words1 = new Set(content1.toLowerCase().split(/\s+/));
    const words2 = new Set(content2.toLowerCase().split(/\s+/));
    
    const intersection = new Set([...words1].filter(word => words2.has(word)));
    const union = new Set([...words1, ...words2]);
    
    return union.size > 0 ? intersection.size / union.size : 0;
  }

  /**
   * Resolve conflicts between similar content items
   * @param {Object[]} conflictingItems - Items with conflicts
   * @param {Object} options - Resolution options
   * @returns {Object} Resolved content
   */
  resolveContentConflict(conflictingItems, options = {}) {
    const { resolveConflicts = true, prioritizeLatestVersions = true } = options;
    
    if (conflictingItems.length <= 1) {
      return {
        hasConflict: false,
        mergedContent: conflictingItems[0],
        sourceDocuments: [conflictingItems[0].sourceDocument]
      };
    }

    // Sort by priority
    const sorted = [...conflictingItems].sort((a, b) => {
      if (prioritizeLatestVersions) {
        const aIsLatest = this.isLatestVersion(a.sourceDocument);
        const bIsLatest = this.isLatestVersion(b.sourceDocument);
        if (aIsLatest && !bIsLatest) return -1;
        if (!aIsLatest && bIsLatest) return 1;
      }
      
      // Prefer more detailed content
      return b.content.length - a.content.length;
    });

    if (!resolveConflicts) {
      return {
        hasConflict: true,
        conflictingItems,
        suggestedResolution: sorted[0]
      };
    }

    // Merge content intelligently
    const mergedContent = this.intelligentContentMerge(sorted);
    this.consolidationStats.conflictsResolved++;

    return {
      hasConflict: false,
      mergedContent,
      sourceDocuments: conflictingItems.map(item => item.sourceDocument),
      resolutionMethod: 'intelligent_merge'
    };
  }

  /**
   * Check if document is a latest version
   * @param {string} documentPath - Document path
   * @returns {boolean} True if latest version
   */
  isLatestVersion(documentPath) {
    return documentPath.includes('UPDATED') || 
           documentPath.includes('CORRECTED') ||
           documentPath.includes('GAP_ANALYSIS');
  }

  /**
   * Intelligently merge content from multiple sources
   * @param {Object[]} sortedItems - Items sorted by priority
   * @returns {Object} Merged content item
   */
  intelligentContentMerge(sortedItems) {
    const primary = sortedItems[0];
    const alternatives = sortedItems.slice(1);
    
    let mergedContent = primary.content;
    const additionalInfo = [];
    
    // Extract unique information from alternatives
    alternatives.forEach(alt => {
      const uniqueParts = this.extractUniqueContent(primary.content, alt.content);
      if (uniqueParts.length > 0) {
        additionalInfo.push({
          source: alt.sourceDocument,
          uniqueContent: uniqueParts
        });
      }
    });

    // Append unique information
    if (additionalInfo.length > 0) {
      mergedContent += '\n\n**Additional Information:**\n';
      additionalInfo.forEach(info => {
        mergedContent += `\n*From ${info.source}:*\n`;
        info.uniqueContent.forEach(content => {
          mergedContent += `- ${content}\n`;
        });
      });
    }

    return {
      title: primary.title,
      content: mergedContent,
      sourceDocument: `Merged from: ${sortedItems.map(item => item.sourceDocument).join(', ')}`,
      type: primary.sectionType,
      level: primary.level,
      mergedFrom: sortedItems.length
    };
  }

  /**
   * Extract unique content from alternative source
   * @param {string} primaryContent - Primary content
   * @param {string} alternativeContent - Alternative content
   * @returns {string[]} Unique content parts
   */
  extractUniqueContent(primaryContent, alternativeContent) {
    const primarySentences = this.splitIntoSentences(primaryContent);
    const altSentences = this.splitIntoSentences(alternativeContent);
    
    const uniqueSentences = [];
    
    altSentences.forEach(altSentence => {
      const isUnique = !primarySentences.some(primarySentence => 
        this.calculateContentSimilarity(primarySentence, altSentence) > 0.8
      );
      
      if (isUnique && altSentence.trim().length > 20) {
        uniqueSentences.push(altSentence.trim());
      }
    });
    
    return uniqueSentences;
  }

  /**
   * Split content into sentences
   * @param {string} content - Content to split
   * @returns {string[]} Array of sentences
   */
  splitIntoSentences(content) {
    return content
      .split(/[.!?]+/)
      .map(sentence => sentence.trim())
      .filter(sentence => sentence.length > 10);
  }

  /**
   * Apply naming corrections to merged content
   * @param {Object} mergedContent - Merged content structure
   * @returns {Object} Content with naming corrections applied
   */
  applyNamingCorrections(mergedContent) {
    const correctedSections = mergedContent.sections.map(section => ({
      ...section,
      content: this.namingEngine.applyNamingCorrections(section.content),
      subsections: section.subsections.map(subsection => ({
        ...subsection,
        content: this.namingEngine.applyNamingCorrections(subsection.content)
      }))
    }));

    return {
      ...mergedContent,
      sections: correctedSections
    };
  }

  /**
   * Preserve and organize flow logic
   * @param {Object} correctedContent - Content with naming corrections
   * @param {Object} options - Organization options
   * @returns {Object} Final organized content
   */
  preserveAndOrganizeFlowLogic(correctedContent, options = {}) {
    const { preserveFlowLogic = true } = options;
    
    if (!preserveFlowLogic) {
      return correctedContent;
    }

    // Reorganize sections to prioritize flow logic
    const organizedSections = [...correctedContent.sections].sort((a, b) => {
      const aIsFlow = a.type === 'flow_logic';
      const bIsFlow = b.type === 'flow_logic';
      
      if (aIsFlow && !bIsFlow) return -1;
      if (!aIsFlow && bIsFlow) return 1;
      
      // Maintain original order for same types
      return 0;
    });

    // Count preserved flow logic
    const flowSections = organizedSections.filter(section => section.type === 'flow_logic');
    this.consolidationStats.flowLogicPreserved = flowSections.reduce(
      (count, section) => count + section.subsections.length, 0
    );

    return {
      ...correctedContent,
      sections: organizedSections,
      flowLogicSummary: {
        totalFlowSections: flowSections.length,
        preservedFlowLogic: this.consolidationStats.flowLogicPreserved
      }
    };
  }

  /**
   * Get category title for display
   * @param {string} category - Category key
   * @returns {string} Display title
   */
  getCategoryTitle(category) {
    const titles = {
      'flow_logic': 'Business Process Flows',
      'database_reference': 'Database Schema References',
      'component_reference': 'Component References',
      'api_reference': 'API Function References',
      'status_reference': 'Status and State References',
      'configuration_reference': 'Configuration References',
      'gap_analysis': 'Implementation Gaps and TODOs',
      'overview': 'Overview and Summary'
    };
    
    return titles[category] || category.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  }

  /**
   * Get consolidation statistics
   * @returns {Object} Consolidation statistics
   */
  getConsolidationStats() {
    return { ...this.consolidationStats };
  }

  /**
   * Reset consolidation statistics
   */
  resetStats() {
    Object.keys(this.consolidationStats).forEach(key => {
      this.consolidationStats[key] = 0;
    });
  }
}

/**
 * Convenience function to consolidate documents
 * @param {string[]} documentPaths - Paths to documents
 * @param {Object} options - Consolidation options
 * @returns {Promise<Object>} Consolidation results
 */
export async function consolidateAnalysisDocuments(documentPaths, options = {}) {
  const consolidator = new ContentConsolidator();
  await consolidator.initialize();
  return await consolidator.consolidateDocuments(documentPaths, options);
}