import { readFile, access } from 'fs/promises';
import { join, dirname } from 'path';
import { MindMapStorage } from './MindMapStorage.js';
import { MindMapNode } from '../types/index.js';

export interface FrameworkInfo {
  name: string;
  version?: string;
  category: 'web' | 'mobile' | 'desktop' | 'game' | 'ml_ai' | 'cloud' | 'testing' | 'database' | 'build';
  confidence: number;
  evidence: string[];
  configurations: string[];
  patterns: FrameworkPattern[];
}

export interface FrameworkPattern {
  type: 'file_structure' | 'dependency' | 'import' | 'config' | 'convention';
  description: string;
  files?: string[];
  dependencies?: string[];
  imports?: string[];
  confidence: number;
}

export class EnhancedFrameworkDetector {
  private storage: MindMapStorage;
  private frameworkCache: Map<string, FrameworkInfo[]> = new Map();

  constructor(storage: MindMapStorage) {
    this.storage = storage;
  }

  /**
   * Comprehensive framework detection across all supported languages
   */
  async detectFrameworks(projectRoot: string, forceRefresh = false): Promise<Map<string, FrameworkInfo[]>> {
    if (!forceRefresh && this.frameworkCache.size > 0) {
      return this.frameworkCache;
    }

    const frameworks = new Map<string, FrameworkInfo[]>();

    // Get all file nodes for analysis
    const fileNodes = this.storage.findNodes(node => node.type === 'file');
    
    // Detect frameworks by language
    frameworks.set('web', await this.detectWebFrameworks(projectRoot, fileNodes));
    frameworks.set('mobile', await this.detectMobileFrameworks(projectRoot, fileNodes));
    frameworks.set('desktop', await this.detectDesktopFrameworks(projectRoot, fileNodes));
    frameworks.set('game', await this.detectGameEngines(projectRoot, fileNodes));
    frameworks.set('ml_ai', await this.detectMLAIFrameworks(projectRoot, fileNodes));
    frameworks.set('cloud', await this.detectCloudFrameworks(projectRoot, fileNodes));

    // Cache results
    this.frameworkCache = frameworks;
    return frameworks;
  }

  /**
   * Web Framework Detection
   * Express, React, Vue, Angular, Django, Flask, Spring Boot, FastAPI, Next.js, Nuxt.js
   */
  private async detectWebFrameworks(projectRoot: string, fileNodes: MindMapNode[]): Promise<FrameworkInfo[]> {
    const frameworks: FrameworkInfo[] = [];
    
    // React Detection
    const reactFramework = await this.detectReact(projectRoot, fileNodes);
    if (reactFramework) frameworks.push(reactFramework);

    // Vue Detection  
    const vueFramework = await this.detectVue(projectRoot, fileNodes);
    if (vueFramework) frameworks.push(vueFramework);

    // Angular Detection
    const angularFramework = await this.detectAngular(projectRoot, fileNodes);
    if (angularFramework) frameworks.push(angularFramework);

    // Express Detection
    const expressFramework = await this.detectExpress(projectRoot, fileNodes);
    if (expressFramework) frameworks.push(expressFramework);

    // Django Detection
    const djangoFramework = await this.detectDjango(projectRoot, fileNodes);
    if (djangoFramework) frameworks.push(djangoFramework);

    // Flask Detection
    const flaskFramework = await this.detectFlask(projectRoot, fileNodes);
    if (flaskFramework) frameworks.push(flaskFramework);

    // Spring Boot Detection
    const springFramework = await this.detectSpringBoot(projectRoot, fileNodes);
    if (springFramework) frameworks.push(springFramework);

    // FastAPI Detection
    const fastApiFramework = await this.detectFastAPI(projectRoot, fileNodes);
    if (fastApiFramework) frameworks.push(fastApiFramework);

    // Next.js Detection
    const nextFramework = await this.detectNextJS(projectRoot, fileNodes);
    if (nextFramework) frameworks.push(nextFramework);

    // Nuxt.js Detection
    const nuxtFramework = await this.detectNuxtJS(projectRoot, fileNodes);
    if (nuxtFramework) frameworks.push(nuxtFramework);

    return frameworks;
  }

  /**
   * React Framework Detection with Deep Analysis
   */
  private async detectReact(projectRoot: string, fileNodes: MindMapNode[]): Promise<FrameworkInfo | null> {
    const evidence: string[] = [];
    const patterns: FrameworkPattern[] = [];
    const configurations: string[] = [];
    let confidence = 0;
    let version: string | undefined;

    // Check package.json for React dependency
    try {
      const packageJsonPath = join(projectRoot, 'package.json');
      const packageContent = await readFile(packageJsonPath, 'utf-8');
      const packageJson = JSON.parse(packageContent);
      
      if (packageJson.dependencies?.react || packageJson.devDependencies?.react) {
        evidence.push('React dependency in package.json');
        version = packageJson.dependencies?.react || packageJson.devDependencies?.react;
        confidence += 40;
        configurations.push('package.json');
      }

      if (packageJson.dependencies?.['react-dom'] || packageJson.devDependencies?.['react-dom']) {
        evidence.push('React DOM dependency found');
        confidence += 20;
      }

      if (packageJson.dependencies?.['react-router'] || packageJson.dependencies?.['react-router-dom']) {
        evidence.push('React Router for navigation');
        confidence += 10;
        patterns.push({
          type: 'dependency',
          description: 'React Router navigation pattern',
          dependencies: ['react-router-dom'],
          confidence: 0.8
        });
      }
    } catch (error) {
      // Continue without package.json
    }

    // Check for React-specific file patterns
    const jsxFiles = fileNodes.filter(node => 
      node.name.endsWith('.jsx') || node.name.endsWith('.tsx')
    );
    
    if (jsxFiles.length > 0) {
      evidence.push(`${jsxFiles.length} JSX/TSX files found`);
      confidence += Math.min(jsxFiles.length * 5, 25);
      
      patterns.push({
        type: 'file_structure',
        description: 'JSX/TSX component files',
        files: jsxFiles.map(f => f.name),
        confidence: 0.9
      });
    }

    // Check for React imports in code
    let reactImportsFound = 0;
    for (const fileNode of fileNodes) {
      if (fileNode.metadata.language === 'typescript' || fileNode.metadata.language === 'javascript') {
        try {
          const content = await readFile(fileNode.path || '', 'utf-8');
          
          if (content.includes('import React') || content.includes("from 'react'")) {
            reactImportsFound++;
            if (reactImportsFound === 1) {
              evidence.push('React imports found in code');
              confidence += 15;
            }
          }

          // Check for React hooks
          if (content.match(/use(State|Effect|Context|Reducer|Memo|Callback)/)) {
            evidence.push('React hooks usage detected');
            confidence += 10;
            patterns.push({
              type: 'convention',
              description: 'React hooks pattern usage',
              confidence: 0.85
            });
          }

          // Check for JSX syntax
          if (content.includes('<') && content.includes('/>')) {
            evidence.push('JSX syntax detected');
            confidence += 5;
          }
        } catch (error) {
          // Continue if file can't be read
        }
      }
    }

    // Check for React configuration files
    const configFiles = ['vite.config.ts', 'vite.config.js', 'webpack.config.js', '.babelrc'];
    for (const configFile of configFiles) {
      try {
        await access(join(projectRoot, configFile));
        configurations.push(configFile);
        evidence.push(`React build configuration: ${configFile}`);
        confidence += 5;
      } catch (error) {
        // File doesn't exist, continue
      }
    }

    if (confidence > 20) {
      return {
        name: 'React',
        version,
        category: 'web',
        confidence: Math.min(confidence / 100, 0.95),
        evidence,
        configurations,
        patterns
      };
    }

    return null;
  }

  /**
   * Vue.js Framework Detection
   */
  private async detectVue(projectRoot: string, fileNodes: MindMapNode[]): Promise<FrameworkInfo | null> {
    const evidence: string[] = [];
    const patterns: FrameworkPattern[] = [];
    const configurations: string[] = [];
    let confidence = 0;
    let version: string | undefined;

    // Check package.json for Vue dependency
    try {
      const packageJsonPath = join(projectRoot, 'package.json');
      const packageContent = await readFile(packageJsonPath, 'utf-8');
      const packageJson = JSON.parse(packageContent);
      
      if (packageJson.dependencies?.vue || packageJson.devDependencies?.vue) {
        evidence.push('Vue dependency in package.json');
        version = packageJson.dependencies?.vue || packageJson.devDependencies?.vue;
        confidence += 40;
        configurations.push('package.json');
      }

      if (packageJson.dependencies?.['vue-router']) {
        evidence.push('Vue Router for navigation');
        confidence += 15;
      }

      if (packageJson.dependencies?.vuex || packageJson.dependencies?.pinia) {
        evidence.push('Vue state management (Vuex/Pinia)');
        confidence += 10;
      }
    } catch (error) {
      // Continue without package.json
    }

    // Check for Vue-specific file patterns
    const vueFiles = fileNodes.filter(node => node.name.endsWith('.vue'));
    
    if (vueFiles.length > 0) {
      evidence.push(`${vueFiles.length} Vue Single File Components found`);
      confidence += Math.min(vueFiles.length * 8, 30);
      
      patterns.push({
        type: 'file_structure',
        description: 'Vue Single File Components (.vue files)',
        files: vueFiles.map(f => f.name),
        confidence: 0.95
      });
    }

    // Check for Vue configuration files
    const configFiles = ['vue.config.js', 'vite.config.ts', 'vite.config.js'];
    for (const configFile of configFiles) {
      try {
        await access(join(projectRoot, configFile));
        configurations.push(configFile);
        evidence.push(`Vue configuration: ${configFile}`);
        confidence += 10;
      } catch (error) {
        // File doesn't exist, continue
      }
    }

    if (confidence > 20) {
      return {
        name: 'Vue.js',
        version,
        category: 'web',
        confidence: Math.min(confidence / 100, 0.95),
        evidence,
        configurations,
        patterns
      };
    }

    return null;
  }

  /**
   * Angular Framework Detection
   */
  private async detectAngular(projectRoot: string, fileNodes: MindMapNode[]): Promise<FrameworkInfo | null> {
    const evidence: string[] = [];
    const patterns: FrameworkPattern[] = [];
    const configurations: string[] = [];
    let confidence = 0;
    let version: string | undefined;

    // Check for angular.json
    try {
      await access(join(projectRoot, 'angular.json'));
      evidence.push('Angular CLI configuration found');
      configurations.push('angular.json');
      confidence += 50;
    } catch (error) {
      // File doesn't exist
    }

    // Check package.json for Angular dependencies
    try {
      const packageJsonPath = join(projectRoot, 'package.json');
      const packageContent = await readFile(packageJsonPath, 'utf-8');
      const packageJson = JSON.parse(packageContent);
      
      if (packageJson.dependencies?.['@angular/core']) {
        evidence.push('Angular core dependency');
        version = packageJson.dependencies['@angular/core'];
        confidence += 40;
      }

      if (packageJson.dependencies?.['@angular/common']) {
        evidence.push('Angular common package');
        confidence += 10;
      }

      if (packageJson.devDependencies?.['@angular/cli']) {
        evidence.push('Angular CLI development dependency');
        confidence += 15;
      }
    } catch (error) {
      // Continue without package.json
    }

    // Check for Angular-specific file patterns
    const componentFiles = fileNodes.filter(node => 
      node.name.endsWith('.component.ts') || node.name.endsWith('.component.html')
    );
    
    if (componentFiles.length > 0) {
      evidence.push(`${componentFiles.length} Angular component files`);
      confidence += Math.min(componentFiles.length * 5, 20);
      
      patterns.push({
        type: 'file_structure',
        description: 'Angular component architecture',
        files: componentFiles.map(f => f.name),
        confidence: 0.9
      });
    }

    const serviceFiles = fileNodes.filter(node => node.name.endsWith('.service.ts'));
    if (serviceFiles.length > 0) {
      evidence.push(`${serviceFiles.length} Angular service files`);
      confidence += Math.min(serviceFiles.length * 3, 15);
    }

    if (confidence > 25) {
      return {
        name: 'Angular',
        version,
        category: 'web',
        confidence: Math.min(confidence / 100, 0.95),
        evidence,
        configurations,
        patterns
      };
    }

    return null;
  }

  /**
   * Express.js Framework Detection
   */
  private async detectExpress(projectRoot: string, fileNodes: MindMapNode[]): Promise<FrameworkInfo | null> {
    const evidence: string[] = [];
    const patterns: FrameworkPattern[] = [];
    const configurations: string[] = [];
    let confidence = 0;
    let version: string | undefined;

    // Check package.json for Express
    try {
      const packageJsonPath = join(projectRoot, 'package.json');
      const packageContent = await readFile(packageJsonPath, 'utf-8');
      const packageJson = JSON.parse(packageContent);
      
      if (packageJson.dependencies?.express) {
        evidence.push('Express.js dependency');
        version = packageJson.dependencies.express;
        confidence += 50;
        configurations.push('package.json');
      }
    } catch (error) {
      // Continue without package.json
    }

    // Check for Express usage in code
    for (const fileNode of fileNodes) {
      if (fileNode.metadata.language === 'typescript' || fileNode.metadata.language === 'javascript') {
        try {
          const content = await readFile(fileNode.path || '', 'utf-8');
          
          if (content.includes("require('express')") || content.includes("from 'express'")) {
            evidence.push('Express import found');
            confidence += 20;
          }

          if (content.includes('.listen(') && content.includes('app.')) {
            evidence.push('Express server setup pattern');
            confidence += 15;
            patterns.push({
              type: 'convention',
              description: 'Express server initialization pattern',
              confidence: 0.8
            });
          }

          if (content.match(/\.(get|post|put|delete|use)\s*\(/)) {
            evidence.push('Express route handlers');
            confidence += 10;
          }
        } catch (error) {
          // Continue if file can't be read
        }
      }
    }

    if (confidence > 30) {
      return {
        name: 'Express.js',
        version,
        category: 'web',
        confidence: Math.min(confidence / 100, 0.95),
        evidence,
        configurations,
        patterns
      };
    }

    return null;
  }

  /**
   * Django Framework Detection
   */
  private async detectDjango(projectRoot: string, fileNodes: MindMapNode[]): Promise<FrameworkInfo | null> {
    const evidence: string[] = [];
    const patterns: FrameworkPattern[] = [];
    const configurations: string[] = [];
    let confidence = 0;
    let version: string | undefined;

    // Check for Django-specific files
    const djangoFiles = ['manage.py', 'settings.py', 'urls.py', 'wsgi.py'];
    let djangoFileCount = 0;

    for (const djangoFile of djangoFiles) {
      if (fileNodes.some(node => node.name === djangoFile)) {
        djangoFileCount++;
        evidence.push(`Django file found: ${djangoFile}`);
        configurations.push(djangoFile);
      }
    }

    if (djangoFileCount > 0) {
      confidence += djangoFileCount * 20;
    }

    // Check for Django imports in Python files
    const pythonFiles = fileNodes.filter(node => 
      node.metadata.language === 'python'
    );

    let djangoImports = 0;
    for (const fileNode of pythonFiles) {
      try {
        const content = await readFile(fileNode.path || '', 'utf-8');
        
        if (content.includes('from django') || content.includes('import django')) {
          djangoImports++;
          if (djangoImports === 1) {
            evidence.push('Django imports found in Python code');
            confidence += 25;
          }
        }

        if (content.includes('django.db.models') || content.includes('from django.db import models')) {
          evidence.push('Django ORM models detected');
          confidence += 15;
          patterns.push({
            type: 'convention',
            description: 'Django ORM model pattern',
            confidence: 0.9
          });
        }

        if (content.includes('HttpResponse') || content.includes('render(')) {
          evidence.push('Django view patterns');
          confidence += 10;
        }
      } catch (error) {
        // Continue if file can't be read
      }
    }

    if (confidence > 25) {
      return {
        name: 'Django',
        version,
        category: 'web',
        confidence: Math.min(confidence / 100, 0.95),
        evidence,
        configurations,
        patterns
      };
    }

    return null;
  }

  /**
   * Flask Framework Detection
   */
  private async detectFlask(projectRoot: string, fileNodes: MindMapNode[]): Promise<FrameworkInfo | null> {
    const evidence: string[] = [];
    const patterns: FrameworkPattern[] = [];
    const configurations: string[] = [];
    let confidence = 0;
    let version: string | undefined;

    // Check for Flask imports and usage
    const pythonFiles = fileNodes.filter(node => 
      node.metadata.language === 'python'
    );

    for (const fileNode of pythonFiles) {
      try {
        const content = await readFile(fileNode.path || '', 'utf-8');
        
        if (content.includes('from flask import') || content.includes('import flask')) {
          evidence.push('Flask imports found');
          confidence += 40;
        }

        if (content.includes('Flask(__name__)')) {
          evidence.push('Flask app initialization');
          confidence += 30;
          patterns.push({
            type: 'convention',
            description: 'Flask application factory pattern',
            confidence: 0.85
          });
        }

        if (content.includes('@app.route(')) {
          evidence.push('Flask route decorators');
          confidence += 20;
          patterns.push({
            type: 'convention',
            description: 'Flask route decorator pattern',
            confidence: 0.9
          });
        }
      } catch (error) {
        // Continue if file can't be read
      }
    }

    if (confidence > 30) {
      return {
        name: 'Flask',
        version,
        category: 'web',
        confidence: Math.min(confidence / 100, 0.95),
        evidence,
        configurations,
        patterns
      };
    }

    return null;
  }

  // Placeholder implementations for other framework detections
  private async detectSpringBoot(projectRoot: string, fileNodes: MindMapNode[]): Promise<FrameworkInfo | null> {
    // Spring Boot detection logic - checking for @SpringBootApplication, pom.xml with Spring Boot dependencies
    return null;
  }

  private async detectFastAPI(projectRoot: string, fileNodes: MindMapNode[]): Promise<FrameworkInfo | null> {
    // FastAPI detection logic - checking for FastAPI imports and decorators
    return null;
  }

  private async detectNextJS(projectRoot: string, fileNodes: MindMapNode[]): Promise<FrameworkInfo | null> {
    // Next.js detection logic - checking for next.config.js, pages directory, Next.js imports
    return null;
  }

  private async detectNuxtJS(projectRoot: string, fileNodes: MindMapNode[]): Promise<FrameworkInfo | null> {
    // Nuxt.js detection logic - checking for nuxt.config.js, Nuxt-specific directory structure
    return null;
  }

  /**
   * Mobile Framework Detection
   */
  private async detectMobileFrameworks(projectRoot: string, fileNodes: MindMapNode[]): Promise<FrameworkInfo[]> {
    const frameworks: FrameworkInfo[] = [];

    // React Native
    const reactNative = await this.detectReactNative(projectRoot, fileNodes);
    if (reactNative) frameworks.push(reactNative);

    // Flutter
    const flutter = await this.detectFlutter(projectRoot, fileNodes);
    if (flutter) frameworks.push(flutter);

    // Xamarin
    const xamarin = await this.detectXamarin(projectRoot, fileNodes);
    if (xamarin) frameworks.push(xamarin);

    return frameworks;
  }

  private async detectReactNative(projectRoot: string, fileNodes: MindMapNode[]): Promise<FrameworkInfo | null> {
    const evidence: string[] = [];
    const patterns: FrameworkPattern[] = [];
    const configurations: string[] = [];
    let confidence = 0;
    let version: string | undefined;

    // Check package.json for React Native
    try {
      const packageJsonPath = join(projectRoot, 'package.json');
      const packageContent = await readFile(packageJsonPath, 'utf-8');
      const packageJson = JSON.parse(packageContent);
      
      if (packageJson.dependencies?.['react-native']) {
        evidence.push('React Native dependency');
        version = packageJson.dependencies['react-native'];
        confidence += 50;
        configurations.push('package.json');
      }

      if (packageJson.dependencies?.['@react-native-community/cli']) {
        evidence.push('React Native CLI');
        confidence += 20;
      }
    } catch (error) {
      // Continue without package.json
    }

    // Check for React Native specific files
    const rnConfigFiles = ['metro.config.js', 'react-native.config.js', 'ios/', 'android/'];
    for (const configFile of rnConfigFiles) {
      if (fileNodes.some(node => node.name === configFile || node.path?.includes(configFile))) {
        evidence.push(`React Native config: ${configFile}`);
        configurations.push(configFile);
        confidence += 15;
      }
    }

    // Check for React Native imports
    for (const fileNode of fileNodes) {
      if (fileNode.metadata.language === 'typescript' || fileNode.metadata.language === 'javascript') {
        try {
          const content = await readFile(fileNode.path || '', 'utf-8');
          
          if (content.includes("from 'react-native'") || content.includes("require('react-native')")) {
            evidence.push('React Native imports found');
            confidence += 25;
          }

          if (content.includes('<View>') || content.includes('<Text>') || content.includes('<TouchableOpacity>')) {
            evidence.push('React Native components detected');
            confidence += 15;
            patterns.push({
              type: 'convention',
              description: 'React Native mobile component usage',
              confidence: 0.85
            });
          }
        } catch (error) {
          // Continue if file can't be read
        }
      }
    }

    if (confidence > 30) {
      return {
        name: 'React Native',
        version,
        category: 'mobile',
        confidence: Math.min(confidence / 100, 0.95),
        evidence,
        configurations,
        patterns
      };
    }

    return null;
  }

  private async detectFlutter(projectRoot: string, fileNodes: MindMapNode[]): Promise<FrameworkInfo | null> {
    const evidence: string[] = [];
    const patterns: FrameworkPattern[] = [];
    const configurations: string[] = [];
    let confidence = 0;
    let version: string | undefined;

    // Check for pubspec.yaml
    try {
      const pubspecPath = join(projectRoot, 'pubspec.yaml');
      const pubspecContent = await readFile(pubspecPath, 'utf-8');
      
      if (pubspecContent.includes('flutter:')) {
        evidence.push('Flutter configuration in pubspec.yaml');
        confidence += 50;
        configurations.push('pubspec.yaml');
        
        // Extract Flutter version
        const versionMatch = pubspecContent.match(/flutter:\s*[\n\r\s]*sdk:\s*["']?([^"'\n\r]+)/);
        if (versionMatch) {
          version = versionMatch[1];
        }
      }
    } catch (error) {
      // Continue without pubspec.yaml
    }

    // Check for Dart files
    const dartFiles = fileNodes.filter(node => node.name.endsWith('.dart'));
    
    if (dartFiles.length > 0) {
      evidence.push(`${dartFiles.length} Dart files found`);
      confidence += Math.min(dartFiles.length * 5, 30);
      
      patterns.push({
        type: 'file_structure',
        description: 'Flutter Dart source files',
        files: dartFiles.map(f => f.name),
        confidence: 0.9
      });
    }

    // Check for Flutter imports in Dart files
    for (const fileNode of dartFiles) {
      try {
        const content = await readFile(fileNode.path || '', 'utf-8');
        
        if (content.includes("import 'package:flutter/")) {
          evidence.push('Flutter package imports');
          confidence += 20;
        }

        if (content.includes('StatelessWidget') || content.includes('StatefulWidget')) {
          evidence.push('Flutter widget patterns');
          confidence += 15;
          patterns.push({
            type: 'convention',
            description: 'Flutter widget architecture',
            confidence: 0.9
          });
        }
      } catch (error) {
        // Continue if file can't be read
      }
    }

    if (confidence > 30) {
      return {
        name: 'Flutter',
        version,
        category: 'mobile',
        confidence: Math.min(confidence / 100, 0.95),
        evidence,
        configurations,
        patterns
      };
    }

    return null;
  }

  private async detectXamarin(projectRoot: string, fileNodes: MindMapNode[]): Promise<FrameworkInfo | null> {
    const evidence: string[] = [];
    const patterns: FrameworkPattern[] = [];
    const configurations: string[] = [];
    let confidence = 0;
    let version: string | undefined;

    // Check for Xamarin project files
    const xamarinFiles = fileNodes.filter(node => 
      node.name.endsWith('.csproj') || 
      node.name.endsWith('.sln') ||
      node.name === 'packages.config'
    );

    for (const file of xamarinFiles) {
      try {
        const content = await readFile(file.path || '', 'utf-8');
        
        if (content.includes('Xamarin.Forms') || content.includes('Xamarin.iOS') || content.includes('Xamarin.Android')) {
          evidence.push('Xamarin references in project file');
          confidence += 40;
          configurations.push(file.name);
        }
      } catch (error) {
        // Continue if file can't be read
      }
    }

    // Check C# files for Xamarin usage
    const csharpFiles = fileNodes.filter(node => node.name.endsWith('.cs'));
    
    for (const fileNode of csharpFiles) {
      try {
        const content = await readFile(fileNode.path || '', 'utf-8');
        
        if (content.includes('using Xamarin.Forms') || content.includes('using Xamarin.')) {
          evidence.push('Xamarin namespace usage');
          confidence += 25;
        }

        if (content.includes('ContentPage') || content.includes('Application')) {
          evidence.push('Xamarin.Forms patterns');
          confidence += 15;
          patterns.push({
            type: 'convention',
            description: 'Xamarin.Forms UI patterns',
            confidence: 0.8
          });
        }
      } catch (error) {
        // Continue if file can't be read
      }
    }

    if (confidence > 30) {
      return {
        name: 'Xamarin',
        version,
        category: 'mobile',
        confidence: Math.min(confidence / 100, 0.95),
        evidence,
        configurations,
        patterns
      };
    }

    return null;
  }

  /**
   * Desktop Framework Detection
   */
  private async detectDesktopFrameworks(projectRoot: string, fileNodes: MindMapNode[]): Promise<FrameworkInfo[]> {
    const frameworks: FrameworkInfo[] = [];

    // Electron
    const electron = await this.detectElectron(projectRoot, fileNodes);
    if (electron) frameworks.push(electron);

    // Tauri
    const tauri = await this.detectTauri(projectRoot, fileNodes);
    if (tauri) frameworks.push(tauri);

    // Qt
    const qt = await this.detectQt(projectRoot, fileNodes);
    if (qt) frameworks.push(qt);

    return frameworks;
  }

  private async detectElectron(projectRoot: string, fileNodes: MindMapNode[]): Promise<FrameworkInfo | null> {
    const evidence: string[] = [];
    const patterns: FrameworkPattern[] = [];
    const configurations: string[] = [];
    let confidence = 0;
    let version: string | undefined;

    // Check package.json for Electron
    try {
      const packageJsonPath = join(projectRoot, 'package.json');
      const packageContent = await readFile(packageJsonPath, 'utf-8');
      const packageJson = JSON.parse(packageContent);
      
      if (packageJson.dependencies?.electron || packageJson.devDependencies?.electron) {
        evidence.push('Electron dependency');
        version = packageJson.dependencies?.electron || packageJson.devDependencies?.electron;
        confidence += 50;
        configurations.push('package.json');
      }

      if (packageJson.main) {
        evidence.push(`Main process file: ${packageJson.main}`);
        confidence += 10;
      }
    } catch (error) {
      // Continue without package.json
    }

    // Check for Electron-specific files
    const electronFiles = ['main.js', 'main.ts', 'electron-builder.yml', 'forge.config.js'];
    for (const file of electronFiles) {
      if (fileNodes.some(node => node.name === file)) {
        evidence.push(`Electron config: ${file}`);
        configurations.push(file);
        confidence += 15;
      }
    }

    if (confidence > 25) {
      return {
        name: 'Electron',
        version,
        category: 'desktop',
        confidence: Math.min(confidence / 100, 0.95),
        evidence,
        configurations,
        patterns
      };
    }

    return null;
  }

  private async detectTauri(projectRoot: string, fileNodes: MindMapNode[]): Promise<FrameworkInfo | null> {
    const evidence: string[] = [];
    const patterns: FrameworkPattern[] = [];
    const configurations: string[] = [];
    let confidence = 0;
    let version: string | undefined;

    // Check for Cargo.toml with Tauri
    try {
      const cargoPath = join(projectRoot, 'Cargo.toml');
      const cargoContent = await readFile(cargoPath, 'utf-8');
      
      if (cargoContent.includes('tauri =') || cargoContent.includes('[dependencies.tauri]')) {
        evidence.push('Tauri dependency in Cargo.toml');
        confidence += 50;
        configurations.push('Cargo.toml');
      }
    } catch (error) {
      // Continue without Cargo.toml
    }

    // Check for tauri.conf.json
    try {
      await access(join(projectRoot, 'src-tauri', 'tauri.conf.json'));
      evidence.push('Tauri configuration file');
      configurations.push('src-tauri/tauri.conf.json');
      confidence += 30;
    } catch (error) {
      // File doesn't exist
    }

    // Check for src-tauri directory
    if (fileNodes.some(node => node.path?.includes('src-tauri'))) {
      evidence.push('Tauri source directory structure');
      confidence += 20;
      patterns.push({
        type: 'file_structure',
        description: 'Tauri project structure with src-tauri directory',
        confidence: 0.9
      });
    }

    if (confidence > 30) {
      return {
        name: 'Tauri',
        version,
        category: 'desktop',
        confidence: Math.min(confidence / 100, 0.95),
        evidence,
        configurations,
        patterns
      };
    }

    return null;
  }

  private async detectQt(projectRoot: string, fileNodes: MindMapNode[]): Promise<FrameworkInfo | null> {
    const evidence: string[] = [];
    const patterns: FrameworkPattern[] = [];
    const configurations: string[] = [];
    let confidence = 0;
    let version: string | undefined;

    // Check for Qt project files
    const qtFiles = fileNodes.filter(node => 
      node.name.endsWith('.pro') || 
      node.name.endsWith('.pri') ||
      node.name === 'CMakeLists.txt'
    );

    for (const file of qtFiles) {
      try {
        const content = await readFile(file.path || '', 'utf-8');
        
        if (content.includes('QT +=') || content.includes('find_package(Qt')) {
          evidence.push('Qt project configuration');
          confidence += 40;
          configurations.push(file.name);
        }
      } catch (error) {
        // Continue if file can't be read
      }
    }

    // Check C++ files for Qt includes
    const cppFiles = fileNodes.filter(node => 
      node.name.endsWith('.cpp') || node.name.endsWith('.h') || node.name.endsWith('.hpp')
    );

    for (const file of cppFiles) {
      try {
        const content = await readFile(file.path || '', 'utf-8');
        
        if (content.includes('#include <Qt') || content.includes('#include <Q')) {
          evidence.push('Qt headers included');
          confidence += 20;
        }

        if (content.includes('QApplication') || content.includes('QWidget')) {
          evidence.push('Qt application patterns');
          confidence += 15;
          patterns.push({
            type: 'convention',
            description: 'Qt application and widget usage',
            confidence: 0.85
          });
        }
      } catch (error) {
        // Continue if file can't be read
      }
    }

    if (confidence > 25) {
      return {
        name: 'Qt',
        version,
        category: 'desktop',
        confidence: Math.min(confidence / 100, 0.95),
        evidence,
        configurations,
        patterns
      };
    }

    return null;
  }

  /**
   * Game Engine Detection
   */
  private async detectGameEngines(projectRoot: string, fileNodes: MindMapNode[]): Promise<FrameworkInfo[]> {
    const frameworks: FrameworkInfo[] = [];

    // Unity
    const unity = await this.detectUnity(projectRoot, fileNodes);
    if (unity) frameworks.push(unity);

    // Unreal Engine
    const unreal = await this.detectUnreal(projectRoot, fileNodes);
    if (unreal) frameworks.push(unreal);

    // Godot
    const godot = await this.detectGodot(projectRoot, fileNodes);
    if (godot) frameworks.push(godot);

    return frameworks;
  }

  private async detectUnity(projectRoot: string, fileNodes: MindMapNode[]): Promise<FrameworkInfo | null> {
    const evidence: string[] = [];
    const patterns: FrameworkPattern[] = [];
    const configurations: string[] = [];
    let confidence = 0;

    // Check for Unity-specific directories and files
    const unityMarkers = ['Assets/', 'ProjectSettings/', 'Library/', '*.unity'];
    
    for (const marker of unityMarkers) {
      if (fileNodes.some(node => node.path?.includes(marker) || node.name.endsWith('.unity'))) {
        evidence.push(`Unity project structure: ${marker}`);
        confidence += 20;
      }
    }

    // Check for Unity scripts
    const csharpFiles = fileNodes.filter(node => node.name.endsWith('.cs'));
    for (const file of csharpFiles) {
      try {
        const content = await readFile(file.path || '', 'utf-8');
        
        if (content.includes('using UnityEngine') || content.includes('MonoBehaviour')) {
          evidence.push('Unity C# scripts');
          confidence += 25;
          patterns.push({
            type: 'convention',
            description: 'Unity MonoBehaviour scripting pattern',
            confidence: 0.9
          });
          break;
        }
      } catch (error) {
        // Continue if file can't be read
      }
    }

    if (confidence > 25) {
      return {
        name: 'Unity',
        category: 'game',
        confidence: Math.min(confidence / 100, 0.95),
        evidence,
        configurations,
        patterns
      };
    }

    return null;
  }

  private async detectUnreal(projectRoot: string, fileNodes: MindMapNode[]): Promise<FrameworkInfo | null> {
    const evidence: string[] = [];
    const patterns: FrameworkPattern[] = [];
    const configurations: string[] = [];
    let confidence = 0;

    // Check for Unreal project files
    const unrealFiles = fileNodes.filter(node => 
      node.name.endsWith('.uproject') || 
      node.name.endsWith('.uplugin') ||
      node.name === 'Config/'
    );

    if (unrealFiles.length > 0) {
      evidence.push('Unreal Engine project files');
      confidence += 40;
      configurations.push(...unrealFiles.map(f => f.name));
    }

    // Check for Unreal C++ code
    const cppFiles = fileNodes.filter(node => node.name.endsWith('.cpp') || node.name.endsWith('.h'));
    for (const file of cppFiles) {
      try {
        const content = await readFile(file.path || '', 'utf-8');
        
        if (content.includes('UCLASS') || content.includes('UPROPERTY') || content.includes('Engine/Engine.h')) {
          evidence.push('Unreal Engine C++ patterns');
          confidence += 30;
          patterns.push({
            type: 'convention',
            description: 'Unreal Engine reflection system usage',
            confidence: 0.85
          });
          break;
        }
      } catch (error) {
        // Continue if file can't be read
      }
    }

    if (confidence > 25) {
      return {
        name: 'Unreal Engine',
        category: 'game',
        confidence: Math.min(confidence / 100, 0.95),
        evidence,
        configurations,
        patterns
      };
    }

    return null;
  }

  private async detectGodot(projectRoot: string, fileNodes: MindMapNode[]): Promise<FrameworkInfo | null> {
    const evidence: string[] = [];
    const patterns: FrameworkPattern[] = [];
    const configurations: string[] = [];
    let confidence = 0;

    // Check for Godot project file
    if (fileNodes.some(node => node.name === 'project.godot')) {
      evidence.push('Godot project configuration');
      confidence += 50;
      configurations.push('project.godot');
    }

    // Check for GDScript files
    const gdScriptFiles = fileNodes.filter(node => node.name.endsWith('.gd'));
    if (gdScriptFiles.length > 0) {
      evidence.push(`${gdScriptFiles.length} GDScript files`);
      confidence += Math.min(gdScriptFiles.length * 10, 30);
      patterns.push({
        type: 'file_structure',
        description: 'GDScript source files',
        files: gdScriptFiles.map(f => f.name),
        confidence: 0.9
      });
    }

    // Check for Godot scene files
    const sceneFiles = fileNodes.filter(node => node.name.endsWith('.tscn'));
    if (sceneFiles.length > 0) {
      evidence.push(`${sceneFiles.length} Godot scene files`);
      confidence += Math.min(sceneFiles.length * 5, 20);
    }

    if (confidence > 25) {
      return {
        name: 'Godot',
        category: 'game',
        confidence: Math.min(confidence / 100, 0.95),
        evidence,
        configurations,
        patterns
      };
    }

    return null;
  }

  /**
   * ML/AI Framework Detection
   */
  private async detectMLAIFrameworks(projectRoot: string, fileNodes: MindMapNode[]): Promise<FrameworkInfo[]> {
    const frameworks: FrameworkInfo[] = [];

    // TensorFlow
    const tensorflow = await this.detectTensorFlow(projectRoot, fileNodes);
    if (tensorflow) frameworks.push(tensorflow);

    // PyTorch
    const pytorch = await this.detectPyTorch(projectRoot, fileNodes);
    if (pytorch) frameworks.push(pytorch);

    // Scikit-learn
    const sklearn = await this.detectScikitLearn(projectRoot, fileNodes);
    if (sklearn) frameworks.push(sklearn);

    return frameworks;
  }

  private async detectTensorFlow(projectRoot: string, fileNodes: MindMapNode[]): Promise<FrameworkInfo | null> {
    const evidence: string[] = [];
    const patterns: FrameworkPattern[] = [];
    let confidence = 0;

    // Check Python files for TensorFlow imports
    const pythonFiles = fileNodes.filter(node => node.metadata.language === 'python');
    
    for (const file of pythonFiles) {
      try {
        const content = await readFile(file.path || '', 'utf-8');
        
        if (content.includes('import tensorflow') || content.includes('from tensorflow')) {
          evidence.push('TensorFlow imports found');
          confidence += 40;
        }

        if (content.includes('tf.keras') || content.includes('tf.nn')) {
          evidence.push('TensorFlow API usage');
          confidence += 20;
          patterns.push({
            type: 'convention',
            description: 'TensorFlow/Keras ML model patterns',
            confidence: 0.85
          });
        }
        
        if (content.includes('.fit(') && content.includes('.predict(')) {
          evidence.push('ML training patterns');
          confidence += 15;
        }
      } catch (error) {
        // Continue if file can't be read
      }
    }

    if (confidence > 30) {
      return {
        name: 'TensorFlow',
        category: 'ml_ai',
        confidence: Math.min(confidence / 100, 0.95),
        evidence,
        configurations: [],
        patterns
      };
    }

    return null;
  }

  private async detectPyTorch(projectRoot: string, fileNodes: MindMapNode[]): Promise<FrameworkInfo | null> {
    const evidence: string[] = [];
    const patterns: FrameworkPattern[] = [];
    let confidence = 0;

    const pythonFiles = fileNodes.filter(node => node.metadata.language === 'python');
    
    for (const file of pythonFiles) {
      try {
        const content = await readFile(file.path || '', 'utf-8');
        
        if (content.includes('import torch') || content.includes('from torch')) {
          evidence.push('PyTorch imports found');
          confidence += 40;
        }

        if (content.includes('torch.nn') || content.includes('torch.optim')) {
          evidence.push('PyTorch neural network usage');
          confidence += 20;
          patterns.push({
            type: 'convention',
            description: 'PyTorch neural network patterns',
            confidence: 0.85
          });
        }
      } catch (error) {
        // Continue if file can't be read
      }
    }

    if (confidence > 30) {
      return {
        name: 'PyTorch',
        category: 'ml_ai',
        confidence: Math.min(confidence / 100, 0.95),
        evidence,
        configurations: [],
        patterns
      };
    }

    return null;
  }

  private async detectScikitLearn(projectRoot: string, fileNodes: MindMapNode[]): Promise<FrameworkInfo | null> {
    const evidence: string[] = [];
    const patterns: FrameworkPattern[] = [];
    let confidence = 0;

    const pythonFiles = fileNodes.filter(node => node.metadata.language === 'python');
    
    for (const file of pythonFiles) {
      try {
        const content = await readFile(file.path || '', 'utf-8');
        
        if (content.includes('from sklearn') || content.includes('import sklearn')) {
          evidence.push('Scikit-learn imports found');
          confidence += 40;
        }

        if (content.includes('fit_transform') || content.includes('train_test_split')) {
          evidence.push('Scikit-learn ML patterns');
          confidence += 20;
          patterns.push({
            type: 'convention',
            description: 'Scikit-learn machine learning pipeline',
            confidence: 0.8
          });
        }
      } catch (error) {
        // Continue if file can't be read
      }
    }

    if (confidence > 30) {
      return {
        name: 'Scikit-learn',
        category: 'ml_ai',
        confidence: Math.min(confidence / 100, 0.95),
        evidence,
        configurations: [],
        patterns
      };
    }

    return null;
  }

  /**
   * Cloud Framework Detection
   */
  private async detectCloudFrameworks(projectRoot: string, fileNodes: MindMapNode[]): Promise<FrameworkInfo[]> {
    const frameworks: FrameworkInfo[] = [];

    // Docker
    const docker = await this.detectDocker(projectRoot, fileNodes);
    if (docker) frameworks.push(docker);

    // Kubernetes
    const kubernetes = await this.detectKubernetes(projectRoot, fileNodes);
    if (kubernetes) frameworks.push(kubernetes);

    return frameworks;
  }

  private async detectDocker(projectRoot: string, fileNodes: MindMapNode[]): Promise<FrameworkInfo | null> {
    const evidence: string[] = [];
    const patterns: FrameworkPattern[] = [];
    const configurations: string[] = [];
    let confidence = 0;

    // Check for Docker files
    const dockerFiles = ['Dockerfile', 'docker-compose.yml', 'docker-compose.yaml', '.dockerignore'];
    for (const file of dockerFiles) {
      if (fileNodes.some(node => node.name === file)) {
        evidence.push(`Docker configuration: ${file}`);
        configurations.push(file);
        confidence += 25;
      }
    }

    // Check for Docker-specific patterns in files
    for (const file of fileNodes) {
      if (file.name === 'Dockerfile') {
        try {
          const content = await readFile(file.path || '', 'utf-8');
          if (content.includes('FROM ') && content.includes('RUN ')) {
            evidence.push('Docker build instructions');
            confidence += 20;
            patterns.push({
              type: 'config',
              description: 'Docker containerization setup',
              confidence: 0.9
            });
          }
        } catch (error) {
          // Continue if file can't be read
        }
      }
    }

    if (confidence > 20) {
      return {
        name: 'Docker',
        category: 'cloud',
        confidence: Math.min(confidence / 100, 0.95),
        evidence,
        configurations,
        patterns
      };
    }

    return null;
  }

  private async detectKubernetes(projectRoot: string, fileNodes: MindMapNode[]): Promise<FrameworkInfo | null> {
    const evidence: string[] = [];
    const patterns: FrameworkPattern[] = [];
    const configurations: string[] = [];
    let confidence = 0;

    // Check for Kubernetes configuration files
    const k8sFiles = fileNodes.filter(node => 
      node.name.endsWith('.yaml') || node.name.endsWith('.yml')
    );

    for (const file of k8sFiles) {
      try {
        const content = await readFile(file.path || '', 'utf-8');
        
        if (content.includes('apiVersion:') && (content.includes('kind: Deployment') || content.includes('kind: Service'))) {
          evidence.push('Kubernetes manifests');
          confidence += 30;
          configurations.push(file.name);
          patterns.push({
            type: 'config',
            description: 'Kubernetes deployment configuration',
            confidence: 0.85
          });
        }
      } catch (error) {
        // Continue if file can't be read
      }
    }

    if (confidence > 20) {
      return {
        name: 'Kubernetes',
        category: 'cloud',
        confidence: Math.min(confidence / 100, 0.95),
        evidence,
        configurations,
        patterns
      };
    }

    return null;
  }

  /**
   * Get framework-specific recommendations
   */
  getFrameworkRecommendations(frameworks: FrameworkInfo[]): string[] {
    const recommendations: string[] = [];

    for (const framework of frameworks) {
      if (framework.confidence > 0.7) {
        switch (framework.name) {
          case 'React':
            recommendations.push('Consider using React DevTools for debugging');
            recommendations.push('Use React.StrictMode in development');
            break;
          case 'Vue.js':
            recommendations.push('Use Vue DevTools for component inspection');
            recommendations.push('Consider Vue 3 Composition API for better TypeScript support');
            break;
          case 'Django':
            recommendations.push('Use Django Debug Toolbar for development');
            recommendations.push('Consider Django REST Framework for API development');
            break;
          case 'Flask':
            recommendations.push('Use Flask-SQLAlchemy for database operations');
            recommendations.push('Consider Flask-JWT-Extended for authentication');
            break;
        }
      }
    }

    return recommendations;
  }

  /**
   * Clear framework cache
   */
  clearCache(): void {
    this.frameworkCache.clear();
  }
}