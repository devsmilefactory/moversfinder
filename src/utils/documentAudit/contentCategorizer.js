/**
 * Content Categorizer
 * Identifies and extracts different types of content from analysis documents
 * to separate preservable flow logic from correctable naming references
 */

/**
 * Categorize content into different types
 * @param {string} content - Content to categorize
 * @param {string} context - Additional context (section title, etc.)
 * @returns {Object} Categorization results
 */
export function categorizeContent(content, context = '') {
  if (!content || typeof content !== 'string') {
    return {
      type: 'unknown',
      confidence: 0,
      categories: [],
      extractedReferences: {}
    };
  }

  const categories = [];
  const extractedReferences = {};
  
  // Analyze content for different types
  const flowLogicScore = analyzeFlowLogic(content, context);
  const databaseRefScore = analyzeDatabaseReferences(content, extractedReferences);
  const componentRefScore = analyzeComponentReferences(content, extractedReferences);
  const apiRefScore = analyzeAPIReferences(content, extractedReferences);
  const statusRefScore = analyzeStatusReferences(content, extractedReferences);
  const configRefScore = analyzeConfigReferences(content, extractedReferences);
  
  // Build categories array
  if (flowLogicScore > 0.3) categories.push({ type: 'flow_logic', score: flowLogicScore });
  if (databaseRefScore > 0.2) categories.push({ type: 'database_reference', score: databaseRefScore });
  if (componentRefScore > 0.2) categories.push({ type: 'component_reference', score: componentRefScore });
  if (apiRefScore > 0.2) categories.push({ type: 'api_reference', score: apiRefScore });
  if (statusRefScore > 0.2) categories.push({ type: 'status_reference', score: statusRefScore });
  if (configRefScore > 0.2) categories.push({ type: 'configuration_reference', score: configRefScore });
  
  // Sort by score
  categories.sort((a, b) => b.score - a.score);
  
  // Determine primary type
  const primaryType = categories.length > 0 ? categories[0].type : 'general';
  const confidence = categories.length > 0 ? categories[0].score : 0;
  
  return {
    type: primaryType,
    confidence,
    categories,
    extractedReferences
  };
}

/**
 * Analyze content for flow logic patterns
 * @param {string} content - Content to analyze
 * @param {string} context - Section context
 * @returns {number} Flow logic score (0-1)
 */
function analyzeFlowLogic(content, context) {
  let score = 0;
  const contentLower = content.toLowerCase();
  const contextLower = context.toLowerCase();
  
  // Flow keywords in context
  const flowContextKeywords = [
    'flow', 'process', 'workflow', 'sequence', 'lifecycle', 
    'journey', 'steps', 'procedure', 'algorithm'
  ];
  
  flowContextKeywords.forEach(keyword => {
    if (contextLower.includes(keyword)) score += 0.3;
  });
  
  // Flow patterns in content
  const flowPatterns = [
    /\b(first|then|next|after|finally|when|if|while|during)\b/gi,
    /\b(step \d+|phase \d+|\d+\.|stage \d+)\b/gi,
    /\b(user (clicks|selects|enters|submits|navigates))\b/gi,
    /\b(system (processes|validates|sends|creates|updates))\b/gi,
    /\b(driver|passenger|user) (initiates|completes|cancels)\b/gi,
    /\b(ride (starts|ends|is created|is cancelled))\b/gi
  ];
  
  flowPatterns.forEach(pattern => {
    const matches = content.match(pattern) || [];
    score += Math.min(matches.length * 0.1, 0.4);
  });
  
  // Business process indicators
  const processIndicators = [
    'booking process', 'ride lifecycle', 'user journey', 'state transition',
    'workflow', 'business logic', 'use case', 'scenario'
  ];
  
  processIndicators.forEach(indicator => {
    if (contentLower.includes(indicator)) score += 0.2;
  });
  
  return Math.min(score, 1);
}

/**
 * Analyze content for database references
 * @param {string} content - Content to analyze
 * @param {Object} extractedReferences - Object to store extracted references
 * @returns {number} Database reference score (0-1)
 */
function analyzeDatabaseReferences(content, extractedReferences) {
  let score = 0;
  extractedReferences.database = [];
  
  // Table.field patterns
  const tableFieldPattern = /\b([a-z_]+)\.([a-z_]+)\b/g;
  let match;
  while ((match = tableFieldPattern.exec(content)) !== null) {
    extractedReferences.database.push({
      type: 'table_field',
      table: match[1],
      field: match[2],
      fullReference: match[0]
    });
    score += 0.1;
  }
  
  // SQL-like patterns
  const sqlPatterns = [
    /\bSELECT\s+[^;]+\bFROM\s+\w+/gi,
    /\bINSERT\s+INTO\s+\w+/gi,
    /\bUPDATE\s+\w+\s+SET/gi,
    /\bDELETE\s+FROM\s+\w+/gi,
    /\bCREATE\s+TABLE\s+\w+/gi
  ];
  
  sqlPatterns.forEach(pattern => {
    const matches = content.match(pattern) || [];
    matches.forEach(sqlMatch => {
      extractedReferences.database.push({
        type: 'sql_statement',
        statement: sqlMatch
      });
    });
    score += matches.length * 0.2;
  });
  
  // Database keywords
  const dbKeywords = [
    'table', 'column', 'field', 'schema', 'migration', 'database',
    'primary key', 'foreign key', 'index', 'constraint'
  ];
  
  dbKeywords.forEach(keyword => {
    if (content.toLowerCase().includes(keyword)) score += 0.1;
  });
  
  return Math.min(score, 1);
}

/**
 * Analyze content for component references
 * @param {string} content - Content to analyze
 * @param {Object} extractedReferences - Object to store extracted references
 * @returns {number} Component reference score (0-1)
 */
function analyzeComponentReferences(content, extractedReferences) {
  let score = 0;
  extractedReferences.components = [];
  
  // JSX component patterns
  const jsxPattern = /<([A-Z][a-zA-Z0-9_]*)/g;
  let match;
  while ((match = jsxPattern.exec(content)) !== null) {
    extractedReferences.components.push({
      type: 'jsx_component',
      name: match[1]
    });
    score += 0.2;
  }
  
  // Component naming patterns
  const componentPattern = /\b([A-Z][a-zA-Z0-9_]*(?:Component|Modal|Form|Card|Button|Page|View|Layout))\b/g;
  while ((match = componentPattern.exec(content)) !== null) {
    extractedReferences.components.push({
      type: 'component_name',
      name: match[1]
    });
    score += 0.15;
  }
  
  // Import statements
  const importPattern = /import\s+(?:(\w+)|(?:\{([^}]+)\}))\s+from\s+['"][^'"]*\/([A-Z][a-zA-Z0-9_]*)['"]/g;
  while ((match = importPattern.exec(content)) !== null) {
    extractedReferences.components.push({
      type: 'import_statement',
      imported: match[1] || match[2],
      from: match[3]
    });
    score += 0.1;
  }
  
  // UI/Component keywords
  const componentKeywords = [
    'component', 'modal', 'form', 'button', 'interface', 'ui',
    'render', 'jsx', 'react', 'props', 'state'
  ];
  
  componentKeywords.forEach(keyword => {
    if (content.toLowerCase().includes(keyword)) score += 0.05;
  });
  
  return Math.min(score, 1);
}

/**
 * Analyze content for API references
 * @param {string} content - Content to analyze
 * @param {Object} extractedReferences - Object to store extracted references
 * @returns {number} API reference score (0-1)
 */
function analyzeAPIReferences(content, extractedReferences) {
  let score = 0;
  extractedReferences.api = [];
  
  // Function call patterns
  const functionPattern = /\b([a-z_]+)\s*\([^)]*\)/g;
  let match;
  while ((match = functionPattern.exec(content)) !== null) {
    extractedReferences.api.push({
      type: 'function_call',
      name: match[1],
      fullCall: match[0]
    });
    score += 0.1;
  }
  
  // RPC function patterns
  const rpcPattern = /\b(get_|set_|create_|update_|delete_)[a-z_]+/g;
  while ((match = rpcPattern.exec(content)) !== null) {
    extractedReferences.api.push({
      type: 'rpc_function',
      name: match[0]
    });
    score += 0.2;
  }
  
  // HTTP method patterns
  const httpPattern = /\b(GET|POST|PUT|DELETE|PATCH)\s+\/[^\s]+/g;
  while ((match = httpPattern.exec(content)) !== null) {
    extractedReferences.api.push({
      type: 'http_endpoint',
      endpoint: match[0]
    });
    score += 0.15;
  }
  
  // API keywords
  const apiKeywords = [
    'api', 'endpoint', 'rpc', 'function', 'service', 'call',
    'request', 'response', 'supabase', 'fetch'
  ];
  
  apiKeywords.forEach(keyword => {
    if (content.toLowerCase().includes(keyword)) score += 0.05;
  });
  
  return Math.min(score, 1);
}

/**
 * Analyze content for status references
 * @param {string} content - Content to analyze
 * @param {Object} extractedReferences - Object to store extracted references
 * @returns {number} Status reference score (0-1)
 */
function analyzeStatusReferences(content, extractedReferences) {
  let score = 0;
  extractedReferences.status = [];
  
  // Status constant patterns (ALL_CAPS)
  const statusPattern = /\b([A-Z_]{2,})\b/g;
  let match;
  while ((match = statusPattern.exec(content)) !== null) {
    // Filter out common words that aren't status constants
    const commonWords = ['THE', 'AND', 'OR', 'NOT', 'FOR', 'TO', 'FROM', 'WITH', 'BY'];
    if (!commonWords.includes(match[1])) {
      extractedReferences.status.push({
        type: 'status_constant',
        name: match[1]
      });
      score += 0.1;
    }
  }
  
  // Ride status patterns
  const rideStatusPattern = /\b(pending|accepted|in_progress|completed|cancelled|expired)\b/g;
  while ((match = rideStatusPattern.exec(content)) !== null) {
    extractedReferences.status.push({
      type: 'ride_status',
      status: match[1]
    });
    score += 0.2;
  }
  
  // Status keywords
  const statusKeywords = [
    'status', 'state', 'enum', 'constant', 'flag', 'condition'
  ];
  
  statusKeywords.forEach(keyword => {
    if (content.toLowerCase().includes(keyword)) score += 0.1;
  });
  
  return Math.min(score, 1);
}

/**
 * Analyze content for configuration references
 * @param {string} content - Content to analyze
 * @param {Object} extractedReferences - Object to store extracted references
 * @returns {number} Configuration reference score (0-1)
 */
function analyzeConfigReferences(content, extractedReferences) {
  let score = 0;
  extractedReferences.config = [];
  
  // Configuration object patterns
  const configPattern = /\b([A-Z_]+_CONFIG|[A-Z_]+_SETTINGS)\b/g;
  let match;
  while ((match = configPattern.exec(content)) !== null) {
    extractedReferences.config.push({
      type: 'config_object',
      name: match[1]
    });
    score += 0.2;
  }
  
  // Environment variable patterns
  const envPattern = /\b(VITE_|REACT_APP_|NODE_ENV|API_URL)[A-Z_]*/g;
  while ((match = envPattern.exec(content)) !== null) {
    extractedReferences.config.push({
      type: 'environment_variable',
      name: match[0]
    });
    score += 0.15;
  }
  
  // Configuration keywords
  const configKeywords = [
    'config', 'configuration', 'settings', 'options', 'parameters',
    'environment', 'env', 'variable'
  ];
  
  configKeywords.forEach(keyword => {
    if (content.toLowerCase().includes(keyword)) score += 0.1;
  });
  
  return Math.min(score, 1);
}

/**
 * Separate preservable flow logic from correctable naming references
 * @param {Object} categorizedContent - Content categorized by type
 * @returns {Object} Separated content
 */
export function separateFlowLogicFromNaming(categorizedContent) {
  const preservableContent = [];
  const correctableContent = [];
  
  Object.entries(categorizedContent).forEach(([category, items]) => {
    items.forEach(item => {
      const analysis = categorizeContent(item.content, item.title);
      
      if (analysis.type === 'flow_logic' && analysis.confidence > 0.5) {
        // High-confidence flow logic should be preserved
        preservableContent.push({
          ...item,
          preservationReason: 'flow_logic',
          confidence: analysis.confidence,
          extractedReferences: analysis.extractedReferences
        });
      } else if (Object.keys(analysis.extractedReferences).some(key => 
        analysis.extractedReferences[key].length > 0)) {
        // Content with naming references should be corrected
        correctableContent.push({
          ...item,
          correctionType: analysis.type,
          confidence: analysis.confidence,
          extractedReferences: analysis.extractedReferences
        });
      } else {
        // Mixed or unclear content - preserve but mark for review
        preservableContent.push({
          ...item,
          preservationReason: 'mixed_content',
          confidence: analysis.confidence,
          extractedReferences: analysis.extractedReferences,
          needsReview: true
        });
      }
    });
  });
  
  return {
    preservableContent: preservableContent.sort((a, b) => b.confidence - a.confidence),
    correctableContent: correctableContent.sort((a, b) => b.confidence - a.confidence),
    metadata: {
      totalItems: preservableContent.length + correctableContent.length,
      preservableItems: preservableContent.length,
      correctableItems: correctableContent.length,
      separatedAt: new Date().toISOString()
    }
  };
}

/**
 * Build content categorization system
 * @param {AnalysisDocument[]} documents - Parsed documents
 * @returns {Object} Complete categorization system
 */
export function buildContentCategorizationSystem(documents) {
  const allContent = [];
  
  // Extract all content with metadata
  documents.forEach(doc => {
    doc.sections.forEach(section => {
      const analysis = categorizeContent(section.content, section.title);
      
      allContent.push({
        content: section.content,
        title: section.title,
        sourceDocument: doc.filePath,
        sectionType: section.type,
        level: section.level,
        analysis
      });
    });
  });
  
  // Group by primary category
  const categorizedContent = {};
  allContent.forEach(item => {
    const category = item.analysis.type;
    if (!categorizedContent[category]) {
      categorizedContent[category] = [];
    }
    categorizedContent[category].push(item);
  });
  
  // Separate flow logic from naming references
  const separated = separateFlowLogicFromNaming(categorizedContent);
  
  return {
    categorizedContent,
    separated,
    allContent,
    metadata: {
      totalContent: allContent.length,
      categories: Object.keys(categorizedContent),
      categoryStats: Object.entries(categorizedContent).map(([category, items]) => ({
        category,
        count: items.length,
        avgConfidence: items.reduce((sum, item) => sum + item.analysis.confidence, 0) / items.length
      })),
      processedAt: new Date().toISOString()
    }
  };
}