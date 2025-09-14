import { MindMapStorage } from './MindMapStorage.js';
import { MindMapNode } from '../types/index.js';

export interface Episode {
  id: string;
  timestamp: Date;
  context: EpisodeContext;
  actions: EpisodeAction[];
  outcome: 'success' | 'failure' | 'partial';
  confidence: number;
  tags: string[];
  similarity?: number; // Used during retrieval
  consolidationLevel: number; // 0-1, higher = more consolidated
}

export interface EpisodeContext {
  taskDescription: string;
  projectType: string;
  languages: string[];
  frameworks: string[];
  fileTypes: string[];
  errorContext?: string;
  userGoals: string[];
  sessionDuration: number;
  activeFiles: string[];
}

export interface EpisodeAction {
  type: 'query' | 'file_access' | 'edit' | 'create' | 'delete' | 'search';
  target: string;
  parameters: Record<string, any>;
  timestamp: Date;
  success: boolean;
  duration: number;
}

export interface SimilarityMatch {
  episode: Episode;
  similarity: number;
  matchingFeatures: string[];
  relevantActions: EpisodeAction[];
}

export interface EpisodeStats {
  totalEpisodes: number;
  successRate: number;
  averageConsolidation: number;
  topTags: { tag: string; count: number }[];
  recentActivity: {
    lastWeek: number;
    lastMonth: number;
  };
  consolidationStats: {
    fresh: number;      // 0-0.3
    developing: number; // 0.3-0.7
    consolidated: number; // 0.7-1.0
  };
}

/**
 * Episodic Memory Enhancement System
 *
 * Stores specific experiences for similarity matching and learning.
 * Based on human episodic memory - stores "what happened when" with rich context.
 */
export class EpisodicMemory {
  private storage: MindMapStorage;
  private episodes: Map<string, Episode> = new Map();
  private maxEpisodes: number = 1000;
  private consolidationInterval: number = 24 * 60 * 60 * 1000; // 24 hours
  private lastConsolidation: Date = new Date();

  // Similarity weights for different context features
  private readonly SIMILARITY_WEIGHTS = {
    taskDescription: 0.25,
    projectType: 0.15,
    languages: 0.20,
    frameworks: 0.15,
    fileTypes: 0.10,
    userGoals: 0.10,
    errorContext: 0.05
  };

  constructor(storage: MindMapStorage) {
    this.storage = storage;
    this.loadEpisodes();
  }

  /**
   * Store a new episode with rich context
   */
  async storeEpisode(
    taskDescription: string,
    context: Partial<EpisodeContext>,
    actions: EpisodeAction[],
    outcome: 'success' | 'failure' | 'partial'
  ): Promise<string> {
    const episodeId = `episode_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Build complete context
    const fullContext: EpisodeContext = {
      taskDescription,
      projectType: context.projectType || this.inferProjectType(),
      languages: context.languages || this.inferLanguages(),
      frameworks: context.frameworks || this.inferFrameworks(),
      fileTypes: context.fileTypes || this.inferFileTypes(),
      errorContext: context.errorContext,
      userGoals: context.userGoals || [],
      sessionDuration: context.sessionDuration || 0,
      activeFiles: context.activeFiles || []
    };

    const episode: Episode = {
      id: episodeId,
      timestamp: new Date(),
      context: fullContext,
      actions,
      outcome,
      confidence: this.calculateEpisodeConfidence(actions, outcome),
      tags: this.generateTags(fullContext, actions),
      consolidationLevel: 0.0, // Fresh episode
    };

    this.episodes.set(episodeId, episode);

    // Auto-consolidate if needed
    if (this.shouldConsolidate()) {
      await this.consolidateMemories();
    }

    // Maintain episode limit
    if (this.episodes.size > this.maxEpisodes) {
      await this.pruneOldEpisodes();
    }

    await this.saveEpisodes();
    return episodeId;
  }

  /**
   * Find similar episodes for a given context
   */
  async findSimilarEpisodes(
    context: Partial<EpisodeContext>,
    limit: number = 5,
    minSimilarity: number = 0.3
  ): Promise<SimilarityMatch[]> {
    const matches: SimilarityMatch[] = [];

    for (const episode of this.episodes.values()) {
      const similarity = this.calculateSimilarity(context, episode.context);

      if (similarity >= minSimilarity) {
        const matchingFeatures = this.identifyMatchingFeatures(context, episode.context);
        const relevantActions = this.extractRelevantActions(episode.actions, context);

        matches.push({
          episode: { ...episode, similarity },
          similarity,
          matchingFeatures,
          relevantActions
        });
      }
    }

    // Sort by similarity (weighted by consolidation level)
    matches.sort((a, b) => {
      const scoreA = a.similarity * (1 + a.episode.consolidationLevel * 0.2);
      const scoreB = b.similarity * (1 + b.episode.consolidationLevel * 0.2);
      return scoreB - scoreA;
    });

    return matches.slice(0, limit);
  }

  /**
   * Get episode-based suggestions for similar tasks
   */
  async getEpisodeBasedSuggestions(
    currentContext: Partial<EpisodeContext>
  ): Promise<{
    suggestions: string[];
    basedOnEpisodes: string[];
    confidence: number;
  }> {
    const similarEpisodes = await this.findSimilarEpisodes(currentContext, 10, 0.4);

    if (similarEpisodes.length === 0) {
      return {
        suggestions: [],
        basedOnEpisodes: [],
        confidence: 0
      };
    }

    // Analyze successful episodes for patterns
    const successfulEpisodes = similarEpisodes.filter(match =>
      match.episode.outcome === 'success'
    );

    const suggestions: string[] = [];
    const basedOnEpisodes: string[] = [];

    // Extract successful action patterns
    for (const match of successfulEpisodes.slice(0, 5)) {
      const episode = match.episode;
      basedOnEpisodes.push(episode.id);

      // Suggest key actions from successful episodes
      const keyActions = match.relevantActions
        .filter(action => action.success)
        .slice(0, 3);

      for (const action of keyActions) {
        const suggestion = this.actionToSuggestion(action, match.matchingFeatures);
        if (suggestion && !suggestions.includes(suggestion)) {
          suggestions.push(suggestion);
        }
      }
    }

    // Calculate confidence based on episode similarity and success rate
    const avgSimilarity = successfulEpisodes.reduce((sum, match) =>
      sum + match.similarity, 0) / successfulEpisodes.length;
    const successRate = successfulEpisodes.length / similarEpisodes.length;
    const confidence = Math.min(0.95, avgSimilarity * successRate * 1.2);

    return {
      suggestions: suggestions.slice(0, 8), // Top 8 suggestions
      basedOnEpisodes,
      confidence
    };
  }

  /**
   * Consolidate memories over time - strengthen frequently accessed patterns
   */
  async consolidateMemories(): Promise<void> {
    const now = new Date();
    const timeSinceConsolidation = now.getTime() - this.lastConsolidation.getTime();

    if (timeSinceConsolidation < this.consolidationInterval) {
      return;
    }

    // Find episodes that should be consolidated
    for (const episode of this.episodes.values()) {
      const age = now.getTime() - episode.timestamp.getTime();
      const daysSinceCreated = age / (24 * 60 * 60 * 1000);

      // Consolidation increases with:
      // 1. Age of episode
      // 2. Number of similar episodes (reinforcement)
      // 3. Success outcome
      const ageBonus = Math.min(0.3, daysSinceCreated * 0.02);
      const outcomeBonus = episode.outcome === 'success' ? 0.2 :
                          episode.outcome === 'partial' ? 0.1 : 0;

      // Find reinforcing episodes
      const similarCount = await this.countSimilarEpisodes(episode);
      const reinforcementBonus = Math.min(0.3, similarCount * 0.05);

      const consolidationIncrease = ageBonus + outcomeBonus + reinforcementBonus;
      episode.consolidationLevel = Math.min(1.0,
        episode.consolidationLevel + consolidationIncrease
      );
    }

    this.lastConsolidation = now;
    await this.saveEpisodes();
  }

  /**
   * Get episodic memory statistics
   */
  getStats(): EpisodeStats {
    const episodes = Array.from(this.episodes.values());
    const totalEpisodes = episodes.length;

    if (totalEpisodes === 0) {
      return {
        totalEpisodes: 0,
        successRate: 0,
        averageConsolidation: 0,
        topTags: [],
        recentActivity: { lastWeek: 0, lastMonth: 0 },
        consolidationStats: { fresh: 0, developing: 0, consolidated: 0 }
      };
    }

    const successfulEpisodes = episodes.filter(e => e.outcome === 'success').length;
    const successRate = successfulEpisodes / totalEpisodes;

    const averageConsolidation = episodes.reduce((sum, e) =>
      sum + e.consolidationLevel, 0) / totalEpisodes;

    // Tag frequency analysis
    const tagCounts = new Map<string, number>();
    episodes.forEach(episode => {
      episode.tags.forEach(tag => {
        tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1);
      });
    });

    const topTags = Array.from(tagCounts.entries())
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([tag, count]) => ({ tag, count }));

    // Recent activity
    const now = new Date();
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const lastWeek = episodes.filter(e => e.timestamp >= oneWeekAgo).length;
    const lastMonth = episodes.filter(e => e.timestamp >= oneMonthAgo).length;

    // Consolidation level distribution
    const fresh = episodes.filter(e => e.consolidationLevel < 0.3).length;
    const developing = episodes.filter(e =>
      e.consolidationLevel >= 0.3 && e.consolidationLevel < 0.7).length;
    const consolidated = episodes.filter(e => e.consolidationLevel >= 0.7).length;

    return {
      totalEpisodes,
      successRate,
      averageConsolidation,
      topTags,
      recentActivity: { lastWeek, lastMonth },
      consolidationStats: { fresh, developing, consolidated }
    };
  }

  // Private helper methods
  private calculateSimilarity(context1: Partial<EpisodeContext>, context2: EpisodeContext): number {
    let totalScore = 0;
    let totalWeight = 0;

    // Task description similarity (semantic)
    if (context1.taskDescription && context2.taskDescription) {
      const similarity = this.textSimilarity(context1.taskDescription, context2.taskDescription);
      totalScore += similarity * this.SIMILARITY_WEIGHTS.taskDescription;
      totalWeight += this.SIMILARITY_WEIGHTS.taskDescription;
    }

    // Project type exact match
    if (context1.projectType && context2.projectType) {
      const match = context1.projectType === context2.projectType ? 1 : 0;
      totalScore += match * this.SIMILARITY_WEIGHTS.projectType;
      totalWeight += this.SIMILARITY_WEIGHTS.projectType;
    }

    // Languages overlap
    if (context1.languages && context2.languages) {
      const overlap = this.arrayOverlap(context1.languages, context2.languages);
      totalScore += overlap * this.SIMILARITY_WEIGHTS.languages;
      totalWeight += this.SIMILARITY_WEIGHTS.languages;
    }

    // Frameworks overlap
    if (context1.frameworks && context2.frameworks) {
      const overlap = this.arrayOverlap(context1.frameworks, context2.frameworks);
      totalScore += overlap * this.SIMILARITY_WEIGHTS.frameworks;
      totalWeight += this.SIMILARITY_WEIGHTS.frameworks;
    }

    // File types overlap
    if (context1.fileTypes && context2.fileTypes) {
      const overlap = this.arrayOverlap(context1.fileTypes, context2.fileTypes);
      totalScore += overlap * this.SIMILARITY_WEIGHTS.fileTypes;
      totalWeight += this.SIMILARITY_WEIGHTS.fileTypes;
    }

    // User goals overlap
    if (context1.userGoals && context2.userGoals) {
      const overlap = this.arrayOverlap(context1.userGoals, context2.userGoals);
      totalScore += overlap * this.SIMILARITY_WEIGHTS.userGoals;
      totalWeight += this.SIMILARITY_WEIGHTS.userGoals;
    }

    // Error context similarity
    if (context1.errorContext && context2.errorContext) {
      const similarity = this.textSimilarity(context1.errorContext, context2.errorContext);
      totalScore += similarity * this.SIMILARITY_WEIGHTS.errorContext;
      totalWeight += this.SIMILARITY_WEIGHTS.errorContext;
    }

    return totalWeight > 0 ? totalScore / totalWeight : 0;
  }

  private textSimilarity(text1: string, text2: string): number {
    // Simple Jaccard similarity on words
    const words1 = new Set(text1.toLowerCase().split(/\s+/));
    const words2 = new Set(text2.toLowerCase().split(/\s+/));

    const intersection = new Set([...words1].filter(w => words2.has(w)));
    const union = new Set([...words1, ...words2]);

    return union.size > 0 ? intersection.size / union.size : 0;
  }

  private arrayOverlap<T>(arr1: T[], arr2: T[]): number {
    const set1 = new Set(arr1);
    const set2 = new Set(arr2);

    const intersection = new Set([...set1].filter(item => set2.has(item)));
    const union = new Set([...set1, ...set2]);

    return union.size > 0 ? intersection.size / union.size : 0;
  }

  private calculateEpisodeConfidence(actions: EpisodeAction[], outcome: string): number {
    const successfulActions = actions.filter(a => a.success).length;
    const totalActions = actions.length;

    const actionSuccessRate = totalActions > 0 ? successfulActions / totalActions : 0;
    const outcomeBonus = outcome === 'success' ? 0.3 :
                        outcome === 'partial' ? 0.1 : -0.2;

    return Math.max(0, Math.min(1, actionSuccessRate + outcomeBonus));
  }

  private generateTags(context: EpisodeContext, actions: EpisodeAction[]): string[] {
    const tags: string[] = [];

    // Context-based tags
    if (context.projectType) tags.push(`project:${context.projectType}`);
    context.languages.forEach(lang => tags.push(`lang:${lang}`));
    context.frameworks.forEach(fw => tags.push(`framework:${fw}`));

    // Action-based tags
    const actionTypes = new Set(actions.map(a => a.type));
    actionTypes.forEach(type => tags.push(`action:${type}`));

    // Task-based tags (extract keywords)
    const taskWords = context.taskDescription.toLowerCase().split(/\s+/)
      .filter(word => word.length > 3)
      .slice(0, 5);
    taskWords.forEach(word => tags.push(`task:${word}`));

    return tags;
  }

  private identifyMatchingFeatures(context1: Partial<EpisodeContext>, context2: EpisodeContext): string[] {
    const features: string[] = [];

    if (context1.projectType === context2.projectType) {
      features.push(`Project type: ${context1.projectType}`);
    }

    const commonLanguages = (context1.languages || []).filter(lang =>
      context2.languages.includes(lang));
    if (commonLanguages.length > 0) {
      features.push(`Languages: ${commonLanguages.join(', ')}`);
    }

    const commonFrameworks = (context1.frameworks || []).filter(fw =>
      context2.frameworks.includes(fw));
    if (commonFrameworks.length > 0) {
      features.push(`Frameworks: ${commonFrameworks.join(', ')}`);
    }

    return features;
  }

  private extractRelevantActions(actions: EpisodeAction[], context: Partial<EpisodeContext>): EpisodeAction[] {
    // Return successful actions that are most relevant to the context
    return actions
      .filter(action => action.success)
      .sort((a, b) => b.duration - a.duration) // Longer actions might be more significant
      .slice(0, 5);
  }

  private actionToSuggestion(action: EpisodeAction, matchingFeatures: string[]): string | null {
    switch (action.type) {
      case 'query':
        return `Try searching for: ${action.parameters.query || action.target}`;
      case 'file_access':
        return `Consider examining: ${action.target}`;
      case 'edit':
        return `You might need to modify: ${action.target}`;
      case 'create':
        return `Consider creating: ${action.target}`;
      case 'search':
        return `Search for: ${action.parameters.pattern || action.target}`;
      default:
        return null;
    }
  }

  private async countSimilarEpisodes(episode: Episode): Promise<number> {
    let count = 0;
    for (const other of this.episodes.values()) {
      if (other.id !== episode.id) {
        const similarity = this.calculateSimilarity(episode.context, other.context);
        if (similarity > 0.5) {
          count++;
        }
      }
    }
    return count;
  }

  private shouldConsolidate(): boolean {
    const now = new Date();
    const timeSinceConsolidation = now.getTime() - this.lastConsolidation.getTime();
    return timeSinceConsolidation >= this.consolidationInterval;
  }

  private async pruneOldEpisodes(): Promise<void> {
    const episodes = Array.from(this.episodes.values());

    // Keep episodes with high consolidation level and recent ones
    episodes.sort((a, b) => {
      const scoreA = a.consolidationLevel * 0.7 +
                   (Date.now() - a.timestamp.getTime()) / (30 * 24 * 60 * 60 * 1000) * 0.3;
      const scoreB = b.consolidationLevel * 0.7 +
                   (Date.now() - b.timestamp.getTime()) / (30 * 24 * 60 * 60 * 1000) * 0.3;
      return scoreB - scoreA;
    });

    // Remove lowest scoring episodes
    const toRemove = episodes.slice(this.maxEpisodes * 0.8); // Remove bottom 20%
    toRemove.forEach(episode => this.episodes.delete(episode.id));
  }

  private inferProjectType(): string {
    const graph = this.storage.getGraph();
    const nodes = Array.from(graph.nodes.values());

    // Simple heuristics based on files present
    const hasPackageJson = nodes.some(n => n.name === 'package.json');
    const hasCargoToml = nodes.some(n => n.name === 'Cargo.toml');
    const hasPomXml = nodes.some(n => n.name === 'pom.xml');
    const hasRequirementsTxt = nodes.some(n => n.name === 'requirements.txt');

    if (hasPackageJson) return 'nodejs';
    if (hasCargoToml) return 'rust';
    if (hasPomXml) return 'java';
    if (hasRequirementsTxt) return 'python';

    return 'unknown';
  }

  private inferLanguages(): string[] {
    const graph = this.storage.getGraph();
    const languages = new Set<string>();

    for (const node of graph.nodes.values()) {
      const lang = node.metadata.language || node.properties?.language;
      if (lang) {
        languages.add(lang);
      }
    }

    return Array.from(languages);
  }

  private inferFrameworks(): string[] {
    const graph = this.storage.getGraph();
    const frameworks = new Set<string>();

    for (const node of graph.nodes.values()) {
      const framework = node.metadata.framework || node.properties?.framework;
      if (framework) {
        frameworks.add(framework);
      }
    }

    return Array.from(frameworks);
  }

  private inferFileTypes(): string[] {
    const graph = this.storage.getGraph();
    const fileTypes = new Set<string>();

    for (const node of graph.nodes.values()) {
      if (node.type === 'file' && node.metadata.extension) {
        fileTypes.add(node.metadata.extension);
      }
    }

    return Array.from(fileTypes);
  }

  private async loadEpisodes(): Promise<void> {
    try {
      const graph = this.storage.getGraph();
      // Load episodes from a special node type
      for (const [id, node] of graph.nodes) {
        if (node.type === 'episodic_memory' && node.metadata.episodes) {
          const episodes = JSON.parse(node.metadata.episodes);
          for (const episode of episodes) {
            episode.timestamp = new Date(episode.timestamp);
            this.episodes.set(episode.id, episode);
          }
          break;
        }
      }
    } catch (error) {
      console.log('No existing episodes found, starting fresh');
    }
  }

  private async saveEpisodes(): Promise<void> {
    const episodeData = Array.from(this.episodes.values());

    // Store episodes in a special node
    const episodeNode: MindMapNode = {
      id: 'episodic_memory_storage',
      type: 'episodic_memory',
      name: 'Episodic Memory Storage',
      metadata: {
        episodes: JSON.stringify(episodeData),
        lastUpdate: new Date().toISOString(),
        count: episodeData.length
      },
      confidence: 1.0,
      lastUpdated: new Date()
    };

    this.storage.addNode(episodeNode);
    await this.storage.save();
  }
}