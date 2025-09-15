import { MindMapStorage } from '../MindMapStorage.js';
import { MarkdownAnalyzer } from '../MarkdownAnalyzer.js';
import { HebbianLearningSystem } from '../HebbianLearningSystem.js';
import { HierarchicalContextSystem } from '../HierarchicalContextSystem.js';
import { BiTemporalKnowledgeModel } from '../BiTemporalKnowledgeModel.js';
import { PatternPredictionEngine } from '../PatternPredictionEngine.js';
import * as fs from 'fs/promises';
import * as path from 'path';
import {
  DocumentAnalysis,
  DocumentStructure,
  DocumentLink,
  DocumentRelationship,
  MultiFormatDocument,
  MindMapNode,
  MindMapEdge
} from '../../types/index.js';

/**
 * DocumentIntelligenceService - Comprehensive document analysis and intelligence
 * Part of Phase 7.5: Document Intelligence Integration
 */
export class DocumentIntelligenceService {
  private markdownAnalyzer: MarkdownAnalyzer;
  private documentCache: Map<string, DocumentAnalysis> = new Map();

  constructor(
    private storage: MindMapStorage,
    private hebbianLearning: HebbianLearningSystem,
    private hierarchicalContext: HierarchicalContextSystem,
    private biTemporalModel: BiTemporalKnowledgeModel,
    private patternPrediction: PatternPredictionEngine,
    private projectRoot: string
  ) {
    this.markdownAnalyzer = new MarkdownAnalyzer(projectRoot);
  }

  /**
   * Analyze all documentation files in the project
   */
  async analyzeProjectDocumentation(): Promise<{
    analyses: DocumentAnalysis[];
    statistics: DocumentationStatistics;
    relationships: DocumentRelationship[];
    insights: DocumentationInsight[];
  }> {
    const documentFiles = await this.findDocumentFiles();
    const analyses: DocumentAnalysis[] = [];
    const allRelationships: DocumentRelationship[] = [];

    // Analyze each document
    for (const filePath of documentFiles) {
      try {
        const analysis = await this.analyzeDocument(filePath);
        analyses.push(analysis);
        allRelationships.push(...analysis.relationships);

        // Cache the analysis
        this.documentCache.set(filePath, analysis);
      } catch (error) {
        console.warn(`Failed to analyze document ${filePath}:`, error);
      }
    }

    // Generate statistics
    const statistics = this.generateDocumentationStatistics(analyses);

    // Generate insights
    const insights = await this.generateDocumentationInsights(analyses, allRelationships);

    // Update mind map with document analysis
    await this.updateMindMapWithDocuments(analyses);

    // Learn document-code relationships with Hebbian learning
    await this.learnDocumentCodeRelationships(allRelationships);

    return {
      analyses,
      statistics,
      relationships: allRelationships,
      insights
    };
  }

  /**
   * Analyze a single document file
   */
  async analyzeDocument(filePath: string): Promise<DocumentAnalysis> {
    // Check cache first
    if (this.documentCache.has(filePath)) {
      return this.documentCache.get(filePath)!;
    }

    const extension = path.extname(filePath).toLowerCase();

    switch (extension) {
      case '.md':
        return await this.markdownAnalyzer.analyzeMarkdownFile(filePath);
      case '.rst':
        return await this.analyzeRestructuredText(filePath);
      case '.txt':
        return await this.analyzePlainText(filePath);
      case '.json':
      case '.yaml':
      case '.yml':
      case '.toml':
        return await this.analyzeStructuredDocument(filePath);
      default:
        throw new Error(`Unsupported document type: ${extension}`);
    }
  }

  /**
   * Find documentation files in the project
   */
  private async findDocumentFiles(): Promise<string[]> {
    const documentPatterns = [
      '**/*.md',
      '**/*.rst',
      '**/*.txt',
      '**/README*',
      '**/CHANGELOG*',
      '**/CONTRIBUTING*',
      '**/LICENSE*',
      '**/*.json',
      '**/*.yaml',
      '**/*.yml',
      '**/*.toml'
    ];

    const files: string[] = [];
    const graph = await this.storage.getGraph();

    // Get all file nodes and filter for documentation
    for (const [nodeId, node] of graph.nodes) {
      if (node.type === 'file' && node.path) {
        const isDocumentFile = documentPatterns.some(pattern => {
          const regex = new RegExp(pattern.replace(/\*\*/g, '.*').replace(/\*/g, '[^/]*'));
          return regex.test(node.path!);
        });

        if (isDocumentFile) {
          files.push(node.path);
        }
      }
    }

    return files;
  }

  /**
   * Analyze RestructuredText documents
   */
  private async analyzeRestructuredText(filePath: string): Promise<DocumentAnalysis> {
    const content = await fs.readFile(filePath, 'utf-8');
    const lines = content.split('\n');

    // Basic RST parsing (simplified)
    const structure: DocumentStructure = {
      headers: this.extractRstHeaders(lines),
      links: this.extractRstLinks(lines),
      codeBlocks: this.extractRstCodeBlocks(lines),
      tables: [],
      metadata: {
        wordCount: content.split(/\s+/).length,
        readingTime: Math.ceil(content.split(/\s+/).length / 250)
      }
    };

    return {
      documentPath: filePath,
      documentType: 'restructured_text',
      structure,
      links: [],
      relationships: [],
      brokenLinks: [],
      implementationGaps: [],
      documentationDebt: []
    };
  }

  /**
   * Analyze plain text documents
   */
  private async analyzePlainText(filePath: string): Promise<DocumentAnalysis> {
    const content = await fs.readFile(filePath, 'utf-8');

    const structure: DocumentStructure = {
      headers: [],
      links: [],
      codeBlocks: [],
      tables: [],
      metadata: {
        wordCount: content.split(/\s+/).length,
        readingTime: Math.ceil(content.split(/\s+/).length / 250)
      }
    };

    return {
      documentPath: filePath,
      documentType: 'plain_text',
      structure,
      links: [],
      relationships: [],
      brokenLinks: [],
      implementationGaps: [],
      documentationDebt: []
    };
  }

  /**
   * Analyze structured documents (JSON, YAML, TOML)
   */
  private async analyzeStructuredDocument(filePath: string): Promise<DocumentAnalysis> {
    const content = await fs.readFile(filePath, 'utf-8');
    const extension = path.extname(filePath).toLowerCase();

    let data: any;
    let format: MultiFormatDocument['format'];

    try {
      switch (extension) {
        case '.json':
          data = JSON.parse(content);
          format = 'json';
          break;
        case '.yaml':
        case '.yml':
          // For now, treat as JSON structure
          data = { content: 'YAML content (parser not implemented)' };
          format = 'yaml';
          break;
        case '.toml':
          data = { content: 'TOML content (parser not implemented)' };
          format = 'toml';
          break;
        default:
          throw new Error(`Unsupported format: ${extension}`);
      }
    } catch (error) {
      data = { error: 'Failed to parse', content };
      format = 'json';
    }

    const relationships = await this.extractConfigurationRelationships(filePath, data);

    const structure: DocumentStructure = {
      headers: [],
      links: [],
      codeBlocks: [],
      tables: [],
      metadata: {
        wordCount: content.split(/\s+/).length,
        readingTime: Math.ceil(content.split(/\s+/).length / 250)
      }
    };

    return {
      documentPath: filePath,
      documentType: 'plain_text', // Treating structured docs as plain text for now
      structure,
      links: [],
      relationships,
      brokenLinks: [],
      implementationGaps: [],
      documentationDebt: []
    };
  }

  /**
   * Extract configuration relationships from structured documents
   */
  private async extractConfigurationRelationships(
    filePath: string,
    data: any
  ): Promise<DocumentRelationship[]> {
    const relationships: DocumentRelationship[] = [];

    // Look for common configuration patterns
    if (path.basename(filePath) === 'package.json') {
      // Extract dependencies
      const deps = { ...data.dependencies, ...data.devDependencies };
      for (const [dep, version] of Object.entries(deps || {})) {
        relationships.push({
          sourceDoc: filePath,
          targetElement: dep,
          relationType: 'configures',
          confidence: 0.9,
          evidence: [`Package dependency: ${dep}@${version}`],
          extractedFrom: 'content'
        });
      }

      // Extract scripts
      for (const [script, command] of Object.entries(data.scripts || {})) {
        relationships.push({
          sourceDoc: filePath,
          targetElement: script,
          relationType: 'configures',
          confidence: 0.8,
          evidence: [`NPM script: ${script} -> ${command}`],
          extractedFrom: 'content'
        });
      }
    }

    return relationships;
  }

  /**
   * Update mind map with document nodes and relationships
   */
  private async updateMindMapWithDocuments(analyses: DocumentAnalysis[]): Promise<void> {
    const allNodes: MindMapNode[] = [];
    const allEdges: MindMapEdge[] = [];

    for (const analysis of analyses) {
      const { nodes, edges } = await this.markdownAnalyzer.generateMindMapNodes(analysis);
      allNodes.push(...nodes);
      allEdges.push(...edges);

      // Create relationships between documents and code files
      for (const relationship of analysis.relationships) {
        const edge: MindMapEdge = {
          id: `edge:doc_rel:${relationship.sourceDoc}:${relationship.targetElement}`,
          source: `doc:${relationship.sourceDoc}`,
          target: `file:${relationship.targetElement}`,
          type: relationship.relationType as any,
          confidence: relationship.confidence,
          metadata: {
            extractedFrom: relationship.extractedFrom,
            evidence: relationship.evidence
          },
          lastUpdated: new Date()
        };
        allEdges.push(edge);
      }
    }

    // Add all nodes and edges to storage
    for (const node of allNodes) {
      await this.storage.addNode(node);
    }

    for (const edge of allEdges) {
      await this.storage.addEdge(edge);
    }
  }

  /**
   * Learn document-code relationships using Hebbian learning
   */
  private async learnDocumentCodeRelationships(relationships: DocumentRelationship[]): Promise<void> {
    for (const rel of relationships) {
      const sourceId = `doc:${rel.sourceDoc}`;
      const targetId = `file:${rel.targetElement}`;

      // Record co-activation for Hebbian learning
      await this.hebbianLearning.recordCoActivation(
        sourceId,
        [targetId],
        `Documentation relationship: ${rel.relationType}`,
        rel.confidence
      );
    }
  }

  /**
   * Generate documentation statistics
   */
  private generateDocumentationStatistics(analyses: DocumentAnalysis[]): DocumentationStatistics {
    const totalDocs = analyses.length;
    const totalWords = analyses.reduce((sum, a) => sum + a.structure.metadata.wordCount, 0);
    const totalLinks = analyses.reduce((sum, a) => sum + a.links.length, 0);
    const brokenLinks = analyses.reduce((sum, a) => sum + a.brokenLinks.length, 0);
    const implementationGaps = analyses.reduce((sum, a) => sum + a.implementationGaps.length, 0);

    const docTypes = analyses.reduce((counts, a) => {
      counts[a.documentType] = (counts[a.documentType] || 0) + 1;
      return counts;
    }, {} as Record<string, number>);

    return {
      totalDocuments: totalDocs,
      totalWords,
      averageWordsPerDocument: totalWords / totalDocs || 0,
      totalLinks,
      brokenLinksCount: brokenLinks,
      brokenLinksPercentage: totalLinks > 0 ? (brokenLinks / totalLinks) * 100 : 0,
      implementationGapsCount: implementationGaps,
      documentTypeDistribution: docTypes,
      averageReadingTime: analyses.reduce((sum, a) => sum + a.structure.metadata.readingTime, 0) / totalDocs || 0
    };
  }

  /**
   * Generate documentation insights
   */
  private async generateDocumentationInsights(
    analyses: DocumentAnalysis[],
    relationships: DocumentRelationship[]
  ): Promise<DocumentationInsight[]> {
    const insights: DocumentationInsight[] = [];

    // Analyze documentation coverage
    const codeFiles = await this.getCodeFileCount();
    const documentedFiles = new Set(relationships.map(r => r.targetElement)).size;
    const coveragePercentage = codeFiles > 0 ? (documentedFiles / codeFiles) * 100 : 0;

    insights.push({
      type: 'coverage',
      title: 'Documentation Coverage',
      description: `${coveragePercentage.toFixed(1)}% of code files have documentation`,
      severity: coveragePercentage < 50 ? 'high' : coveragePercentage < 80 ? 'medium' : 'low',
      recommendations: coveragePercentage < 80 ? [
        'Consider adding README files for major components',
        'Document public APIs and interfaces',
        'Add inline code comments for complex logic'
      ] : ['Maintain current documentation standards'],
      affectedFiles: [],
      confidence: 0.9
    });

    // Analyze broken links
    const totalBrokenLinks = analyses.reduce((sum, a) => sum + a.brokenLinks.length, 0);
    if (totalBrokenLinks > 0) {
      insights.push({
        type: 'quality',
        title: 'Broken Links Detected',
        description: `Found ${totalBrokenLinks} broken links across documentation`,
        severity: totalBrokenLinks > 10 ? 'high' : totalBrokenLinks > 5 ? 'medium' : 'low',
        recommendations: [
          'Review and fix broken internal links',
          'Validate external URLs',
          'Set up automated link checking'
        ],
        affectedFiles: analyses.filter(a => a.brokenLinks.length > 0).map(a => a.documentPath),
        confidence: 1.0
      });
    }

    // Analyze implementation gaps
    const totalGaps = analyses.reduce((sum, a) => sum + a.implementationGaps.length, 0);
    if (totalGaps > 0) {
      insights.push({
        type: 'gap_analysis',
        title: 'Implementation Gaps',
        description: `Found ${totalGaps} documented features without implementation`,
        severity: 'medium',
        recommendations: [
          'Review documented features for implementation status',
          'Update documentation to reflect current implementation',
          'Prioritize implementation of missing features'
        ],
        affectedFiles: analyses.filter(a => a.implementationGaps.length > 0).map(a => a.documentPath),
        confidence: 0.7
      });
    }

    return insights;
  }

  /**
   * Get count of code files for coverage calculation
   */
  private async getCodeFileCount(): Promise<number> {
    const graph = await this.storage.getGraph();
    const codeExtensions = ['.ts', '.js', '.py', '.java', '.go', '.rs', '.cpp', '.c', '.h', '.hpp'];

    let count = 0;
    for (const [nodeId, node] of graph.nodes) {
      if (node.type === 'file' && node.path) {
        const ext = path.extname(node.path).toLowerCase();
        if (codeExtensions.includes(ext)) {
          count++;
        }
      }
    }

    return count;
  }

  // Helper methods for RST parsing
  private extractRstHeaders(lines: string[]): DocumentStructure['headers'] {
    const headers: DocumentStructure['headers'] = [];

    for (let i = 0; i < lines.length - 1; i++) {
      const line = lines[i].trim();
      const nextLine = lines[i + 1]?.trim() || '';

      // RST headers are underlined with special characters
      if (line && nextLine && /^[=\-`:"'~^_*+#<>]+$/.test(nextLine) && nextLine.length >= line.length) {
        const level = this.getRstHeaderLevel(nextLine[0]);
        headers.push({
          level,
          text: line,
          lineNumber: i + 1
        });
      }
    }

    return headers;
  }

  private getRstHeaderLevel(char: string): number {
    const levels = { '=': 1, '-': 2, '`': 3, ':': 4, "'": 5, '"': 6 };
    return levels[char as keyof typeof levels] || 6;
  }

  private extractRstLinks(lines: string[]): DocumentStructure['links'] {
    const links: DocumentStructure['links'] = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      // RST external links: `Link text <URL>`_
      const linkMatches = line.matchAll(/`([^<]+)<([^>]+)>`_/g);
      for (const match of linkMatches) {
        const [, text, url] = match;
        links.push({
          type: url.startsWith('http') ? 'external' : 'internal',
          url,
          text: text.trim(),
          lineNumber: i + 1
        });
      }
    }

    return links;
  }

  private extractRstCodeBlocks(lines: string[]): DocumentStructure['codeBlocks'] {
    const codeBlocks: DocumentStructure['codeBlocks'] = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      // RST code blocks: .. code-block:: language
      if (line.trim().startsWith('.. code-block::')) {
        const language = line.split('::')[1]?.trim();
        let content = '';
        let j = i + 1;

        // Skip empty line after directive
        if (j < lines.length && lines[j].trim() === '') {
          j++;
        }

        // Collect indented lines
        while (j < lines.length && (lines[j].startsWith('   ') || lines[j].trim() === '')) {
          content += lines[j].substring(3) + '\n';
          j++;
        }

        if (content.trim()) {
          codeBlocks.push({
            language,
            content: content.trim(),
            lineNumber: i + 1,
            startLine: i + 1,
            endLine: j
          });
        }
      }
    }

    return codeBlocks;
  }
}

// Additional types for documentation analysis
export interface DocumentationStatistics {
  totalDocuments: number;
  totalWords: number;
  averageWordsPerDocument: number;
  totalLinks: number;
  brokenLinksCount: number;
  brokenLinksPercentage: number;
  implementationGapsCount: number;
  documentTypeDistribution: Record<string, number>;
  averageReadingTime: number;
}

export interface DocumentationInsight {
  type: 'coverage' | 'quality' | 'gap_analysis' | 'structure' | 'freshness';
  title: string;
  description: string;
  severity: 'low' | 'medium' | 'high';
  recommendations: string[];
  affectedFiles: string[];
  confidence: number;
}