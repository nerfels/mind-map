import { MindMapStorage } from './MindMapStorage.js';
import { MindMapNode, ArchitecturalPattern, ArchitecturalInsight } from '../types/index.js';

export class ArchitecturalAnalyzer {
  private storage: MindMapStorage;

  constructor(storage: MindMapStorage) {
    this.storage = storage;
  }

  analyzeProjectArchitecture(): ArchitecturalInsight[] {
    const insights: ArchitecturalInsight[] = [];
    
    // Get all nodes for analysis
    const allNodes = this.storage.findNodes(() => true);
    const fileNodes = allNodes.filter(node => node.type === 'file');
    const directoryNodes = allNodes.filter(node => node.type === 'directory');
    
    // Detect various architectural patterns
    insights.push(...this.detectLayeredArchitecture(fileNodes, directoryNodes));
    insights.push(...this.detectMVCPattern(fileNodes, directoryNodes));
    insights.push(...this.detectMicroservicesPattern(fileNodes, directoryNodes));
    insights.push(...this.detectRepositoryPattern(fileNodes));
    insights.push(...this.detectFactoryPattern(fileNodes));
    insights.push(...this.detectObserverPattern(fileNodes));
    insights.push(...this.detectPluginArchitecture(fileNodes, directoryNodes));
    
    return insights.sort((a, b) => b.confidence - a.confidence);
  }

  private detectLayeredArchitecture(fileNodes: MindMapNode[], directoryNodes: MindMapNode[]): ArchitecturalInsight[] {
    const insights: ArchitecturalInsight[] = [];
    
    // Look for common layer patterns
    const layerIndicators = {
      'presentation': ['index.ts', 'server.ts', 'app.ts', 'main.ts', 'api', 'routes', 'controllers', 'handlers'],
      'business': ['core', 'service', 'business', 'domain', 'logic', 'engine'],
      'data': ['storage', 'repository', 'dao', 'database', 'db', 'data', 'persistence'],
      'shared': ['types', 'utils', 'common', 'shared', 'helpers', 'tools']
    };

    const detectedLayers: { [key: string]: MindMapNode[] } = {};
    let totalLayerScore = 0;

    // Analyze directories for layer patterns
    for (const [layerType, indicators] of Object.entries(layerIndicators)) {
      const layerNodes: MindMapNode[] = [];
      
      for (const node of [...directoryNodes, ...fileNodes]) {
        const nodeName = node.name.toLowerCase();
        const nodePath = (node.path || '').toLowerCase();
        
        for (const indicator of indicators) {
          if (nodeName.includes(indicator) || nodePath.includes(indicator)) {
            layerNodes.push(node);
            totalLayerScore += 1;
            break;
          }
        }
      }
      
      if (layerNodes.length > 0) {
        detectedLayers[layerType] = layerNodes;
      }
    }

    // Calculate confidence based on layer separation
    const layerCount = Object.keys(detectedLayers).length;
    if (layerCount >= 2) {
      const confidence = Math.min(0.3 + (layerCount * 0.15) + (totalLayerScore * 0.05), 0.95);
      
      insights.push({
        id: 'layered-architecture',
        patternType: 'architectural',
        name: 'Layered Architecture',
        description: `Project follows a ${layerCount}-layer architecture pattern with clear separation of concerns`,
        confidence,
        evidence: Object.entries(detectedLayers).map(([layer, nodes]) => 
          `${layer} layer: ${nodes.map(n => n.name).join(', ')}`
        ),
        affectedFiles: Object.values(detectedLayers).flat().map(n => n.path || n.name),
        recommendations: [
          'Maintain clear boundaries between layers',
          'Ensure dependencies flow in one direction (top-down)',
          'Keep business logic independent from presentation and data layers'
        ]
      });
    }

    return insights;
  }

  private detectMVCPattern(fileNodes: MindMapNode[], directoryNodes: MindMapNode[]): ArchitecturalInsight[] {
    const insights: ArchitecturalInsight[] = [];
    
    const mvcIndicators = {
      'model': ['model', 'entity', 'schema', 'data'],
      'view': ['view', 'template', 'component', 'ui', 'frontend'],
      'controller': ['controller', 'handler', 'route', 'api']
    };

    const detectedMVC: { [key: string]: MindMapNode[] } = {};
    let mvcScore = 0;

    for (const [componentType, indicators] of Object.entries(mvcIndicators)) {
      const componentNodes: MindMapNode[] = [];
      
      for (const node of [...directoryNodes, ...fileNodes]) {
        const nodeName = node.name.toLowerCase();
        const nodePath = (node.path || '').toLowerCase();
        
        for (const indicator of indicators) {
          if (nodeName.includes(indicator) || nodePath.includes(indicator)) {
            componentNodes.push(node);
            mvcScore += 1;
            break;
          }
        }
      }
      
      if (componentNodes.length > 0) {
        detectedMVC[componentType] = componentNodes;
      }
    }

    const mvcComponentCount = Object.keys(detectedMVC).length;
    if (mvcComponentCount >= 2) {
      const confidence = Math.min(0.4 + (mvcComponentCount * 0.2) + (mvcScore * 0.03), 0.9);
      
      insights.push({
        id: 'mvc-pattern',
        patternType: 'architectural',
        name: 'MVC (Model-View-Controller)',
        description: `Project follows MVC pattern with ${mvcComponentCount}/3 components identified`,
        confidence,
        evidence: Object.entries(detectedMVC).map(([component, nodes]) => 
          `${component}: ${nodes.map(n => n.name).join(', ')}`
        ),
        affectedFiles: Object.values(detectedMVC).flat().map(n => n.path || n.name),
        recommendations: [
          'Keep models independent of views and controllers',
          'Controllers should mediate between models and views',
          'Views should only contain presentation logic'
        ]
      });
    }

    return insights;
  }

  private detectMicroservicesPattern(fileNodes: MindMapNode[], directoryNodes: MindMapNode[]): ArchitecturalInsight[] {
    const insights: ArchitecturalInsight[] = [];
    
    const microserviceIndicators = [
      'service', 'microservice', 'api', 'gateway', 'proxy', 'docker', 
      'kubernetes', 'k8s', 'helm', 'compose'
    ];

    let microserviceScore = 0;
    const evidence: string[] = [];
    const affectedFiles: string[] = [];

    // Check for microservice-related files and directories
    for (const node of [...directoryNodes, ...fileNodes]) {
      const nodeName = node.name.toLowerCase();
      const nodePath = (node.path || '').toLowerCase();
      
      for (const indicator of microserviceIndicators) {
        if (nodeName.includes(indicator) || nodePath.includes(indicator)) {
          microserviceScore += 1;
          evidence.push(`${indicator} pattern in ${node.name}`);
          affectedFiles.push(node.path || node.name);
          break;
        }
      }
    }

    // Check for multiple service directories
    const serviceDirectories = directoryNodes.filter(node => 
      node.name.toLowerCase().includes('service') || 
      node.name.toLowerCase().includes('api')
    );

    if (serviceDirectories.length > 1) {
      microserviceScore += serviceDirectories.length * 2;
      evidence.push(`Multiple service directories: ${serviceDirectories.map(s => s.name).join(', ')}`);
    }

    if (microserviceScore >= 2) {
      const confidence = Math.min(0.2 + (microserviceScore * 0.1), 0.85);
      
      insights.push({
        id: 'microservices-pattern',
        patternType: 'architectural',
        name: 'Microservices Architecture',
        description: `Project shows microservices characteristics with ${serviceDirectories.length} service components`,
        confidence,
        evidence,
        affectedFiles,
        recommendations: [
          'Ensure services are loosely coupled',
          'Implement proper service discovery',
          'Use API gateways for external communication',
          'Monitor service health and dependencies'
        ]
      });
    }

    return insights;
  }

  private detectRepositoryPattern(fileNodes: MindMapNode[]): ArchitecturalInsight[] {
    const insights: ArchitecturalInsight[] = [];
    
    const repositoryFiles = fileNodes.filter(node => {
      const name = node.name.toLowerCase();
      const path = (node.path || '').toLowerCase();
      return name.includes('repository') || 
             name.includes('repo') ||
             path.includes('repository') ||
             (name.includes('storage') && !name.includes('local'));
    });

    if (repositoryFiles.length > 0) {
      const confidence = Math.min(0.5 + (repositoryFiles.length * 0.1), 0.9);
      
      insights.push({
        id: 'repository-pattern',
        patternType: 'design',
        name: 'Repository Pattern',
        description: `Data access abstraction through ${repositoryFiles.length} repository implementations`,
        confidence,
        evidence: repositoryFiles.map(f => `Repository: ${f.name}`),
        affectedFiles: repositoryFiles.map(f => f.path || f.name),
        recommendations: [
          'Keep repositories focused on data access only',
          'Use interfaces to abstract repository implementations',
          'Avoid business logic in repository classes'
        ]
      });
    }

    return insights;
  }

  private detectFactoryPattern(fileNodes: MindMapNode[]): ArchitecturalInsight[] {
    const insights: ArchitecturalInsight[] = [];
    
    const factoryFiles = fileNodes.filter(node => {
      const name = node.name.toLowerCase();
      return name.includes('factory') || 
             name.includes('builder') ||
             name.includes('creator');
    });

    if (factoryFiles.length > 0) {
      const confidence = Math.min(0.6 + (factoryFiles.length * 0.1), 0.85);
      
      insights.push({
        id: 'factory-pattern',
        patternType: 'design',
        name: 'Factory Pattern',
        description: `Object creation abstracted through ${factoryFiles.length} factory implementations`,
        confidence,
        evidence: factoryFiles.map(f => `Factory: ${f.name}`),
        affectedFiles: factoryFiles.map(f => f.path || f.name),
        recommendations: [
          'Keep object creation logic centralized in factories',
          'Use factories to hide complex object initialization',
          'Consider using dependency injection with factories'
        ]
      });
    }

    return insights;
  }

  private detectObserverPattern(fileNodes: MindMapNode[]): ArchitecturalInsight[] {
    const insights: ArchitecturalInsight[] = [];
    
    const observerFiles = fileNodes.filter(node => {
      const name = node.name.toLowerCase();
      const path = (node.path || '').toLowerCase();
      return name.includes('observer') || 
             name.includes('listener') ||
             name.includes('event') ||
             name.includes('emitter') ||
             path.includes('events');
    });

    if (observerFiles.length > 0) {
      const confidence = Math.min(0.4 + (observerFiles.length * 0.15), 0.8);
      
      insights.push({
        id: 'observer-pattern',
        patternType: 'design',
        name: 'Observer Pattern',
        description: `Event-driven architecture with ${observerFiles.length} observer/listener implementations`,
        confidence,
        evidence: observerFiles.map(f => `Observer component: ${f.name}`),
        affectedFiles: observerFiles.map(f => f.path || f.name),
        recommendations: [
          'Keep observers loosely coupled from subjects',
          'Use proper event naming conventions',
          'Consider using event buses for complex scenarios'
        ]
      });
    }

    return insights;
  }

  private detectPluginArchitecture(fileNodes: MindMapNode[], directoryNodes: MindMapNode[]): ArchitecturalInsight[] {
    const insights: ArchitecturalInsight[] = [];
    
    const pluginIndicators = ['plugin', 'extension', 'addon', 'module', 'middleware'];
    let pluginScore = 0;
    const evidence: string[] = [];
    const affectedFiles: string[] = [];

    for (const node of [...directoryNodes, ...fileNodes]) {
      const name = node.name.toLowerCase();
      const path = (node.path || '').toLowerCase();
      
      for (const indicator of pluginIndicators) {
        if (name.includes(indicator) || path.includes(indicator)) {
          pluginScore += 1;
          evidence.push(`${indicator} architecture: ${node.name}`);
          affectedFiles.push(node.path || node.name);
          break;
        }
      }
    }

    if (pluginScore >= 2) {
      const confidence = Math.min(0.3 + (pluginScore * 0.1), 0.75);
      
      insights.push({
        id: 'plugin-architecture',
        patternType: 'architectural',
        name: 'Plugin Architecture',
        description: `Extensible architecture with ${pluginScore} plugin/extension components`,
        confidence,
        evidence,
        affectedFiles,
        recommendations: [
          'Define clear plugin interfaces and contracts',
          'Implement plugin discovery and loading mechanisms',
          'Ensure plugins are isolated and sandboxed',
          'Provide plugin lifecycle management'
        ]
      });
    }

    return insights;
  }
}