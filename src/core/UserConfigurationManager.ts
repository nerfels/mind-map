/**
 * User Configuration Manager - Phase 4.4 User Customization
 *
 * Features:
 * - User preference management
 * - Custom pattern recognition rules
 * - Project-specific learning controls
 * - Privacy settings and data control
 * - User feedback and rating system
 */

import { promises as fs } from 'fs';
import { join } from 'path';
import {
  UserConfiguration,
  UserPreferences,
  CustomPatternRule,
  ProjectLearningConfig,
  PrivacySettings,
  UserFeedback
} from '../types/index.js';

export class UserConfigurationManager {
  private config: UserConfiguration | null = null;
  private configPath: string;
  private projectRoot: string;

  constructor(projectRoot: string) {
    this.projectRoot = projectRoot;
    this.configPath = join(projectRoot, '.mindmap-cache', 'user-config.json');
  }

  /**
   * Initialize with default configuration
   */
  async initialize(): Promise<void> {
    try {
      await this.loadConfiguration();
    } catch (error) {
      console.log('📝 Creating default user configuration...');
      this.config = this.createDefaultConfiguration();
      await this.saveConfiguration();
    }
  }

  /**
   * Create default user configuration
   */
  private createDefaultConfiguration(): UserConfiguration {
    const userId = this.generateUserId();
    const now = new Date();

    const defaultPreferences: UserPreferences = {
      // General preferences
      theme: 'auto',
      language: 'en',
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,

      // Analysis preferences
      enableIntelligentSuggestions: true,
      confidenceThreshold: 0.7,
      maxResults: 10,
      autoScanOnChange: true,

      // Learning preferences
      enableLearning: true,
      learningRate: 0.05,
      rememberFailures: true,
      adaptToWorkflow: true,

      // Privacy preferences
      collectTelemetry: false, // Conservative default
      shareUsageData: false,
      localStorageOnly: true,

      // Performance preferences
      maxMemoryUsage: 512 * 1024 * 1024, // 512MB
      enableCaching: true,
      parallelProcessing: true,
      backgroundScanning: false
    };

    const defaultPrivacySettings: PrivacySettings = {
      // Data collection
      collectUsageStatistics: false,
      collectErrorReports: false,
      collectPerformanceMetrics: false,

      // Data storage
      encryptLocalData: false,
      localOnlyMode: true,
      dataRetentionDays: 90,

      // Data sharing
      shareAnonymizedData: false,
      shareWithTeam: false,
      exportDataEnabled: true,

      // Security
      requireAuthentication: false,
      sessionTimeout: 3600000, // 1 hour
      auditLogging: false
    };

    return {
      version: '1.0.0',
      userId,
      preferences: defaultPreferences,
      projectConfigs: new Map(),
      customPatterns: [],
      privacySettings: defaultPrivacySettings,
      feedback: [],
      created: now,
      lastModified: now
    };
  }

  /**
   * Generate unique user ID
   */
  private generateUserId(): string {
    return `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Load configuration from file
   */
  private async loadConfiguration(): Promise<void> {
    const data = await fs.readFile(this.configPath, 'utf-8');
    const parsed = JSON.parse(data);

    // Convert Map fields from JSON
    parsed.projectConfigs = new Map(parsed.projectConfigs || []);

    // Convert date fields
    parsed.created = new Date(parsed.created);
    parsed.lastModified = new Date(parsed.lastModified);

    // Convert feedback dates
    if (parsed.feedback) {
      parsed.feedback = parsed.feedback.map((feedback: any) => ({
        ...feedback,
        created: new Date(feedback.created),
        lastModified: new Date(feedback.lastModified),
        context: {
          ...feedback.context,
          timestamp: new Date(feedback.context.timestamp)
        }
      }));
    }

    this.config = parsed;
  }

  /**
   * Save configuration to file
   */
  private async saveConfiguration(): Promise<void> {
    if (!this.config) return;

    // Prepare for JSON serialization
    const toSave = {
      ...this.config,
      projectConfigs: Array.from(this.config.projectConfigs.entries()),
      lastModified: new Date()
    };

    // Ensure directory exists
    await fs.mkdir(join(this.projectRoot, '.mindmap-cache'), { recursive: true });

    await fs.writeFile(this.configPath, JSON.stringify(toSave, null, 2));
  }

  /**
   * Get user preferences
   */
  getPreferences(): UserPreferences {
    if (!this.config) throw new Error('Configuration not initialized');
    return { ...this.config.preferences };
  }

  /**
   * Update user preferences
   */
  async updatePreferences(updates: Partial<UserPreferences>): Promise<void> {
    if (!this.config) throw new Error('Configuration not initialized');

    this.config.preferences = { ...this.config.preferences, ...updates };
    await this.saveConfiguration();
  }

  /**
   * Get privacy settings
   */
  getPrivacySettings(): PrivacySettings {
    if (!this.config) throw new Error('Configuration not initialized');
    return { ...this.config.privacySettings };
  }

  /**
   * Update privacy settings
   */
  async updatePrivacySettings(updates: Partial<PrivacySettings>): Promise<void> {
    if (!this.config) throw new Error('Configuration not initialized');

    this.config.privacySettings = { ...this.config.privacySettings, ...updates };
    await this.saveConfiguration();
  }

  /**
   * Get project-specific configuration
   */
  getProjectConfig(projectId?: string): ProjectLearningConfig | undefined {
    if (!this.config) throw new Error('Configuration not initialized');

    const id = projectId || this.getProjectId();
    return this.config.projectConfigs.get(id);
  }

  /**
   * Update project-specific configuration
   */
  async updateProjectConfig(
    config: Partial<ProjectLearningConfig>,
    projectId?: string
  ): Promise<void> {
    if (!this.config) throw new Error('Configuration not initialized');

    const id = projectId || this.getProjectId();
    const existing = this.config.projectConfigs.get(id) || this.createDefaultProjectConfig(id);

    const updated = { ...existing, ...config };
    this.config.projectConfigs.set(id, updated);

    await this.saveConfiguration();
  }

  /**
   * Create default project configuration
   */
  private createDefaultProjectConfig(projectId: string): ProjectLearningConfig {
    return {
      projectId,
      projectName: this.getProjectName(),

      // Learning behavior
      enableHebbianLearning: true,
      enableInhibitoryLearning: true,
      enablePatternLearning: true,

      // Learning parameters
      learningRate: 0.05,
      decayRate: 0.002,
      confidenceThreshold: 0.7,

      // Pattern recognition
      customPatterns: [],
      disabledPatterns: [],

      // File and directory preferences
      ignorePatterns: [
        'node_modules/**',
        '.git/**',
        'dist/**',
        'build/**',
        '*.log',
        '*.tmp'
      ],
      priorityDirectories: ['src/', 'lib/', 'components/'],
      excludeDirectories: ['test/', 'tests/', '__tests__/', '.cache/'],

      // Framework-specific settings
      frameworkOverrides: {},

      // Feedback and ratings
      enableFeedbackCollection: true,
      autoRating: false
    };
  }

  /**
   * Get current project ID
   */
  private getProjectId(): string {
    return Buffer.from(this.projectRoot).toString('base64').slice(0, 16);
  }

  /**
   * Get project name from path
   */
  private getProjectName(): string {
    return this.projectRoot.split('/').pop() || 'Unknown Project';
  }

  /**
   * Add custom pattern rule
   */
  async addCustomPattern(pattern: Omit<CustomPatternRule, 'id' | 'created' | 'lastModified'>): Promise<string> {
    if (!this.config) throw new Error('Configuration not initialized');

    const id = `pattern_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const now = new Date();

    const customPattern: CustomPatternRule = {
      ...pattern,
      id,
      created: now,
      lastModified: now
    };

    this.config.customPatterns.push(customPattern);
    await this.saveConfiguration();

    return id;
  }

  /**
   * Update custom pattern rule
   */
  async updateCustomPattern(id: string, updates: Partial<CustomPatternRule>): Promise<void> {
    if (!this.config) throw new Error('Configuration not initialized');

    const index = this.config.customPatterns.findIndex(p => p.id === id);
    if (index === -1) throw new Error(`Pattern not found: ${id}`);

    this.config.customPatterns[index] = {
      ...this.config.customPatterns[index],
      ...updates,
      lastModified: new Date()
    };

    await this.saveConfiguration();
  }

  /**
   * Remove custom pattern rule
   */
  async removeCustomPattern(id: string): Promise<void> {
    if (!this.config) throw new Error('Configuration not initialized');

    const index = this.config.customPatterns.findIndex(p => p.id === id);
    if (index === -1) throw new Error(`Pattern not found: ${id}`);

    this.config.customPatterns.splice(index, 1);
    await this.saveConfiguration();
  }

  /**
   * Get custom pattern rules
   */
  getCustomPatterns(enabled?: boolean): CustomPatternRule[] {
    if (!this.config) throw new Error('Configuration not initialized');

    let patterns = [...this.config.customPatterns];

    if (enabled !== undefined) {
      patterns = patterns.filter(p => p.enabled === enabled);
    }

    return patterns;
  }

  /**
   * Submit user feedback
   */
  async submitFeedback(feedback: Omit<UserFeedback, 'id' | 'status' | 'created' | 'lastModified'>): Promise<string> {
    if (!this.config) throw new Error('Configuration not initialized');

    const id = `feedback_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const now = new Date();

    const userFeedback: UserFeedback = {
      ...feedback,
      id,
      status: 'new',
      created: now,
      lastModified: now
    };

    this.config.feedback.push(userFeedback);
    await this.saveConfiguration();

    return id;
  }

  /**
   * Get user feedback
   */
  getFeedback(status?: UserFeedback['status']): UserFeedback[] {
    if (!this.config) throw new Error('Configuration not initialized');

    let feedback = [...this.config.feedback];

    if (status) {
      feedback = feedback.filter(f => f.status === status);
    }

    return feedback.sort((a, b) => b.created.getTime() - a.created.getTime());
  }

  /**
   * Update feedback status
   */
  async updateFeedbackStatus(id: string, status: UserFeedback['status']): Promise<void> {
    if (!this.config) throw new Error('Configuration not initialized');

    const index = this.config.feedback.findIndex(f => f.id === id);
    if (index === -1) throw new Error(`Feedback not found: ${id}`);

    this.config.feedback[index].status = status;
    this.config.feedback[index].lastModified = new Date();

    await this.saveConfiguration();
  }

  /**
   * Export user configuration
   */
  async exportConfiguration(): Promise<string> {
    if (!this.config) throw new Error('Configuration not initialized');

    // Create export-safe version (remove sensitive data if privacy settings require it)
    const exportConfig = { ...this.config };

    if (!this.config.privacySettings.exportDataEnabled) {
      throw new Error('Data export is disabled in privacy settings');
    }

    if (!this.config.privacySettings.shareAnonymizedData) {
      exportConfig.userId = 'anonymous';
      exportConfig.feedback = exportConfig.feedback.map(f => ({
        ...f,
        context: {
          ...f.context,
          sessionId: 'anonymous'
        }
      }));
    }

    return JSON.stringify({
      ...exportConfig,
      projectConfigs: Array.from(exportConfig.projectConfigs.entries()),
      exportedAt: new Date().toISOString(),
      version: this.config.version
    }, null, 2);
  }

  /**
   * Import user configuration
   */
  async importConfiguration(configData: string, merge: boolean = false): Promise<void> {
    const imported = JSON.parse(configData);

    // Validate imported data structure
    if (!imported.version || !imported.preferences) {
      throw new Error('Invalid configuration format');
    }

    if (merge && this.config) {
      // Merge with existing configuration
      this.config.preferences = { ...this.config.preferences, ...imported.preferences };
      this.config.privacySettings = { ...this.config.privacySettings, ...imported.privacySettings };

      // Merge custom patterns (avoid duplicates)
      const existingPatternIds = new Set(this.config.customPatterns.map((p: CustomPatternRule) => p.id));
      const newPatterns = imported.customPatterns?.filter((p: CustomPatternRule) =>
        !existingPatternIds.has(p.id)
      ) || [];
      this.config.customPatterns.push(...newPatterns);

      // Merge project configs
      if (imported.projectConfigs) {
        const importedProjects = new Map(imported.projectConfigs);
        for (const [key, value] of importedProjects) {
          this.config.projectConfigs.set(key as string, value as ProjectLearningConfig);
        }
      }
    } else {
      // Full replacement
      this.config = {
        ...imported,
        projectConfigs: new Map(imported.projectConfigs || []),
        created: new Date(imported.created),
        lastModified: new Date(),
        userId: imported.userId || this.generateUserId()
      };
    }

    await this.saveConfiguration();
  }

  /**
   * Reset to default configuration
   */
  async resetToDefaults(): Promise<void> {
    this.config = this.createDefaultConfiguration();
    await this.saveConfiguration();
  }

  /**
   * Get configuration statistics
   */
  getConfigurationStats(): {
    version: string;
    userId: string;
    customPatterns: number;
    projectConfigs: number;
    feedbackItems: number;
    created: Date;
    lastModified: Date;
    privacyMode: boolean;
  } {
    if (!this.config) throw new Error('Configuration not initialized');

    return {
      version: this.config.version,
      userId: this.config.privacySettings.shareAnonymizedData ? this.config.userId : 'anonymous',
      customPatterns: this.config.customPatterns.length,
      projectConfigs: this.config.projectConfigs.size,
      feedbackItems: this.config.feedback.length,
      created: this.config.created,
      lastModified: this.config.lastModified,
      privacyMode: this.config.privacySettings.localOnlyMode
    };
  }

  /**
   * Check if feature is enabled based on preferences
   */
  isFeatureEnabled(feature: keyof UserPreferences): boolean {
    if (!this.config) return true; // Default to enabled if not configured
    return Boolean(this.config.preferences[feature]);
  }

  /**
   * Get effective learning configuration for current project
   */
  getEffectiveLearningConfig(): {
    enableHebbianLearning: boolean;
    enableInhibitoryLearning: boolean;
    learningRate: number;
    decayRate: number;
    confidenceThreshold: number;
  } {
    if (!this.config) {
      return {
        enableHebbianLearning: true,
        enableInhibitoryLearning: true,
        learningRate: 0.05,
        decayRate: 0.002,
        confidenceThreshold: 0.7
      };
    }

    const projectConfig = this.getProjectConfig();
    const globalEnabled = this.config.preferences.enableLearning;

    return {
      enableHebbianLearning: globalEnabled && (projectConfig?.enableHebbianLearning ?? true),
      enableInhibitoryLearning: globalEnabled && (projectConfig?.enableInhibitoryLearning ?? true),
      learningRate: projectConfig?.learningRate ?? this.config.preferences.learningRate,
      decayRate: projectConfig?.decayRate ?? 0.002,
      confidenceThreshold: projectConfig?.confidenceThreshold ?? this.config.preferences.confidenceThreshold
    };
  }
}