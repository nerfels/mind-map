import { MindMapEngine } from '../core/MindMapEngine.js';
import { ValidationMiddleware } from '../middleware/ValidationMiddleware.js';
import { ResponseFormatter } from '../middleware/ResponseFormatter.js';

export class FrameworkHandlers {
  constructor(private mindMap: MindMapEngine) {}

  async handleDetectEnhancedFrameworks(args: {
    force_refresh?: boolean;
    categories?: string[];
    min_confidence?: number;
  }) {
    const { force_refresh = false, categories, min_confidence = 0.3 } = args;

    try {
      const allFrameworks = await this.mindMap.detectEnhancedFrameworks(categories, force_refresh, min_confidence);

      // Filter by min_confidence
      const filteredFrameworks = allFrameworks.filter((fw: any) => fw.confidence >= min_confidence);

      let text = `🎯 **Enhanced Framework Detection Results:**\n\n`;

      if (filteredFrameworks.length === 0) {
        text += 'No frameworks detected matching the specified criteria.';
      } else {
        text += `Found ${filteredFrameworks.length} frameworks above ${Math.round(min_confidence * 100)}% confidence:\n\n`;

        for (const framework of filteredFrameworks) {
          const confidenceBar = '█'.repeat(Math.round(framework.confidence * 10));
          const versionInfo = framework.version ? ` v${framework.version}` : '';
          const categoryIcon = {
            web: '🌐',
            mobile: '📱',
            desktop: '🖥️',
            game: '🎮',
            ml_ai: '🤖',
            cloud: '☁️'
          }[framework.category] || '📦';

          text += `${categoryIcon} **${framework.name}${versionInfo}** (${Math.round(framework.confidence * 100)}% confidence)\n`;
          text += `     ${confidenceBar} ${framework.confidence.toFixed(2)}\n`;
          text += `     Category: ${framework.category.toUpperCase()}\n`;

          if (framework.evidence && framework.evidence.length > 0) {
            text += `     📋 Evidence: ${framework.evidence.slice(0, 3).join(', ')}`;
            if (framework.evidence.length > 3) {
              text += ` (+${framework.evidence.length - 3} more)`;
            }
            text += '\n';
          }

          if (framework.patterns && framework.patterns.length > 0) {
            const highConfidencePatterns = framework.patterns.filter(p => p.confidence > 0.7);
            if (highConfidencePatterns.length > 0) {
              text += `     🔍 Patterns: ${highConfidencePatterns.map(p => p.description).slice(0, 2).join(', ')}\n`;
            }
          }

          if (framework.configurations && framework.configurations.length > 0) {
            text += `     ⚙️  Configs: ${framework.configurations.slice(0, 3).join(', ')}\n`;
          }

          text += '\n';
        }

        const uniqueCategories = new Set(filteredFrameworks.map((fw: any) => fw.category)).size;
        text += `📊 **Summary:** ${filteredFrameworks.length} frameworks detected across ${uniqueCategories} categories`;
      }

      return ResponseFormatter.formatSuccessResponse(text);
    } catch (error) {
      return ResponseFormatter.formatErrorResponse('detect_enhanced_frameworks', error);
    }
  }

  async handleGetFrameworkRecommendations(args: {
    framework_names?: string[];
    recommendation_type?: string;
  }) {
    const { framework_names, recommendation_type = 'all' } = args;

    try {
      // Get all frameworks if specific ones not requested
      let frameworksToAnalyze: any[] = [];

      if (framework_names && framework_names.length > 0) {
        const allFrameworks = await this.mindMap.detectEnhancedFrameworks();

        for (const [category, frameworks] of allFrameworks) {
          for (const framework of frameworks) {
            if (framework_names.includes(framework.name)) {
              frameworksToAnalyze.push(framework);
            }
          }
        }
      } else {
        const allFrameworks = await this.mindMap.detectEnhancedFrameworks();
        for (const [category, frameworks] of allFrameworks) {
          frameworksToAnalyze.push(...frameworks.filter(f => f.confidence > 0.5));
        }
      }

      if (frameworksToAnalyze.length === 0) {
        const text = '❌ No frameworks found matching the criteria for recommendations.';
        return ResponseFormatter.formatSuccessResponse(text);
      }

      const recommendations = await this.mindMap.getFrameworkRecommendations(frameworksToAnalyze);

      let text = `💡 **Framework Recommendations:**\n\n`;

      if (recommendations.length === 0) {
        text += 'No specific recommendations available for the detected frameworks. Your setup looks good!';
      } else {
        text += `Based on your detected frameworks: ${frameworksToAnalyze.map(f => f.name).join(', ')}\n\n`;

        for (let i = 0; i < recommendations.length; i++) {
          text += `${i + 1}. ${recommendations[i]}\n`;
        }

        // Add general framework recommendations
        text += `\n🎯 **General Best Practices:**\n`;
        text += `• Keep framework versions up-to-date for security patches\n`;
        text += `• Use framework-specific linting and formatting tools\n`;
        text += `• Follow framework conventions for project structure\n`;
        text += `• Leverage framework-specific testing utilities\n`;
        text += `• Use framework-specific performance optimization guides\n`;
      }

      return ResponseFormatter.formatSuccessResponse(text);
    } catch (error) {
      return ResponseFormatter.formatErrorResponse('get_framework_recommendations', error);
    }
  }
}