import { UserConfigurationManager } from '../UserConfigurationManager.js';
import { CustomPatternEngine } from '../CustomPatternEngine.js';
import { ScalabilityManager } from '../ScalabilityManager.js';
import {
  UserPreferences,
  CustomPatternRule,
  ProjectLearningConfig,
  PrivacySettings,
  UserFeedback,
  ScalabilityConfig,
  ResourceUsage
} from '../../types/index.js';

export class ConfigurationService {
  constructor(
    private userConfigManager: UserConfigurationManager,
    private customPatternEngine: CustomPatternEngine,
    private scalabilityManager: ScalabilityManager
  ) {}

  async initialize(): Promise<void> {
    await this.userConfigManager.initialize();
  }

  // User Preferences Management
  getUserPreferences(): UserPreferences {
    return this.userConfigManager.getPreferences();
  }

  async updateUserPreferences(updates: Partial<UserPreferences>): Promise<void> {
    await this.userConfigManager.updatePreferences(updates);
  }

  // Privacy Settings Management
  getPrivacySettings(): PrivacySettings {
    return this.userConfigManager.getPrivacySettings();
  }

  async updatePrivacySettings(updates: Partial<PrivacySettings>): Promise<void> {
    await this.userConfigManager.updatePrivacySettings(updates);
  }

  // Project Learning Configuration
  getProjectLearningConfig(): ProjectLearningConfig | undefined {
    return this.userConfigManager.getProjectConfig();
  }

  async updateProjectLearningConfig(config: Partial<ProjectLearningConfig>): Promise<void> {
    await this.userConfigManager.updateProjectConfig(config);
  }

  // User Feedback Management
  async recordUserFeedback(
    type: 'suggestion_rating' | 'feature_request' | 'bug_report' | 'general',
    comment: string,
    rating: number,
    context?: any
  ): Promise<string> {
    const feedbackId = await this.userConfigManager.submitFeedback({
      type,
      rating,
      comment,
      context: {
        feature: 'configuration_service',
        timestamp: new Date(),
        sessionId: this.generateId(),
        ...context
      },
      metadata: {
        version: '1.0.0',
        projectScale: 'medium',
        userExperience: 'intermediate'
      }
    });

    return feedbackId;
  }

  async getUserFeedback(status?: UserFeedback['status']): Promise<UserFeedback[]> {
    return this.userConfigManager.getFeedback(status);
  }

  async markFeedbackResolved(feedbackId: string): Promise<void> {
    await this.userConfigManager.updateFeedbackStatus(feedbackId, 'addressed');
  }

  // Custom Pattern Management
  async addCustomPattern(pattern: Omit<CustomPatternRule, 'id' | 'created' | 'lastModified'>): Promise<string> {
    return await this.userConfigManager.addCustomPattern(pattern);
  }

  async updateCustomPattern(id: string, updates: Partial<CustomPatternRule>): Promise<void> {
    await this.userConfigManager.updateCustomPattern(id, updates);
  }

  async removeCustomPattern(id: string): Promise<void> {
    await this.userConfigManager.removeCustomPattern(id);
  }

  getCustomPatterns(): CustomPatternRule[] {
    return this.userConfigManager.getCustomPatterns();
  }

  async testCustomPattern(id: string, sampleText: string = 'sample test code'): Promise<{
    matches: number;
    examples: any[];
    performance: number;
  }> {
    const pattern = this.userConfigManager.getCustomPatterns().find(p => p.id === id);
    if (!pattern) {
      throw new Error(`Pattern not found: ${id}`);
    }

    const startTime = Date.now();
    const testMatches = this.customPatternEngine.testPattern(pattern, sampleText);
    const endTime = Date.now();

    return {
      matches: testMatches.length,
      examples: testMatches.slice(0, 5), // First 5 matches as examples
      performance: endTime - startTime
    };
  }

  // Scalability Configuration
  getScalabilityConfig(): ScalabilityConfig {
    return this.scalabilityManager.getConfiguration();
  }

  updateScalabilityConfig(config: Partial<ScalabilityConfig>): void {
    this.scalabilityManager.applyConfiguration(config);
  }

  getResourceUsage(): ResourceUsage {
    return this.scalabilityManager.getResourceUsage();
  }

  // Configuration Profiles
  async saveConfigurationProfile(name: string, description?: string): Promise<string> {
    const profile = {
      id: this.generateId(),
      name,
      description,
      created: new Date(),
      userPreferences: this.getUserPreferences(),
      privacySettings: this.getPrivacySettings(),
      projectLearningConfig: this.getProjectLearningConfig(),
      customPatterns: this.getCustomPatterns(),
      scalabilityConfig: this.getScalabilityConfig()
    };

    // For now, store the profile in preferences with type assertion
    // This is a placeholder implementation until proper profile storage is added
    const preferences = this.getUserPreferences() as UserPreferences & {
      metadata?: { configurationProfiles: any[] }
    };
    if (!preferences.metadata) {
      preferences.metadata = { configurationProfiles: [] };
    }
    if (!preferences.metadata.configurationProfiles) {
      preferences.metadata.configurationProfiles = [];
    }
    preferences.metadata.configurationProfiles.push(profile);

    await this.updateUserPreferences(preferences);
    return profile.id;
  }

  async loadConfigurationProfile(profileId: string): Promise<void> {
    const preferences = this.getUserPreferences() as UserPreferences & {
      metadata?: { configurationProfiles: any[] }
    };
    const profiles = preferences.metadata?.configurationProfiles || [];
    const profile = profiles.find((p: any) => p.id === profileId);

    if (!profile) {
      throw new Error(`Configuration profile ${profileId} not found`);
    }

    // Apply all configurations from the profile
    await this.updateUserPreferences(profile.userPreferences);
    await this.updatePrivacySettings(profile.privacySettings);

    if (profile.projectLearningConfig) {
      await this.updateProjectLearningConfig(profile.projectLearningConfig);
    }

    this.updateScalabilityConfig(profile.scalabilityConfig);

    // Load custom patterns - add them to user configuration
    for (const pattern of profile.customPatterns) {
      await this.addCustomPattern(pattern);
    }
  }

  async getConfigurationProfiles(): Promise<Array<{
    id: string;
    name: string;
    description?: string;
    created: Date;
  }>> {
    const preferences = this.getUserPreferences() as UserPreferences & {
      metadata?: { configurationProfiles: any[] }
    };
    const profiles = preferences.metadata?.configurationProfiles || [];
    return profiles.map((p: any) => ({
      id: p.id,
      name: p.name,
      description: p.description,
      created: p.created
    }));
  }

  async deleteConfigurationProfile(profileId: string): Promise<void> {
    const preferences = this.getUserPreferences() as UserPreferences & {
      metadata?: { configurationProfiles: any[] }
    };
    const profiles = preferences.metadata?.configurationProfiles || [];
    const updatedProfiles = profiles.filter((p: any) => p.id !== profileId);
    if (!preferences.metadata) {
      preferences.metadata = { configurationProfiles: [] };
    }
    preferences.metadata.configurationProfiles = updatedProfiles;
    await this.updateUserPreferences(preferences);
  }

  // Configuration Validation and Recommendations
  async validateConfiguration(): Promise<{
    valid: boolean;
    issues: string[];
    recommendations: string[];
  }> {
    const issues: string[] = [];
    const recommendations: string[] = [];

    const preferences = this.getUserPreferences();
    const scalabilityConfig = this.getScalabilityConfig();
    const customPatterns = this.getCustomPatterns();

    // Validate user preferences
    if (preferences.maxResults > 100) {
      issues.push('Max results is very high, may impact performance');
      recommendations.push('Consider reducing max results to 50 or fewer');
    }

    if (preferences.maxMemoryUsage < 128 * 1024 * 1024) { // Less than 128MB
      issues.push('Max memory usage is very low, may cause performance issues');
      recommendations.push('Consider increasing max memory usage to at least 256MB');
    }

    // Validate scalability configuration
    const resourceUsage = this.getResourceUsage();
    if (resourceUsage.memoryUsage.percentage > scalabilityConfig.memoryPressureThreshold) {
      issues.push('Memory usage is above threshold');
      recommendations.push('Consider reducing maxNodesInMemory or maxEdgesInMemory');
    }

    // Validate custom patterns
    let invalidPatterns = 0;
    for (const pattern of customPatterns) {
      if (!pattern.enabled || !pattern.pattern) {
        invalidPatterns++;
      }
    }

    if (invalidPatterns > 0) {
      issues.push(`${invalidPatterns} custom patterns are disabled or invalid`);
      recommendations.push('Review and fix custom patterns or remove unused ones');
    }

    return {
      valid: issues.length === 0,
      issues,
      recommendations
    };
  }

  // Configuration Export/Import
  async exportConfiguration(): Promise<string> {
    const config = {
      version: '1.0',
      timestamp: new Date().toISOString(),
      userPreferences: this.getUserPreferences(),
      privacySettings: this.getPrivacySettings(),
      projectLearningConfig: this.getProjectLearningConfig(),
      customPatterns: this.getCustomPatterns(),
      scalabilityConfig: this.getScalabilityConfig()
    };

    return JSON.stringify(config, null, 2);
  }

  async importConfiguration(configJson: string): Promise<void> {
    try {
      const config = JSON.parse(configJson);

      if (config.version !== '1.0') {
        throw new Error(`Unsupported configuration version: ${config.version}`);
      }

      // Import configurations
      if (config.userPreferences) {
        await this.updateUserPreferences(config.userPreferences);
      }

      if (config.privacySettings) {
        await this.updatePrivacySettings(config.privacySettings);
      }

      if (config.projectLearningConfig) {
        await this.updateProjectLearningConfig(config.projectLearningConfig);
      }

      if (config.scalabilityConfig) {
        this.updateScalabilityConfig(config.scalabilityConfig);
      }

      if (config.customPatterns) {
        for (const pattern of config.customPatterns) {
          await this.addCustomPattern(pattern);
        }
      }

    } catch (error) {
      throw new Error(`Failed to import configuration: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Utility Methods
  private generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  // Get comprehensive configuration summary
  getConfigurationSummary() {
    return {
      userPreferences: this.getUserPreferences(),
      privacySettings: this.getPrivacySettings(),
      projectLearningConfig: this.getProjectLearningConfig(),
      customPatterns: {
        total: this.getCustomPatterns().length,
        enabled: this.getCustomPatterns().filter(p => p.enabled).length
      },
      scalabilityConfig: this.getScalabilityConfig(),
      resourceUsage: this.getResourceUsage()
    };
  }
}