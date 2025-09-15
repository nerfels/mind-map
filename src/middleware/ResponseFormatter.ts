export class ResponseFormatter {
  static formatQueryResults(result: any, includeMetadata = false): string {
    let text = `Found ${result.nodes.length} matches (${result.totalMatches} total, query took ${result.queryTime}ms)\n\n`;

    result.nodes.forEach((node: any, i: number) => {
      text += `${i + 1}. ${node.name} (${node.type})\n`;
      if (node.path) text += `   Path: ${node.path}\n`;
      text += `   Confidence: ${node.confidence.toFixed(2)}\n`;

      if (includeMetadata && node.metadata && Object.keys(node.metadata).length > 0) {
        text += `   Metadata: ${JSON.stringify(node.metadata, null, 2)}\n`;
      }

      if (node.properties?.language) text += `   Language: ${node.properties.language}\n`;
      if (node.properties?.framework) text += `   Framework: ${node.properties.framework}\n`;
      text += '\n';
    });

    return text;
  }

  static formatAdvancedQueryResults(result: any, query: string, parameters: Record<string, any> = {}, explain = false): string {
    let text = `🔍 Advanced Query Results:\n\n`;
    text += `Query: "${query}"\n`;
    if (Object.keys(parameters).length > 0) {
      text += `Parameters: ${JSON.stringify(parameters, null, 2)}\n`;
    }
    text += `\nFound ${result.nodes?.length || 0} matches in ${result.queryTime}ms\n`;

    if (explain && result.explanation) {
      text += `\n📋 Execution Plan:\n`;
      text += `- ${result.explanation.queryPlan}\n`;
      text += `- ${result.explanation.optimizations}\n`;
      text += `- ${result.explanation.performance}\n`;
    }

    if (result.nodes && result.nodes.length > 0) {
      text += `\n📄 Results:\n`;
      result.nodes.slice(0, 10).forEach((node: any, i: number) => {
        text += `${i + 1}. ${node.name} (${node.type}) - Confidence: ${node.confidence.toFixed(2)}\n`;
        if (node.path) text += `   ${node.path}\n`;
      });

      if (result.nodes.length > 10) {
        text += `   ... and ${result.nodes.length - 10} more results\n`;
      }
    }

    return text;
  }

  static formatTemporalQueryResults(result: any, timeRange: any, entity: string, analysis_type: string, metric?: string): string {
    let text = `⏰ Temporal Query Results:\n\n`;
    text += `📅 Time Range: ${timeRange.start.toISOString().split('T')[0]} to ${timeRange.end.toISOString().split('T')[0]}\n`;
    text += `🎯 Entity: ${entity}\n`;
    text += `📊 Analysis: ${analysis_type}\n`;
    if (metric) text += `📈 Metric: ${metric}\n`;

    if (result.timeline) {
      text += `\n📈 Evolution Timeline:\n`;
      text += `Found ${result.timeline.length} snapshots\n`;
      if (result.metrics) {
        text += `\n📊 Evolution Metrics:\n`;
        text += `- Stability Score: ${result.metrics.stabilityScore.toFixed(2)}\n`;
        text += `- Growth Rate: ${result.metrics.growthRate.toFixed(2)} entities/day\n`;
        text += `- Churn Rate: ${result.metrics.churnRate.toFixed(2)} changes/day\n`;
        text += `- Health Trend: ${result.metrics.healthTrend}\n`;
        text += `- Confidence Trend: ${result.metrics.confidenceTrend > 0 ? '📈' : result.metrics.confidenceTrend < 0 ? '📉' : '➡️'} ${result.metrics.confidenceTrend.toFixed(3)}\n`;
      }
    }

    if (result.dataPoints) {
      text += `\n📈 Trend Analysis:\n`;
      text += `Trend: ${result.trend} (confidence: ${(result.confidence * 100).toFixed(1)}%)\n`;
      text += `Data Points: ${result.dataPoints.length}\n`;
      if (result.insights) {
        text += `\n💡 Insights:\n`;
        result.insights.forEach((insight: string) => {
          text += `• ${insight}\n`;
        });
      }
    }

    return text;
  }

  static formatAggregateQueryResults(result: any, aggregation: any, group_by?: any): string {
    let text = `📊 Aggregate Query Results:\n\n`;
    text += `Function: ${aggregation.function.toUpperCase()}(${aggregation.field})\n`;
    if (group_by) {
      text += `Grouped by: ${group_by.map((g: any) => g.field).join(', ')}\n`;
    }
    text += `Processed ${result.statistics.rowsProcessed} rows in ${result.executionTime}ms\n`;
    text += `Generated ${result.totalGroups} groups\n\n`;

    if (result.groups.length > 0) {
      text += `📈 Results:\n`;
      result.groups.slice(0, 15).forEach((group: any, i: number) => {
        const value = typeof group.value === 'number' ? group.value.toFixed(2) : group.value;
        text += `${i + 1}. ${JSON.stringify(group.key)} → ${value} (n=${group.count})\n`;
      });

      if (result.groups.length > 15) {
        text += `   ... and ${result.groups.length - 15} more groups\n`;
      }
    }

    return text;
  }

  static formatErrorResponse(toolName: string, error: unknown): object {
    return {
      content: [
        {
          type: 'text',
          text: `Error executing ${toolName}: ${error instanceof Error ? error.message : String(error)}`
        }
      ],
      isError: true
    };
  }

  static formatSuccessResponse(text: string): object {
    return {
      content: [
        {
          type: 'text',
          text
        }
      ]
    };
  }
}