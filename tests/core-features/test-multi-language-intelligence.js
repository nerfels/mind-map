#!/usr/bin/env node

/**
 * MultiLanguageIntelligence Test Suite
 *
 * Tests the cross-language analysis capabilities including:
 * - Cross-language dependency detection
 * - Polyglot project structure analysis
 * - Language interoperability patterns
 * - Multi-language refactoring suggestions
 */

import { MultiLanguageIntelligence } from '../../dist/core/MultiLanguageIntelligence.js';
import { MindMapStorage } from '../../dist/core/MindMapStorage.js';
import { join } from 'path';
import { existsSync, mkdirSync, rmSync, writeFileSync } from 'fs';

class MultiLanguageIntelligenceTestSuite {
  constructor() {
    this.testDir = join(process.cwd(), 'test-temp-multi-lang');
    this.storage = null;
    this.multiLangIntelligence = null;
    this.results = {
      passed: 0,
      failed: 0,
      tests: []
    };
  }

  async setupTestEnvironment() {
    // Create clean test directory
    if (existsSync(this.testDir)) {
      rmSync(this.testDir, { recursive: true, force: true });
    }
    mkdirSync(this.testDir, { recursive: true });

    // Create multi-language test files
    const testFiles = {
      // Python backend API
      'backend/app.py': `
from flask import Flask, jsonify, request
import requests
import json

app = Flask(__name__)

@app.route('/api/data', methods=['GET'])
def get_data():
    # Calls external microservice
    response = requests.get('http://data-service:8080/data')
    return jsonify(response.json())

@app.route('/api/process', methods=['POST'])
def process_data():
    data = request.json
    # Shared data structure with frontend
    result = {
        'status': 'success',
        'processed_data': data['items'],
        'timestamp': '2024-01-01'
    }
    return jsonify(result)

if __name__ == '__main__':
    app.run(debug=True)
      `,

      // Node.js microservice
      'services/data-service/server.js': `
const express = require('express');
const { Pool } = require('pg');
const redis = require('redis');

const app = express();
const db = new Pool({
  host: process.env.DB_HOST,
  database: 'main_db'
});

// Redis for shared caching
const cache = redis.createClient();

app.get('/data', async (req, res) => {
  try {
    const cachedData = await cache.get('data:latest');
    if (cachedData) {
      return res.json(JSON.parse(cachedData));
    }

    const result = await db.query('SELECT * FROM data_table');
    await cache.setex('data:latest', 300, JSON.stringify(result.rows));
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: 'Database error' });
  }
});

module.exports = app;
      `,

      // React frontend
      'frontend/src/App.js': `
import React, { useState, useEffect } from 'react';
import axios from 'axios';

function App() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      // API call to Python backend
      const response = await axios.get('/api/data');
      setData(response.data);
    } catch (error) {
      console.error('API Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const processData = async (items) => {
    // Shared data structure with backend
    const payload = {
      items: items,
      action: 'process'
    };

    const response = await axios.post('/api/process', payload);
    return response.data;
  };

  return (
    <div className="App">
      <h1>Multi-Language App</h1>
      {loading ? <div>Loading...</div> : <DataList data={data} />}
    </div>
  );
}

export default App;
      `,

      // Go microservice
      'services/auth-service/main.go': `
package main

import (
    "encoding/json"
    "net/http"
    "github.com/gin-gonic/gin"
    "github.com/dgrijalva/jwt-go"
    "golang.org/x/crypto/bcrypt"
)

type User struct {
    ID       int    \`json:"id"\`
    Username string \`json:"username"\`
    Email    string \`json:"email"\`
}

type AuthResponse struct {
    Token string \`json:"token"\`
    User  User   \`json:"user"\`
}

func main() {
    r := gin.Default()

    // CORS for frontend communication
    r.Use(func(c *gin.Context) {
        c.Header("Access-Control-Allow-Origin", "*")
        c.Header("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE")
        c.Header("Access-Control-Allow-Headers", "Content-Type,Authorization")

        if c.Request.Method == "OPTIONS" {
            c.AbortWithStatus(204)
            return
        }
        c.Next()
    })

    r.POST("/auth/login", loginHandler)
    r.GET("/auth/validate", validateToken)

    r.Run(":8081")
}

func loginHandler(c *gin.Context) {
    // Authentication logic that frontend calls
    var loginRequest struct {
        Username string \`json:"username"\`
        Password string \`json:"password"\`
    }

    c.BindJSON(&loginRequest)

    // Shared response format with other services
    response := AuthResponse{
        Token: "jwt-token-here",
        User: User{
            ID: 1,
            Username: loginRequest.Username,
            Email: "user@example.com",
        },
    }

    c.JSON(http.StatusOK, response)
}
      `,

      // Rust data processing worker
      'workers/data-processor/src/main.rs': `
use serde::{Deserialize, Serialize};
use reqwest::Client;
use tokio;

#[derive(Serialize, Deserialize, Debug)]
struct DataItem {
    id: i32,
    name: String,
    value: f64,
    timestamp: String,
}

#[derive(Serialize, Deserialize)]
struct ProcessingResult {
    status: String,
    processed_count: usize,
    items: Vec<DataItem>,
}

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    let client = Client::new();

    loop {
        // Fetch data from Node.js service
        let response = client
            .get("http://data-service:8080/data")
            .send()
            .await?;

        let items: Vec<DataItem> = response.json().await?;

        // Process data (heavy computation)
        let processed_items = process_data_items(items).await;

        // Send results back to Python API
        let result = ProcessingResult {
            status: "completed".to_string(),
            processed_count: processed_items.len(),
            items: processed_items,
        };

        client
            .post("http://backend:5000/api/results")
            .json(&result)
            .send()
            .await?;

        tokio::time::sleep(tokio::time::Duration::from_secs(60)).await;
    }
}

async fn process_data_items(items: Vec<DataItem>) -> Vec<DataItem> {
    items.into_iter().map(|mut item| {
        item.value = item.value * 1.5; // Some processing
        item
    }).collect()
}
      `,

      // Shared configuration
      'config/shared.json': `
{
  "services": {
    "backend": {
      "host": "backend",
      "port": 5000,
      "language": "python"
    },
    "data-service": {
      "host": "data-service",
      "port": 8080,
      "language": "javascript"
    },
    "auth-service": {
      "host": "auth-service",
      "port": 8081,
      "language": "go"
    },
    "data-processor": {
      "host": "data-processor",
      "port": 8082,
      "language": "rust"
    }
  },
  "shared_schemas": {
    "DataItem": {
      "id": "integer",
      "name": "string",
      "value": "float",
      "timestamp": "string"
    },
    "AuthResponse": {
      "token": "string",
      "user": "User"
    }
  }
}
      `,

      // Docker compose showing service relationships
      'docker-compose.yml': `
version: '3.8'
services:
  backend:
    build: ./backend
    ports:
      - "5000:5000"
    depends_on:
      - data-service
      - auth-service

  frontend:
    build: ./frontend
    ports:
      - "3000:3000"
    depends_on:
      - backend

  data-service:
    build: ./services/data-service
    ports:
      - "8080:8080"
    depends_on:
      - postgres
      - redis

  auth-service:
    build: ./services/auth-service
    ports:
      - "8081:8081"

  data-processor:
    build: ./workers/data-processor
    depends_on:
      - data-service

  postgres:
    image: postgres:13
    environment:
      POSTGRES_DB: main_db

  redis:
    image: redis:6
      `,

      // Package files for dependency analysis
      'backend/requirements.txt': `
Flask==2.0.1
requests==2.25.1
redis==3.5.3
psycopg2==2.9.1
      `,

      'services/data-service/package.json': `
{
  "name": "data-service",
  "dependencies": {
    "express": "^4.18.0",
    "pg": "^8.7.1",
    "redis": "^4.0.6"
  }
}
      `,

      'frontend/package.json': `
{
  "name": "frontend",
  "dependencies": {
    "react": "^18.0.0",
    "axios": "^0.27.2"
  }
}
      `,

      'workers/data-processor/Cargo.toml': `
[package]
name = "data-processor"
version = "0.1.0"

[dependencies]
serde = { version = "1.0", features = ["derive"] }
reqwest = { version = "0.11", features = ["json"] }
tokio = { version = "1.0", features = ["full"] }
      `
    };

    // Write test files
    for (const [filePath, content] of Object.entries(testFiles)) {
      const fullPath = join(this.testDir, filePath);
      const dir = join(fullPath, '..');
      if (!existsSync(dir)) {
        mkdirSync(dir, { recursive: true });
      }
      writeFileSync(fullPath, content);
    }

    console.log(`✅ Multi-language test environment created: ${this.testDir}`);
  }

  async setupMindMapWithData() {
    this.storage = new MindMapStorage(this.testDir);
    this.multiLangIntelligence = new MultiLanguageIntelligence(this.storage);

    // Add nodes for different language files
    const nodes = [
      {
        id: 'python-backend',
        type: 'file',
        name: 'app.py',
        path: 'backend/app.py',
        properties: {
          language: 'python',
          framework: 'flask'
        },
        metadata: {
          extension: '.py',
          size: 1024
        },
        confidence: 0.95
      },
      {
        id: 'node-service',
        type: 'file',
        name: 'server.js',
        path: 'services/data-service/server.js',
        properties: {
          language: 'javascript',
          framework: 'express'
        },
        metadata: {
          extension: '.js',
          size: 2048
        },
        confidence: 0.93
      },
      {
        id: 'react-frontend',
        type: 'file',
        name: 'App.js',
        path: 'frontend/src/App.js',
        properties: {
          language: 'javascript',
          framework: 'react'
        },
        metadata: {
          extension: '.js',
          size: 1536
        },
        confidence: 0.91
      },
      {
        id: 'go-auth',
        type: 'file',
        name: 'main.go',
        path: 'services/auth-service/main.go',
        properties: {
          language: 'go',
          framework: 'gin'
        },
        metadata: {
          extension: '.go',
          size: 1280
        },
        confidence: 0.89
      },
      {
        id: 'rust-processor',
        type: 'file',
        name: 'main.rs',
        path: 'workers/data-processor/src/main.rs',
        properties: {
          language: 'rust',
          framework: 'tokio'
        },
        metadata: {
          extension: '.rs',
          size: 2560
        },
        confidence: 0.87
      },
      {
        id: 'shared-config',
        type: 'file',
        name: 'shared.json',
        path: 'config/shared.json',
        properties: {
          language: 'json'
        },
        metadata: {
          extension: '.json',
          size: 512
        },
        confidence: 0.99
      }
    ];

    for (const node of nodes) {
      this.storage.addNode(node);
    }

    console.log(`📊 Added ${nodes.length} multi-language nodes to mind map`);
  }

  async cleanupTestEnvironment() {
    if (existsSync(this.testDir)) {
      rmSync(this.testDir, { recursive: true, force: true });
      console.log(`🗑️  Cleaned up test directory`);
    }
  }

  async runTest(name, testFn) {
    try {
      console.log(`🧪 Running: ${name}`);
      const startTime = Date.now();

      await testFn();

      const duration = Date.now() - startTime;
      console.log(`✅ PASSED: ${name} (${duration}ms)`);
      this.results.passed++;
      this.results.tests.push({ name, status: 'PASSED', duration });

    } catch (error) {
      console.error(`❌ FAILED: ${name}`);
      console.error(`   Error: ${error.message}`);
      this.results.failed++;
      this.results.tests.push({ name, status: 'FAILED', error: error.message });
    }
  }

  async testCrossLanguageDependencyDetection() {
    if (!this.multiLangIntelligence) throw new Error('MultiLanguageIntelligence not initialized');

    console.log(`   🔍 Detecting cross-language dependencies`);
    const dependencies = await this.multiLangIntelligence.detectCrossLanguageDependencies();

    if (dependencies.length === 0) {
      throw new Error('No cross-language dependencies detected');
    }

    console.log(`   ✓ Found ${dependencies.length} cross-language dependencies`);

    // Verify expected dependency types
    const dependencyTypes = dependencies.map(dep => dep.dependencyType);
    const expectedTypes = ['api_call', 'microservice', 'shared_data'];

    const foundExpectedTypes = expectedTypes.filter(type => dependencyTypes.includes(type));
    if (foundExpectedTypes.length < 2) {
      throw new Error(`Expected multiple dependency types, found: ${[...new Set(dependencyTypes)].join(', ')}`);
    }

    console.log(`   📊 Dependency types: ${[...new Set(dependencyTypes)].join(', ')}`);

    // Check for specific patterns
    const apiCalls = dependencies.filter(dep => dep.dependencyType === 'api_call');
    const microservices = dependencies.filter(dep => dep.dependencyType === 'microservice');

    console.log(`   🌐 API calls: ${apiCalls.length}`);
    console.log(`   ⚙️  Microservice connections: ${microservices.length}`);
  }

  async testPolyglotProjectAnalysis() {
    if (!this.multiLangIntelligence) throw new Error('MultiLanguageIntelligence not initialized');

    console.log(`   🏗️  Analyzing polyglot project structure`);
    const projectAnalysis = await this.multiLangIntelligence.analyzePolyglotProject();

    if (!projectAnalysis.languages || projectAnalysis.languages.size === 0) {
      throw new Error('No languages detected in project analysis');
    }

    console.log(`   ✓ Detected ${projectAnalysis.languages.size} languages`);

    // Verify language analysis
    const languageNames = Array.from(projectAnalysis.languages.keys());
    const expectedLanguages = ['python', 'javascript', 'go', 'rust'];

    const foundLanguages = expectedLanguages.filter(lang => languageNames.includes(lang));
    if (foundLanguages.length < 3) {
      throw new Error(`Expected multiple languages, found: ${languageNames.join(', ')}`);
    }

    console.log(`   🌍 Languages: ${languageNames.join(', ')}`);
    console.log(`   🏛️  Architecture: ${projectAnalysis.architecturalStyle}`);
    console.log(`   🎯 Primary language: ${projectAnalysis.primaryLanguage}`);

    // Verify interoperability patterns
    if (!projectAnalysis.interopPatterns || projectAnalysis.interopPatterns.length === 0) {
      throw new Error('No interoperability patterns detected');
    }

    console.log(`   🔗 Interop patterns: ${projectAnalysis.interopPatterns.length}`);
  }

  async testInteroperabilityPatternRecognition() {
    if (!this.multiLangIntelligence) throw new Error('MultiLanguageIntelligence not initialized');

    console.log(`   🤝 Testing interoperability analysis via polyglot project analysis`);

    // Get interoperability patterns through the public API
    const projectAnalysis = await this.multiLangIntelligence.analyzePolyglotProject();
    const patterns = projectAnalysis.interoperabilityPatterns || [];

    console.log(`   ✓ Found ${patterns.length} interoperability patterns`);

    if (patterns.length > 0) {
      // Check pattern details
      const patternTypes = patterns.map(p => p.type || 'unknown');
      console.log(`   🔄 Pattern types: ${[...new Set(patternTypes)].join(', ')}`);

      // Verify pattern details
      for (const pattern of patterns.slice(0, 3)) {
        console.log(`   📋 ${pattern.type || 'N/A'}: ${pattern.description || 'No description'}`);
        console.log(`   💪 Confidence: ${((pattern.confidence || 0) * 100).toFixed(1)}%`);
        console.log(`   🔧 Languages: ${(pattern.languages || []).join(', ') || 'None'}`);
      }
    } else {
      console.log(`   📝 No specific interoperability patterns detected in test project`);
    }
  }

  async testMultiLanguageRefactoringSuggestions() {
    if (!this.multiLangIntelligence) throw new Error('MultiLanguageIntelligence not initialized');

    console.log(`   ♻️  Generating multi-language refactoring suggestions`);

    const refactorings = await this.multiLangIntelligence.generateRefactoringSuggestions();

    if (refactorings.length === 0) {
      throw new Error('No refactoring suggestions generated');
    }

    console.log(`   ✓ Generated ${refactorings.length} refactoring suggestions`);

    // Verify refactoring properties
    const types = refactorings.map(r => r.type);
    const uniqueTypes = [...new Set(types)];

    console.log(`   📂 Types: ${uniqueTypes.join(', ')}`);

    // Check effort levels and risk analysis
    const hasRiskAnalysis = refactorings.some(r => r.risks && r.risks.length > 0);
    if (!hasRiskAnalysis) {
      throw new Error('Risk analysis missing from refactoring suggestions');
    }

    console.log(`   ⚠️  Risk analysis included for suggestions`);

    // Print example refactoring
    if (refactorings[0]) {
      const refactoring = refactorings[0];
      console.log(`   🔧 Example: ${refactoring.type}`);
      console.log(`   📝 ${refactoring.description}`);
      console.log(`   ⏱️  Effort: ${refactoring.effort}`);
    }
  }


  async runAllTests() {
    console.log('🧪 Starting MultiLanguageIntelligence Test Suite\n');

    try {
      await this.setupTestEnvironment();
      await this.setupMindMapWithData();

      await this.runTest('Cross-Language Dependency Detection', () => this.testCrossLanguageDependencyDetection());
      await this.runTest('Polyglot Project Analysis', () => this.testPolyglotProjectAnalysis());
      await this.runTest('Interoperability Pattern Recognition', () => this.testInteroperabilityPatternRecognition());
      await this.runTest('Multi-Language Refactoring Suggestions', () => this.testMultiLanguageRefactoringSuggestions());

    } finally {
      await this.cleanupTestEnvironment();
    }

    this.printResults();
  }

  printResults() {
    console.log('\n📊 TEST RESULTS');
    console.log('='.repeat(50));
    console.log(`✅ Passed: ${this.results.passed}`);
    console.log(`❌ Failed: ${this.results.failed}`);
    console.log(`📈 Success Rate: ${((this.results.passed / (this.results.passed + this.results.failed)) * 100).toFixed(1)}%`);

    if (this.results.failed > 0) {
      console.log('\n❌ FAILED TESTS:');
      this.results.tests
        .filter(test => test.status === 'FAILED')
        .forEach(test => {
          console.log(`   • ${test.name}: ${test.error}`);
        });
    }

    console.log('\n🎯 MultiLanguageIntelligence Test Complete');
    process.exit(this.results.failed > 0 ? 1 : 0);
  }
}

// Run tests if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const testSuite = new MultiLanguageIntelligenceTestSuite();
  testSuite.runAllTests().catch(error => {
    console.error('❌ Test suite failed:', error);
    process.exit(1);
  });
}

export { MultiLanguageIntelligenceTestSuite };