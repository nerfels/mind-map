import * as fs from 'fs';
import * as path from 'path';
import { DocumentStructure, DocumentLink, DocumentRelationship, DocumentAnalysis, MindMapNode, MindMapEdge } from '../types/index.js';

/**
 * MarkdownAnalyzer - Analyzes Markdown documents for structure, links, and code relationships
 * Part of Phase 7.5: Document Intelligence Integration
 */
export class MarkdownAnalyzer {
  private projectRoot: string;

  constructor(projectRoot: string) {
    this.projectRoot = projectRoot;
  }

  /**
   * Analyze a markdown file and extract structure, links, and relationships
   */
  async analyzeMarkdownFile(filePath: string): Promise<DocumentAnalysis> {
    const content = await fs.promises.readFile(filePath, 'utf-8');
    const lines = content.split('\n');

    const structure = this.extractDocumentStructure(lines);
    const links = this.extractLinks(lines, filePath);
    const relationships = await this.extractCodeRelationships(content, filePath, links);
    const brokenLinks = await this.validateLinks(links);
    const implementationGaps = this.detectImplementationGaps(structure, relationships);
    const documentationDebt = this.assessDocumentationDebt(relationships);

    return {
      documentPath: filePath,
      documentType: 'markdown',
      structure,
      links,
      relationships,
      brokenLinks,
      implementationGaps,
      documentationDebt
    };
  }

  /**
   * Extract document structure (headers, code blocks, tables)
   */
  private extractDocumentStructure(lines: string[]): DocumentStructure {
    const headers: DocumentStructure['headers'] = [];
    const links: DocumentStructure['links'] = [];
    const codeBlocks: DocumentStructure['codeBlocks'] = [];
    const tables: DocumentStructure['tables'] = [];

    let inCodeBlock = false;
    let currentCodeBlock: any = null;
    let inTable = false;
    let currentTable: any = null;
    let wordCount = 0;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const lineNumber = i + 1;

      // Extract headers
      const headerMatch = line.match(/^(#{1,6})\s+(.+)/);
      if (headerMatch) {
        const level = headerMatch[1].length;
        const text = headerMatch[2].trim();
        const id = this.generateHeaderId(text);
        headers.push({ level, text, id, lineNumber });
      }

      // Extract code blocks
      if (line.startsWith('```')) {
        if (!inCodeBlock) {
          const language = line.substring(3).trim() || undefined;
          currentCodeBlock = {
            language,
            content: '',
            lineNumber,
            startLine: lineNumber,
            endLine: lineNumber
          };
          inCodeBlock = true;
        } else {
          currentCodeBlock.endLine = lineNumber;
          codeBlocks.push(currentCodeBlock);
          inCodeBlock = false;
          currentCodeBlock = null;
        }
      } else if (inCodeBlock && currentCodeBlock) {
        currentCodeBlock.content += line + '\n';
      }

      // Extract inline links
      const linkMatches = line.matchAll(/\[([^\]]+)\]\(([^)]+)\)/g);
      for (const match of linkMatches) {
        const [, text, url] = match;
        const linkType = this.determineLinkType(url);
        links.push({
          type: linkType,
          url,
          text,
          lineNumber
        });
      }

      // Extract tables
      if (line.includes('|') && line.trim() !== '') {
        if (!inTable) {
          currentTable = {
            headers: this.parseTableRow(line),
            rows: [],
            lineNumber
          };
          inTable = true;
        } else if (!line.includes('---')) {
          currentTable.rows.push(this.parseTableRow(line));
        }
      } else if (inTable && currentTable) {
        tables.push(currentTable);
        inTable = false;
        currentTable = null;
      }

      // Count words
      wordCount += line.split(/\s+/).filter(word => word.length > 0).length;
    }

    // Handle unclosed code block
    if (inCodeBlock && currentCodeBlock) {
      currentCodeBlock.endLine = lines.length;
      codeBlocks.push(currentCodeBlock);
    }

    // Handle unclosed table
    if (inTable && currentTable) {
      tables.push(currentTable);
    }

    const readingTime = Math.ceil(wordCount / 250); // Average reading speed

    return {
      headers,
      links,
      codeBlocks,
      tables,
      metadata: {
        title: this.extractTitle(headers),
        wordCount,
        readingTime
      }
    };
  }

  /**
   * Extract and categorize links from the document
   */
  private extractLinks(lines: string[], filePath: string): DocumentLink[] {
    const links: DocumentLink[] = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const lineNumber = i + 1;

      // Extract markdown links
      const linkMatches = line.matchAll(/\[([^\]]+)\]\(([^)]+)\)/g);
      for (const match of linkMatches) {
        const [fullMatch, text, url] = match;
        const context = this.extractContext(line, fullMatch);

        links.push({
          id: `${filePath}:${lineNumber}:${match.index}`,
          sourceDocument: filePath,
          targetPath: url,
          linkType: this.determineLinkType(url),
          linkText: text,
          context,
          lineNumber,
          confidence: 0.9,
          isValid: true // Will be validated later
        });
      }

      // Extract reference-style links
      const refLinkMatches = line.matchAll(/\[([^\]]+)\]\[([^\]]*)\]/g);
      for (const match of refLinkMatches) {
        const [fullMatch, text, ref] = match;
        const context = this.extractContext(line, fullMatch);

        links.push({
          id: `${filePath}:${lineNumber}:${match.index}`,
          sourceDocument: filePath,
          targetPath: ref || text, // Reference to be resolved later
          linkType: 'internal',
          linkText: text,
          context,
          lineNumber,
          confidence: 0.8,
          isValid: true
        });
      }

      // Extract auto-links
      const autoLinkMatches = line.matchAll(/<(https?:\/\/[^>]+)>/g);
      for (const match of autoLinkMatches) {
        const [fullMatch, url] = match;
        const context = this.extractContext(line, fullMatch);

        links.push({
          id: `${filePath}:${lineNumber}:${match.index}`,
          sourceDocument: filePath,
          targetPath: url,
          linkType: 'external',
          linkText: url,
          context,
          lineNumber,
          confidence: 1.0,
          isValid: true
        });
      }
    }

    return links;
  }

  /**
   * Extract relationships between documentation and code
   */
  private async extractCodeRelationships(
    content: string,
    filePath: string,
    links: DocumentLink[]
  ): Promise<DocumentRelationship[]> {
    const relationships: DocumentRelationship[] = [];

    // Analyze code references in content
    const codeReferences = this.findCodeReferences(content);
    for (const ref of codeReferences) {
      relationships.push({
        sourceDoc: filePath,
        targetElement: ref.target,
        relationType: ref.type,
        confidence: ref.confidence,
        evidence: ref.evidence,
        extractedFrom: 'content'
      });
    }

    // Analyze links to source files
    for (const link of links) {
      if (link.linkType === 'code') {
        const targetPath = this.resolveRelativePath(link.targetPath, filePath);
        if (await this.fileExists(targetPath)) {
          relationships.push({
            sourceDoc: filePath,
            targetElement: targetPath,
            relationType: 'documents',
            confidence: 0.9,
            evidence: [`Linked in markdown: "${link.linkText}"`],
            extractedFrom: 'link'
          });
        }
      }
    }

    // Analyze filename-based relationships
    const filenameRelationships = this.extractFilenameRelationships(filePath);
    relationships.push(...filenameRelationships);

    return relationships;
  }

  /**
   * Find code references in markdown content
   */
  private findCodeReferences(content: string): Array<{
    target: string;
    type: 'documents' | 'references' | 'implements' | 'describes';
    confidence: number;
    evidence: string[];
  }> {
    const references: Array<{
      target: string;
      type: 'documents' | 'references' | 'implements' | 'describes';
      confidence: number;
      evidence: string[];
    }> = [];

    // Look for function/class/method names in backticks
    const codeSpanMatches = content.matchAll(/`([a-zA-Z_][a-zA-Z0-9_]*(?:\.[a-zA-Z_][a-zA-Z0-9_]*)*)`/g);
    for (const match of codeSpanMatches) {
      const [fullMatch, identifier] = match;
      references.push({
        target: identifier,
        type: 'references',
        confidence: 0.7,
        evidence: [`Code reference: ${fullMatch}`]
      });
    }

    // Look for API endpoint patterns
    const apiMatches = content.matchAll(/(?:GET|POST|PUT|DELETE|PATCH)\s+([\/\w\-{}:]+)/g);
    for (const match of apiMatches) {
      const [fullMatch, endpoint] = match;
      references.push({
        target: endpoint,
        type: 'describes',
        confidence: 0.8,
        evidence: [`API endpoint: ${fullMatch}`]
      });
    }

    // Look for configuration references
    const configMatches = content.matchAll(/(?:config|configuration|setting).*?`([^`]+)`/gi);
    for (const match of configMatches) {
      const [fullMatch, configName] = match;
      references.push({
        target: configName,
        type: 'describes',
        confidence: 0.6,
        evidence: [`Configuration reference: ${fullMatch}`]
      });
    }

    return references;
  }

  /**
   * Validate links and identify broken ones
   */
  private async validateLinks(links: DocumentLink[]): Promise<DocumentLink[]> {
    const brokenLinks: DocumentLink[] = [];

    for (const link of links) {
      let isValid = true;
      let validationError: string | undefined;

      if (link.linkType === 'internal' || link.linkType === 'code' || link.linkType === 'document') {
        const resolvedPath = this.resolveRelativePath(link.targetPath, link.sourceDocument);
        if (!(await this.fileExists(resolvedPath))) {
          isValid = false;
          validationError = `File not found: ${resolvedPath}`;
        }
      } else if (link.linkType === 'external') {
        // For external links, we'd need to make HTTP requests
        // For now, just check if it's a well-formed URL
        try {
          new URL(link.targetPath);
        } catch {
          isValid = false;
          validationError = 'Invalid URL format';
        }
      }

      link.isValid = isValid;
      if (!isValid) {
        link.validationError = validationError;
        brokenLinks.push(link);
      }
    }

    return brokenLinks;
  }

  /**
   * Detect implementation gaps (documented features without code)
   */
  private detectImplementationGaps(
    structure: DocumentStructure,
    relationships: DocumentRelationship[]
  ): Array<{
    description: string;
    documentedFeature: string;
    missingImplementation: string[];
    confidence: number;
  }> {
    const gaps: Array<{
      description: string;
      documentedFeature: string;
      missingImplementation: string[];
      confidence: number;
    }> = [];

    // Look for features mentioned in headers that don't have code relationships
    for (const header of structure.headers) {
      const headerText = header.text.toLowerCase();

      // Check if this header describes a feature
      if (this.isFeatureHeader(headerText)) {
        const hasImplementation = relationships.some(rel =>
          rel.relationType === 'implements' ||
          rel.relationType === 'references'
        );

        if (!hasImplementation) {
          gaps.push({
            description: `Feature "${header.text}" is documented but no implementing code found`,
            documentedFeature: header.text,
            missingImplementation: ['No code references found'],
            confidence: 0.6
          });
        }
      }
    }

    return gaps;
  }

  /**
   * Assess documentation debt (code without documentation)
   */
  private assessDocumentationDebt(relationships: DocumentRelationship[]): Array<{
    codeElement: string;
    missingDocumentation: string;
    severity: 'low' | 'medium' | 'high';
  }> {
    // This would require cross-referencing with actual code analysis
    // For now, return empty array as this needs integration with code analyzers
    return [];
  }

  /**
   * Generate mind map nodes and edges for document analysis
   */
  async generateMindMapNodes(analysis: DocumentAnalysis): Promise<{
    nodes: MindMapNode[];
    edges: MindMapEdge[];
  }> {
    const nodes: MindMapNode[] = [];
    const edges: MindMapEdge[] = [];

    // Create document node
    const docNode: MindMapNode = {
      id: `doc:${analysis.documentPath}`,
      type: 'document',
      name: path.basename(analysis.documentPath),
      path: analysis.documentPath,
      metadata: {
        documentType: analysis.documentType,
        wordCount: analysis.structure.metadata.wordCount,
        readingTime: analysis.structure.metadata.readingTime,
        headerCount: analysis.structure.headers.length,
        linkCount: analysis.links.length,
        codeBlockCount: analysis.structure.codeBlocks.length,
        brokenLinkCount: analysis.brokenLinks.length,
        implementationGapCount: analysis.implementationGaps.length
      },
      confidence: 0.9,
      lastUpdated: new Date(),
      frameworks: this.extractFrameworksFromContent(analysis)
    };
    nodes.push(docNode);

    // Create section nodes for headers
    for (const header of analysis.structure.headers) {
      const sectionNode: MindMapNode = {
        id: `section:${analysis.documentPath}:${header.lineNumber}`,
        type: 'section',
        name: header.text,
        path: analysis.documentPath,
        metadata: {
          level: header.level,
          lineNumber: header.lineNumber,
          headerId: header.id
        },
        confidence: 0.8,
        lastUpdated: new Date()
      };
      nodes.push(sectionNode);

      // Create edge from document to section
      edges.push({
        id: `edge:${docNode.id}:${sectionNode.id}`,
        source: docNode.id,
        target: sectionNode.id,
        type: 'contains',
        confidence: 0.9,
        lastUpdated: new Date()
      });
    }

    // Create link nodes for important links
    for (const link of analysis.links) {
      if (link.linkType === 'code' || link.linkType === 'document') {
        const linkNode: MindMapNode = {
          id: `link:${link.id}`,
          type: 'link',
          name: link.linkText,
          metadata: {
            linkType: link.linkType,
            targetPath: link.targetPath,
            isValid: link.isValid,
            lineNumber: link.lineNumber,
            context: link.context
          },
          confidence: link.confidence,
          lastUpdated: new Date()
        };
        nodes.push(linkNode);

        // Create edge from document to link
        edges.push({
          id: `edge:${docNode.id}:${linkNode.id}`,
          source: docNode.id,
          target: linkNode.id,
          type: 'links_to',
          confidence: link.confidence,
          lastUpdated: new Date()
        });
      }
    }

    return { nodes, edges };
  }

  // Helper methods
  private determineLinkType(url: string): 'internal' | 'external' | 'code' | 'image' | 'document' {
    if (url.startsWith('http://') || url.startsWith('https://')) {
      return 'external';
    }
    if (url.match(/\.(png|jpg|jpeg|gif|svg|webp)$/i)) {
      return 'image';
    }
    if (url.match(/\.(js|ts|py|java|go|rs|cpp|c|h|hpp)$/i)) {
      return 'code';
    }
    if (url.match(/\.(md|rst|txt|doc|docx|pdf)$/i)) {
      return 'document';
    }
    return 'internal';
  }

  private generateHeaderId(text: string): string {
    return text.toLowerCase()
      .replace(/[^\w\s-]/g, '')
      .replace(/\s+/g, '-')
      .trim();
  }

  private extractContext(line: string, match: string): string {
    const index = line.indexOf(match);
    const start = Math.max(0, index - 30);
    const end = Math.min(line.length, index + match.length + 30);
    return line.substring(start, end).trim();
  }

  private extractTitle(headers: DocumentStructure['headers']): string | undefined {
    const h1 = headers.find(h => h.level === 1);
    return h1?.text;
  }

  private parseTableRow(line: string): string[] {
    return line.split('|').map(cell => cell.trim()).filter(cell => cell !== '');
  }

  private resolveRelativePath(targetPath: string, sourcePath: string): string {
    if (path.isAbsolute(targetPath)) {
      return targetPath;
    }
    const sourceDir = path.dirname(sourcePath);
    return path.resolve(sourceDir, targetPath);
  }

  private async fileExists(filePath: string): Promise<boolean> {
    try {
      await fs.promises.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  private extractFilenameRelationships(filePath: string): DocumentRelationship[] {
    const relationships: DocumentRelationship[] = [];
    const basename = path.basename(filePath, '.md');

    // Look for corresponding source files
    const possibleSourceFiles = [
      `${basename}.ts`,
      `${basename}.js`,
      `${basename}.py`,
      `${basename}.java`,
      `${basename}.go`,
      `${basename}.rs`
    ];

    for (const sourceFile of possibleSourceFiles) {
      relationships.push({
        sourceDoc: filePath,
        targetElement: sourceFile,
        relationType: 'documents',
        confidence: 0.7,
        evidence: [`Filename correspondence: ${basename}`],
        extractedFrom: 'filename'
      });
    }

    return relationships;
  }

  private isFeatureHeader(headerText: string): boolean {
    const featureKeywords = [
      'api', 'endpoint', 'function', 'method', 'class', 'component',
      'feature', 'implementation', 'algorithm', 'service', 'module'
    ];
    return featureKeywords.some(keyword => headerText.includes(keyword));
  }

  private extractFrameworksFromContent(analysis: DocumentAnalysis): string[] {
    const frameworks: string[] = [];
    const content = analysis.structure.codeBlocks
      .map(block => block.content)
      .join(' ') + ' ' + analysis.structure.headers
      .map(header => header.text)
      .join(' ');

    const frameworkPatterns = [
      { pattern: /react|jsx/i, name: 'React' },
      { pattern: /vue|nuxt/i, name: 'Vue' },
      { pattern: /angular/i, name: 'Angular' },
      { pattern: /express|fastify/i, name: 'Express' },
      { pattern: /django|flask/i, name: 'Django/Flask' },
      { pattern: /spring|boot/i, name: 'Spring' },
      { pattern: /kubernetes|k8s/i, name: 'Kubernetes' },
      { pattern: /docker/i, name: 'Docker' }
    ];

    for (const { pattern, name } of frameworkPatterns) {
      if (pattern.test(content)) {
        frameworks.push(name);
      }
    }

    return frameworks;
  }
}