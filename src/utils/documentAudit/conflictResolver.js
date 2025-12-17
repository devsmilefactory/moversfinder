/**
 * Conflict Resolution System
 * 
 * Implements logic to resolve conflicts between different document versions
 * using actual codebase naming as authoritative source and creates
 * prioritization system for handling contradictory information.
 */

/**
 * Main class for conflict resolution
 */
export class ConflictResolver {
  constructor(namingMaps = null) {
    this.namingMaps = namingMaps;
    this.resolutionStats = {
      conflictsDetected: 0,
      conflictsResolved: 0,
      namingConflicts: 0,
      contentConflicts: 0,
      versionConflicts: 0,
      unresolvableConflicts: 0
    };
    
    // Resolution strategies
    this.resolutionStrategies = {
      naming: 'use_codebase_authority',
      content: 'prefer_latest_detailed',
      version: 'prefer_latest',
      contradiction: 'flag_for_review'
    };
  }

  /**
   * Set naming maps for authoritative resolution
   * @param {Object} namingMaps - Naming reference maps from codebase analysis
   */
  setNamingMaps(namingMaps) {
    this.namingMaps = namingMaps;
  }

  /**
   * Detect conflicts between content items
   * @param {Object[]} contentItems - Array of content items to analyze
   * @returns {Object[]} Array of detected conflicts
   */
  detectConflicts(contentItems) {
    const conflicts = [];
    
    // Group items by similarity for conflict detection
    const groups = this.groupSimilarContent(contentItems);
    
    groups.forEach(group => {
      if (group.length > 1) {
        const groupConflicts = this.analyzeGroupForConflicts(group);
        conflicts.push(...groupConflicts);
      }
    });
    
    this.resolutionStats.conflictsDetected = conflicts.length;
    return conflicts.sort((a, b) => b.severity - a.severity);
  }

  /**
   * Group similar content for conflict analysis
   * @param {Object[]} contentItems - Content items to group
   * @returns {Object[][]} Groups of similar content
   */
  groupSimilarContent(contentItems) {
    const groups = [];
    const processed = new Set();
    
    contentItems.forEach((item, index) => {
      if (processed.has(index)) return;
      
      const group = [item];
      processed.add(index);
      
      // Find similar items based on title and content similarity
      for (let i = index + 1; i < contentItems.length; i++) {
        if (processed.has(i)) continue;
        
        const similarity = this.calculateSimilarity(item, contentItems[i]);
        if (similarity > 0.6) { // 60% similarity threshold for conflict detection
          group.push(contentItems[i]);
          processed.add(i);
        }
      }
      
      groups.push(group);
    });
    
    return groups;
  }

  /**
   * Calculate similarity between two content items
   * @param {Object} item1 - First content item
   * @param {Object} item2 - Second content item
   * @returns {number} Similarity score (0-1)
   */
  calculateSimilarity(item1, item2) {
    // Title similarity
    const titleSimilarity = this.calculateTextSimilarity(
      item1.title || '', 
      item2.title || ''
    );
    
    // Content similarity
    const contentSimilarity = this.calculateTextSimilarity(
      item1.content || '', 
      item2.content || ''
    );
    
    // Weighted average (title is more important for grouping)
    return (titleSimilarity * 0.7) + (contentSimilarity * 0.3);
  }

  /**
   * Calculate text similarity using word overlap
   * @param {string} text1 - First text
   * @param {string} text2 - Second text
   * @returns {number} Similarity score (0-1)
   */
  calculateTextSimilarity(text1, text2) {
    if (!text1 || !text2) return 0;
    if (text1 === text2) return 1;
    
    const words1 = new Set(text1.toLowerCase().split(/\s+/).filter(w => w.length > 2));
    const words2 = new Set(text2.toLowerCase().split(/\s+/).filter(w => w.length > 2));
    
    const intersection = new Set([...words1].filter(word => words2.has(word)));
    const union = new Set([...words1, ...words2]);
    
    return union.size > 0 ? intersection.size / union.size : 0;
  }

  /**
   * Analyze a group of similar content for conflicts
   * @param {Object[]} group - Group of similar content items
   * @returns {Object[]} Array of conflicts found in the group
   */
  analyzeGroupForConflicts(group) {
    const conflicts = [];
    
    // Check for naming conflicts
    const namingConflicts = this.detectNamingConflicts(group);
    conflicts.push(...namingConflicts);
    
    // Check for content contradictions
    const contentConflicts = this.detectContentContradictions(group);
    conflicts.push(...contentConflicts);
    
    // Check for version conflicts
    const versionConflicts = this.detectVersionConflicts(group);
    conflicts.push(...versionConflicts);
    
    return conflicts;
  }

  /**
   * Detect naming conflicts within a group
   * @param {Object[]} group - Group of content items
   * @returns {Object[]} Array of naming conflicts
   */
  detectNamingConflicts(group) {
    const conflicts = [];
    
    // Extract naming references from each item
    const namingReferences = group.map(item => ({
      item,
      references: this.extractNamingReferences(item.content)
    }));
    
    // Compare naming references between items
    for (let i = 0; i < namingReferences.length; i++) {
      for (let j = i + 1; j < namingReferences.length; j++) {
        const conflicts_ij = this.compareNamingReferences(
          namingReferences[i],
          namingReferences[j]
        );
        conflicts.push(...conflicts_ij);
      }
    }
    
    this.resolutionStats.namingConflicts += conflicts.length;
    return conflicts;
  }

  /**
   * Extract naming references from content
   * @param {string} content - Content to analyze
   * @returns {Object} Extracted naming references
   */
  extractNamingReferences(content) {
    const references = {
      databaseFields: [],
      components: [],
      apiFunctions: [],
      statusValues: [],
      configurations: []
    };
    
    // Database field references (table.field pattern)
    const dbFieldMatches = content.match(/\b[a-z_]+\.[a-z_]+\b/g) || [];
    references.databaseFields = [...new Set(dbFieldMatches)];
    
    // Component references (PascalCase patterns)
    const componentMatches = content.match(/\b[A-Z][a-zA-Z0-9_]*(?:Component|Modal|Form|Card|Page|View)\b/g) || [];
    references.components = [...new Set(componentMatches)];
    
    // API function references (snake_case with parentheses)
    const apiFunctionMatches = content.match(/\b[a-z_]+\([^)]*\)/g) || [];
    references.apiFunctions = [...new Set(apiFunctionMatches.map(match => match.split('(')[0]))];
    
    // Status value references (UPPER_CASE)
    const statusMatches = content.match(/\b[A-Z_]{2,}\b/g) || [];
    const commonWords = ['THE', 'AND', 'OR', 'NOT', 'FOR', 'TO', 'FROM', 'WITH', 'BY', 'API', 'URL', 'ID'];
    references.statusValues = [...new Set(statusMatches.filter(match => !commonWords.includes(match)))];
    
    // Configuration references
    const configMatches = content.match(/\b[A-Z_]+_CONFIG\b/g) || [];
    references.configurations = [...new Set(configMatches)];
    
    return references;
  }

  /**
   * Compare naming references between two items
   * @param {Object} ref1 - First item's references
   * @param {Object} ref2 - Second item's references
   * @returns {Object[]} Array of naming conflicts
   */
  compareNamingReferences(ref1, ref2) {
    const conflicts = [];
    
    // Check each type of reference
    Object.keys(ref1.references).forEach(refType => {
      const refs1 = ref1.references[refType];
      const refs2 = ref2.references[refType];
      
      // Find conflicting references (same concept, different names)
      refs1.forEach(name1 => {
        refs2.forEach(name2 => {
          if (name1 !== name2 && this.areConceptuallySimilar(name1, name2)) {
            const resolution = this.resolveNamingConflict(name1, name2, refType);
            
            conflicts.push({
              type: 'naming_conflict',
              subtype: refType,
              severity: this.calculateConflictSeverity('naming', refType),
              item1: ref1.item,
              item2: ref2.item,
              conflictingNames: [name1, name2],
              resolution,
              resolvable: resolution.isResolvable
            });
          }
        });
      });
    });
    
    return conflicts;
  }

  /**
   * Check if two names are conceptually similar
   * @param {string} name1 - First name
   * @param {string} name2 - Second name
   * @returns {boolean} True if conceptually similar
   */
  areConceptuallySimilar(name1, name2) {
    // Normalize names for comparison
    const normalize = (name) => name.toLowerCase().replace(/[_-]/g, '');
    const norm1 = normalize(name1);
    const norm2 = normalize(name2);
    
    // Check for partial matches or similar roots
    return norm1.includes(norm2) || 
           norm2.includes(norm1) || 
           this.calculateTextSimilarity(norm1, norm2) > 0.7;
  }

  /**
   * Resolve naming conflict using codebase authority
   * @param {string} name1 - First conflicting name
   * @param {string} name2 - Second conflicting name
   * @param {string} refType - Type of reference
   * @returns {Object} Resolution result
   */
  resolveNamingConflict(name1, name2, refType) {
    if (!this.namingMaps) {
      return {
        isResolvable: false,
        reason: 'no_naming_maps',
        suggestion: 'Manual review required'
      };
    }
    
    const actualName = this.findActualName(name1, name2, refType);
    
    if (actualName) {
      return {
        isResolvable: true,
        correctName: actualName.actualName,
        source: actualName.source,
        incorrectNames: [name1, name2].filter(name => name !== actualName.actualName),
        confidence: actualName.confidence || 1.0
      };
    }
    
    return {
      isResolvable: false,
      reason: 'not_found_in_codebase',
      suggestion: `Neither "${name1}" nor "${name2}" found in codebase. Manual verification needed.`,
      possibleNames: this.findSimilarNames(name1, name2, refType)
    };
  }

  /**
   * Find actual name in codebase
   * @param {string} name1 - First name candidate
   * @param {string} name2 - Second name candidate
   * @param {string} refType - Reference type
   * @returns {Object|null} Actual name information
   */
  findActualName(name1, name2, refType) {
    const candidates = [name1, name2];
    
    switch (refType) {
      case 'databaseFields':
        return this.findInNamingMap(candidates, this.namingMaps.database.fields);
      
      case 'components':
        return this.findInNamingMap(candidates, this.namingMaps.components.components);
      
      case 'apiFunctions':
        return this.findInNamingMap(candidates, this.namingMaps.api.all);
      
      case 'statusValues':
        return this.findInNamingMap(candidates, this.namingMaps.statusConfig.statusConstants);
      
      case 'configurations':
        return this.findInNamingMap(candidates, this.namingMaps.statusConfig.configurations);
      
      default:
        return null;
    }
  }

  /**
   * Find candidate in naming map
   * @param {string[]} candidates - Name candidates
   * @param {Object} namingMap - Naming map to search
   * @returns {Object|null} Found name information
   */
  findInNamingMap(candidates, namingMap) {
    for (const candidate of candidates) {
      if (namingMap[candidate]) {
        return {
          actualName: namingMap[candidate].actualName || candidate,
          source: namingMap[candidate].source || 'codebase',
          confidence: 1.0
        };
      }
    }
    
    // Try partial matches
    const allNames = Object.keys(namingMap);
    for (const candidate of candidates) {
      const partialMatch = allNames.find(name => 
        this.areConceptuallySimilar(candidate, name)
      );
      
      if (partialMatch) {
        return {
          actualName: namingMap[partialMatch].actualName || partialMatch,
          source: namingMap[partialMatch].source || 'codebase',
          confidence: 0.8
        };
      }
    }
    
    return null;
  }

  /**
   * Find similar names in codebase
   * @param {string} name1 - First name
   * @param {string} name2 - Second name
   * @param {string} refType - Reference type
   * @returns {string[]} Array of similar names
   */
  findSimilarNames(name1, name2, refType) {
    if (!this.namingMaps) return [];
    
    let namingMap;
    switch (refType) {
      case 'databaseFields':
        namingMap = this.namingMaps.database.fields;
        break;
      case 'components':
        namingMap = this.namingMaps.components.components;
        break;
      case 'apiFunctions':
        namingMap = this.namingMaps.api.all;
        break;
      case 'statusValues':
        namingMap = this.namingMaps.statusConfig.statusConstants;
        break;
      case 'configurations':
        namingMap = this.namingMaps.statusConfig.configurations;
        break;
      default:
        return [];
    }
    
    const allNames = Object.keys(namingMap);
    const similarNames = [];
    
    [name1, name2].forEach(name => {
      allNames.forEach(actualName => {
        if (this.calculateTextSimilarity(name, actualName) > 0.5) {
          similarNames.push(actualName);
        }
      });
    });
    
    return [...new Set(similarNames)].slice(0, 5); // Return top 5 matches
  }

  /**
   * Detect content contradictions within a group
   * @param {Object[]} group - Group of content items
   * @returns {Object[]} Array of content conflicts
   */
  detectContentContradictions(group) {
    const conflicts = [];
    
    for (let i = 0; i < group.length; i++) {
      for (let j = i + 1; j < group.length; j++) {
        const contradiction = this.findContentContradiction(group[i], group[j]);
        if (contradiction) {
          conflicts.push(contradiction);
        }
      }
    }
    
    this.resolutionStats.contentConflicts += conflicts.length;
    return conflicts;
  }

  /**
   * Find contradiction between two content items
   * @param {Object} item1 - First content item
   * @param {Object} item2 - Second content item
   * @returns {Object|null} Contradiction if found
   */
  findContentContradiction(item1, item2) {
    const content1 = item1.content || '';
    const content2 = item2.content || '';
    
    // Look for contradictory statements
    const contradictoryPatterns = [
      { 
        pattern: /\b(is|are|will|should|must)\b/gi, 
        opposite: /\b(is not|are not|will not|should not|must not|isn't|aren't|won't|shouldn't|mustn't)\b/gi 
      },
      { 
        pattern: /\b(required|mandatory|necessary)\b/gi, 
        opposite: /\b(optional|not required|not necessary)\b/gi 
      },
      { 
        pattern: /\b(enabled|active|on)\b/gi, 
        opposite: /\b(disabled|inactive|off)\b/gi 
      }
    ];

    for (const { pattern, opposite } of contradictoryPatterns) {
      const hasPattern1 = pattern.test(content1);
      const hasOpposite1 = opposite.test(content1);
      const hasPattern2 = pattern.test(content2);
      const hasOpposite2 = opposite.test(content2);

      if ((hasPattern1 && hasOpposite2) || (hasOpposite1 && hasPattern2)) {
        return {
          type: 'content_contradiction',
          severity: this.calculateConflictSeverity('content', 'logical_opposite'),
          item1,
          item2,
          contradictionType: 'logical_opposite',
          resolution: this.resolveContentContradiction(item1, item2)
        };
      }
    }
    
    return null;
  }

  /**
   * Detect version conflicts within a group
   * @param {Object[]} group - Group of content items
   * @returns {Object[]} Array of version conflicts
   */
  detectVersionConflicts(group) {
    const conflicts = [];
    
    for (let i = 0; i < group.length; i++) {
      for (let j = i + 1; j < group.length; j++) {
        const versionConflict = this.findVersionConflict(group[i], group[j]);
        if (versionConflict) {
          conflicts.push(versionConflict);
        }
      }
    }
    
    this.resolutionStats.versionConflicts += conflicts.length;
    return conflicts;
  }

  /**
   * Find version conflict between two content items
   * @param {Object} item1 - First content item
   * @param {Object} item2 - Second content item
   * @returns {Object|null} Version conflict if found
   */
  findVersionConflict(item1, item2) {
    const content1 = item1.content || '';
    const content2 = item2.content || '';
    
    // Check for version conflicts (different values for same concept)
    const versionPatterns = [
      /version\s+(\d+\.\d+)/gi,
      /v(\d+\.\d+)/gi,
      /(\d{4}-\d{2}-\d{2})/g // dates
    ];

    for (const pattern of versionPatterns) {
      const matches1 = content1.match(pattern) || [];
      const matches2 = content2.match(pattern) || [];
      
      if (matches1.length > 0 && matches2.length > 0 && 
          !matches1.some(m1 => matches2.includes(m1))) {
        return {
          type: 'version_conflict',
          severity: this.calculateConflictSeverity('version', 'different_versions'),
          item1,
          item2,
          conflictType: 'different_versions',
          values1: matches1,
          values2: matches2,
          resolution: this.resolveVersionConflict(item1, item2, matches1, matches2)
        };
      }
    }
    
    return null;
  }

  /**
   * Calculate conflict severity
   * @param {string} conflictType - Type of conflict
   * @param {string} subtype - Subtype of conflict
   * @returns {number} Severity score (0-1)
   */
  calculateConflictSeverity(conflictType, subtype) {
    const severityMap = {
      naming: {
        databaseFields: 0.9,
        components: 0.8,
        apiFunctions: 0.85,
        statusValues: 0.7,
        configurations: 0.6
      },
      content: {
        logical_opposite: 0.8,
        different_approach: 0.6
      },
      version: {
        different_versions: 0.7,
        outdated_info: 0.5
      }
    };
    
    return severityMap[conflictType]?.[subtype] || 0.5;
  }

  /**
   * Resolve content contradiction
   * @param {Object} item1 - First content item
   * @param {Object} item2 - Second content item
   * @returns {Object} Resolution strategy
   */
  resolveContentContradiction(item1, item2) {
    // Use latest document as authority
    const isItem1Latest = this.isLatestVersion(item1.sourceDocument);
    const isItem2Latest = this.isLatestVersion(item2.sourceDocument);
    
    if (isItem1Latest && !isItem2Latest) {
      return {
        isResolvable: true,
        preferredItem: item1,
        reason: 'prefer_latest_document',
        confidence: 0.8
      };
    } else if (isItem2Latest && !isItem1Latest) {
      return {
        isResolvable: true,
        preferredItem: item2,
        reason: 'prefer_latest_document',
        confidence: 0.8
      };
    }
    
    // If both are same version, prefer more detailed content
    if (item1.content.length > item2.content.length * 1.5) {
      return {
        isResolvable: true,
        preferredItem: item1,
        reason: 'prefer_more_detailed',
        confidence: 0.6
      };
    } else if (item2.content.length > item1.content.length * 1.5) {
      return {
        isResolvable: true,
        preferredItem: item2,
        reason: 'prefer_more_detailed',
        confidence: 0.6
      };
    }
    
    return {
      isResolvable: false,
      reason: 'manual_review_required',
      suggestion: 'Both items have equal authority, manual review needed'
    };
  }

  /**
   * Resolve version conflict
   * @param {Object} item1 - First content item
   * @param {Object} item2 - Second content item
   * @param {string[]} values1 - Version values from item1
   * @param {string[]} values2 - Version values from item2
   * @returns {Object} Resolution strategy
   */
  resolveVersionConflict(item1, item2, values1, values2) {
    // Prefer latest document
    const isItem1Latest = this.isLatestVersion(item1.sourceDocument);
    const isItem2Latest = this.isLatestVersion(item2.sourceDocument);
    
    if (isItem1Latest && !isItem2Latest) {
      return {
        isResolvable: true,
        preferredItem: item1,
        preferredValues: values1,
        reason: 'prefer_latest_document',
        confidence: 0.9
      };
    } else if (isItem2Latest && !isItem1Latest) {
      return {
        isResolvable: true,
        preferredItem: item2,
        preferredValues: values2,
        reason: 'prefer_latest_document',
        confidence: 0.9
      };
    }
    
    return {
      isResolvable: false,
      reason: 'version_ambiguity',
      suggestion: 'Cannot determine which version is more recent, manual review needed'
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
   * Resolve all detected conflicts
   * @param {Object[]} conflicts - Array of conflicts to resolve
   * @returns {Object} Resolution results
   */
  resolveConflicts(conflicts) {
    const resolved = [];
    const unresolved = [];
    
    conflicts.forEach(conflict => {
      if (conflict.resolvable && conflict.resolution?.isResolvable) {
        resolved.push({
          ...conflict,
          status: 'resolved',
          appliedResolution: conflict.resolution
        });
        this.resolutionStats.conflictsResolved++;
      } else {
        unresolved.push({
          ...conflict,
          status: 'unresolved',
          requiresManualReview: true
        });
        this.resolutionStats.unresolvableConflicts++;
      }
    });
    
    return {
      resolved,
      unresolved,
      stats: this.resolutionStats,
      metadata: {
        totalConflicts: conflicts.length,
        resolvedCount: resolved.length,
        unresolvedCount: unresolved.length,
        resolutionRate: conflicts.length > 0 ? (resolved.length / conflicts.length * 100).toFixed(2) + '%' : '100%',
        processedAt: new Date().toISOString()
      }
    };
  }

  /**
   * Get resolution statistics
   * @returns {Object} Resolution statistics
   */
  getResolutionStats() {
    return { ...this.resolutionStats };
  }

  /**
   * Reset resolution statistics
   */
  resetStats() {
    Object.keys(this.resolutionStats).forEach(key => {
      this.resolutionStats[key] = 0;
    });
  }
}

/**
 * Convenience function to create and use conflict resolver
 * @param {Object[]} contentItems - Content items to analyze
 * @param {Object} namingMaps - Naming reference maps
 * @returns {Promise<Object>} Conflict resolution results
 */
export async function resolveDocumentConflicts(contentItems, namingMaps) {
  const resolver = new ConflictResolver(namingMaps);
  const conflicts = resolver.detectConflicts(contentItems);
  const resolutionResults = resolver.resolveConflicts(conflicts);
  
  return {
    conflicts,
    resolutionResults,
    resolver
  };
}