import { MindMapEngine } from '../core/MindMapEngine.js';
import { ValidationMiddleware } from '../middleware/ValidationMiddleware.js';
import { ResponseFormatter } from '../middleware/ResponseFormatter.js';

/**
 * DocumentHandlers - Handles document intelligence MCP tool requests
 * Part of Phase 7.5: Document Intelligence Integration
 */
export class DocumentHandlers {
  constructor(private mindMap: MindMapEngine) {}

  /**
   * Handle analyze_project_documentation tool request
   */
  async handleAnalyzeProjectDocumentation(params: any) {
    try {
      const analysis = await this.mindMap.analyzeProjectDocumentation();

      return ResponseFormatter.formatSuccessResponse(JSON.stringify({
        analyses: analysis.analyses.map((a: any) => ({
          documentPath: a.documentPath,
          documentType: a.documentType,
          statistics: {
            wordCount: a.structure.metadata.wordCount,
            readingTime: a.structure.metadata.readingTime,
            headerCount: a.structure.headers.length,
            linkCount: a.links.length,
            codeBlockCount: a.structure.codeBlocks.length
          },
          linkAnalysis: {
            totalLinks: a.links.length,
            brokenLinks: a.brokenLinks.length,
            linkTypes: this.groupLinksByType(a.links)
          },
          relationshipCount: a.relationships.length,
          implementationGaps: a.implementationGaps.length
        })),
        summary: {
          totalDocuments: analysis.analyses.length,
          totalWords: analysis.statistics.totalWords,
          averageWordsPerDocument: analysis.statistics.averageWordsPerDocument,
          totalLinks: analysis.statistics.totalLinks,
          brokenLinksPercentage: analysis.statistics.brokenLinksPercentage,
          implementationGapsCount: analysis.statistics.implementationGapsCount,
          documentTypes: analysis.statistics.documentTypeDistribution,
          averageReadingTime: analysis.statistics.averageReadingTime
        },
        relationships: analysis.relationships.slice(0, 20), // Limit to first 20 for readability
        insights: analysis.insights,
        brainInspiredLearning: {
          hebbianConnectionsLearned: analysis.relationships.length,
          documentCodeRelationships: this.groupRelationshipsByType(analysis.relationships)
        }
      }, null, 2));
    } catch (error) {
      throw new Error(`Failed to analyze project documentation: ${error}`);
    }
  }

  /**
   * Handle analyze_document tool request
   */
  async handleAnalyzeDocument(params: any) {
    if (!params.file_path) {
      throw new Error('file_path parameter is required');
    }
    ValidationMiddleware.validateFilePath(params.file_path);

    try {
      const analysis = await this.mindMap.analyzeDocument(params.file_path);

      return ResponseFormatter.formatSuccessResponse(JSON.stringify({
        documentPath: analysis.documentPath,
        documentType: analysis.documentType,
        structure: {
          headers: analysis.structure.headers.map((h: any) => ({
            level: h.level,
            text: h.text,
            lineNumber: h.lineNumber
          })),
          codeBlocks: analysis.structure.codeBlocks.map((cb: any) => ({
            language: cb.language,
            lineRange: `${cb.startLine}-${cb.endLine}`,
            contentPreview: cb.content.substring(0, 100) + (cb.content.length > 100 ? '...' : '')
          })),
          tables: analysis.structure.tables.length,
          metadata: analysis.structure.metadata
        },
        linkAnalysis: {
          totalLinks: analysis.links.length,
          linksByType: this.groupLinksByType(analysis.links),
          brokenLinks: analysis.brokenLinks.map((bl: any) => ({
            text: bl.linkText,
            target: bl.targetPath,
            lineNumber: bl.lineNumber,
            error: bl.validationError
          }))
        },
        relationships: analysis.relationships.map((rel: any) => ({
          targetElement: rel.targetElement,
          relationType: rel.relationType,
          confidence: rel.confidence,
          evidence: rel.evidence,
          extractedFrom: rel.extractedFrom
        })),
        qualityAnalysis: {
          implementationGaps: analysis.implementationGaps,
          documentationDebt: analysis.documentationDebt,
          qualityScore: this.calculateQualityScore(analysis)
        }
      }, null, 2));
    } catch (error) {
      throw new Error(`Failed to analyze document: ${error}`);
    }
  }

  /**
   * Handle get_documentation_statistics tool request
   */
  async handleGetDocumentationStatistics(params: any) {
    try {
      const statistics = await this.mindMap.getDocumentationStatistics();

      return ResponseFormatter.formatSuccessResponse(JSON.stringify({
        overview: {
          totalDocuments: statistics.totalDocuments,
          totalWords: statistics.totalWords,
          averageWordsPerDocument: Math.round(statistics.averageWordsPerDocument),
          totalReadingTimeMinutes: Math.round(statistics.averageReadingTime * statistics.totalDocuments)
        },
        linkAnalysis: {
          totalLinks: statistics.totalLinks,
          brokenLinks: statistics.brokenLinksCount,
          brokenLinksPercentage: Math.round(statistics.brokenLinksPercentage * 100) / 100,
          linkHealthScore: Math.max(0, 100 - statistics.brokenLinksPercentage)
        },
        implementationAnalysis: {
          implementationGaps: statistics.implementationGapsCount,
          gapDensity: statistics.totalDocuments > 0 ?
            Math.round((statistics.implementationGapsCount / statistics.totalDocuments) * 100) / 100 : 0
        },
        documentDistribution: statistics.documentTypeDistribution,
        qualityMetrics: {
          averageReadingTime: Math.round(statistics.averageReadingTime * 100) / 100,
          documentationMaturity: this.calculateDocumentationMaturity(statistics)
        }
      }, null, 2));
    } catch (error) {
      throw new Error(`Failed to get documentation statistics: ${error}`);
    }
  }

  /**
   * Handle get_documentation_insights tool request
   */
  async handleGetDocumentationInsights(params: any) {
    try {
      const insights = await this.mindMap.getDocumentationInsights();

      const categorizedInsights = {
        coverage: insights.filter((i: any) => i.type === 'coverage'),
        quality: insights.filter((i: any) => i.type === 'quality'),
        gapAnalysis: insights.filter((i: any) => i.type === 'gap_analysis'),
        structure: insights.filter((i: any) => i.type === 'structure'),
        freshness: insights.filter((i: any) => i.type === 'freshness')
      };

      const prioritizedRecommendations = insights
        .flatMap((i: any) => i.recommendations.map((rec: string) => ({
          recommendation: rec,
          priority: i.severity,
          category: i.type,
          confidence: i.confidence
        })))
        .sort((a: any, b: any) => {
          const priorityOrder = { high: 3, medium: 2, low: 1 };
          return priorityOrder[b.priority as keyof typeof priorityOrder] - priorityOrder[a.priority as keyof typeof priorityOrder];
        })
        .slice(0, 10);

      return ResponseFormatter.formatSuccessResponse(JSON.stringify({
        summary: {
          totalInsights: insights.length,
          highPriorityIssues: insights.filter((i: any) => i.severity === 'high').length,
          mediumPriorityIssues: insights.filter((i: any) => i.severity === 'medium').length,
          lowPriorityIssues: insights.filter((i: any) => i.severity === 'low').length
        },
        insights: categorizedInsights,
        prioritizedRecommendations,
        actionPlan: this.generateActionPlan(insights)
      }, null, 2));
    } catch (error) {
      throw new Error(`Failed to get documentation insights: ${error}`);
    }
  }

  /**
   * Handle get_document_relationships tool request
   */
  async handleGetDocumentRelationships(params: any) {
    try {
      const relationships = await this.mindMap.getDocumentRelationships();

      const relationshipsByType = this.groupRelationshipsByType(relationships);
      const documentCoverage = this.calculateDocumentCoverage(relationships);
      const strongestRelationships = relationships
        .sort((a: any, b: any) => b.confidence - a.confidence)
        .slice(0, 20);

      return ResponseFormatter.formatSuccessResponse(JSON.stringify({
        summary: {
          totalRelationships: relationships.length,
          relationshipTypes: Object.keys(relationshipsByType),
          documentsCovered: documentCoverage.documentsWithRelationships,
          coveragePercentage: documentCoverage.coveragePercentage
        },
        relationshipsByType,
        strongestRelationships: strongestRelationships.map((rel: any) => ({
          sourceDocument: rel.sourceDoc,
          targetElement: rel.targetElement,
          relationType: rel.relationType,
          confidence: Math.round(rel.confidence * 100) / 100,
          evidence: rel.evidence.slice(0, 2), // Limit evidence for readability
          extractedFrom: rel.extractedFrom
        })),
        documentCoverage,
        networkAnalysis: {
          documentsAsNodes: this.getUniqueDocuments(relationships).length,
          codeElementsAsNodes: this.getUniqueCodeElements(relationships).length,
          averageRelationshipsPerDocument: relationships.length / this.getUniqueDocuments(relationships).length || 0
        }
      }, null, 2));
    } catch (error) {
      throw new Error(`Failed to get document relationships: ${error}`);
    }
  }

  // Helper methods
  private groupLinksByType(links: any[]): Record<string, number> {
    return links.reduce((acc, link) => {
      acc[link.linkType] = (acc[link.linkType] || 0) + 1;
      return acc;
    }, {});
  }

  private groupRelationshipsByType(relationships: any[]): Record<string, number> {
    return relationships.reduce((acc, rel) => {
      acc[rel.relationType] = (acc[rel.relationType] || 0) + 1;
      return acc;
    }, {});
  }

  private calculateQualityScore(analysis: any): number {
    let score = 100;

    // Deduct for broken links
    const brokenLinkRatio = analysis.brokenLinks.length / Math.max(analysis.links.length, 1);
    score -= brokenLinkRatio * 30;

    // Deduct for implementation gaps
    score -= analysis.implementationGaps.length * 5;

    // Deduct for documentation debt
    score -= analysis.documentationDebt.length * 3;

    return Math.max(0, Math.round(score));
  }

  private calculateDocumentationMaturity(statistics: any): string {
    const brokenLinkRatio = statistics.brokenLinksPercentage / 100;
    const gapRatio = statistics.implementationGapsCount / Math.max(statistics.totalDocuments, 1);

    if (brokenLinkRatio < 0.05 && gapRatio < 0.1) return 'Excellent';
    if (brokenLinkRatio < 0.15 && gapRatio < 0.3) return 'Good';
    if (brokenLinkRatio < 0.3 && gapRatio < 0.5) return 'Fair';
    return 'Needs Improvement';
  }

  private generateActionPlan(insights: any[]): any[] {
    const highPriority = insights.filter(i => i.severity === 'high');
    const mediumPriority = insights.filter(i => i.severity === 'medium');

    const plan: any[] = [];

    if (highPriority.length > 0) {
      plan.push({
        phase: 'Immediate (High Priority)',
        items: highPriority.flatMap(i => i.recommendations).slice(0, 5)
      });
    }

    if (mediumPriority.length > 0) {
      plan.push({
        phase: 'Near Term (Medium Priority)',
        items: mediumPriority.flatMap(i => i.recommendations).slice(0, 5)
      });
    }

    return plan;
  }

  private calculateDocumentCoverage(relationships: any[]): any {
    const uniqueDocs = this.getUniqueDocuments(relationships);
    // This would need actual document count from the project
    const estimatedTotalDocs = Math.max(uniqueDocs.length, 10); // Placeholder

    return {
      documentsWithRelationships: uniqueDocs.length,
      estimatedTotalDocuments: estimatedTotalDocs,
      coveragePercentage: Math.round((uniqueDocs.length / estimatedTotalDocs) * 100)
    };
  }

  private getUniqueDocuments(relationships: any[]): string[] {
    return [...new Set(relationships.map(rel => rel.sourceDoc))];
  }

  private getUniqueCodeElements(relationships: any[]): string[] {
    return [...new Set(relationships.map(rel => rel.targetElement))];
  }
}