#!/usr/bin/env node

/**
 * Test script for Rust AST analyzer
 * Tests Rust code parsing, struct/trait detection, and framework analysis
 */

import { RustAnalyzer } from './dist/core/RustAnalyzer.js';
import { writeFile, unlink } from 'fs/promises';

const analyzer = new RustAnalyzer();

// Sample Rust code for testing
const rustTestCode = `
use std::collections::HashMap;
use serde::{Serialize, Deserialize};
use actix_web::{web, App, HttpResponse, HttpServer};
use tokio::sync::Mutex;
use async_trait::async_trait;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct User {
    id: u64,
    name: String,
    email: String,
    age: Option<u32>,
}

#[derive(Debug)]
pub struct AppState {
    users: Mutex<HashMap<u64, User>>,
    counter: Mutex<u64>,
}

#[async_trait]
pub trait UserRepository {
    async fn get_user(&self, id: u64) -> Option<User>;
    async fn create_user(&self, user: User) -> Result<User, String>;
    async fn update_user(&self, id: u64, user: User) -> Result<User, String>;
    async fn delete_user(&self, id: u64) -> Result<(), String>;
}

impl AppState {
    pub fn new() -> Self {
        Self {
            users: Mutex::new(HashMap::new()),
            counter: Mutex::new(0),
        }
    }
}

#[async_trait]
impl UserRepository for AppState {
    async fn get_user(&self, id: u64) -> Option<User> {
        let users = self.users.lock().await;
        users.get(&id).cloned()
    }

    async fn create_user(&self, mut user: User) -> Result<User, String> {
        let mut counter = self.counter.lock().await;
        *counter += 1;
        user.id = *counter;
        
        let mut users = self.users.lock().await;
        users.insert(user.id, user.clone());
        Ok(user)
    }

    async fn update_user(&self, id: u64, user: User) -> Result<User, String> {
        let mut users = self.users.lock().await;
        if users.contains_key(&id) {
            users.insert(id, user.clone());
            Ok(user)
        } else {
            Err("User not found".to_string())
        }
    }

    async fn delete_user(&self, id: u64) -> Result<(), String> {
        let mut users = self.users.lock().await;
        if users.remove(&id).is_some() {
            Ok(())
        } else {
            Err("User not found".to_string())
        }
    }
}

pub async fn get_user_handler(
    data: web::Data<AppState>,
    path: web::Path<u64>,
) -> HttpResponse {
    let id = path.into_inner();
    match data.get_user(id).await {
        Some(user) => HttpResponse::Ok().json(user),
        None => HttpResponse::NotFound().body("User not found"),
    }
}

pub async fn create_user_handler(
    data: web::Data<AppState>,
    user: web::Json<User>,
) -> HttpResponse {
    match data.create_user(user.into_inner()).await {
        Ok(user) => HttpResponse::Created().json(user),
        Err(e) => HttpResponse::BadRequest().body(e),
    }
}

#[actix_web::main]
async fn main() -> std::io::Result<()> {
    let app_state = web::Data::new(AppState::new());

    HttpServer::new(move || {
        App::new()
            .app_data(app_state.clone())
            .route("/users/{id}", web::get().to(get_user_handler))
            .route("/users", web::post().to(create_user_handler))
    })
    .bind("127.0.0.1:8080")?
    .run()
    .await
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn test_create_user() {
        let state = AppState::new();
        let user = User {
            id: 0,
            name: "Test User".to_string(),
            email: "test@example.com".to_string(),
            age: Some(25),
        };
        
        let result = state.create_user(user).await;
        assert!(result.is_ok());
        assert_eq!(result.unwrap().id, 1);
    }
}
`;

async function testRustAnalyzer() {
    console.log('🦀 Testing Rust AST Analyzer\n');
    
    try {
        // Create temporary Rust file
        const testFilePath = './test-rust-file.rs';
        await writeFile(testFilePath, rustTestCode);
        
        console.log('📁 Created test Rust file:', testFilePath);
        
        // Test file detection
        console.log('\n🔍 Testing file detection:');
        console.log('Can analyze .rs file:', analyzer.canAnalyze('test.rs'));
        console.log('Cannot analyze .js file:', analyzer.canAnalyze('test.js'));
        
        // Analyze the Rust file
        console.log('\n⚡ Analyzing Rust code structure...');
        const structure = await analyzer.analyzeFile(testFilePath);
        
        if (!structure) {
            console.error('❌ Failed to analyze Rust file');
            return;
        }
        
        console.log('\n📊 Analysis Results:');
        console.log('Functions Found:', structure.functions.length);
        console.log('Structs Found:', structure.structs.length);
        console.log('Traits Found:', structure.traits.length);
        console.log('Impls Found:', structure.impls.length);
        console.log('Rust Imports Found:', structure.rustImports.length);
        console.log('Modules Found:', structure.modules.length);
        
        // Show detailed results
        if (structure.functions.length > 0) {
            console.log('\n🔧 Functions:');
            structure.functions.slice(0, 5).forEach((func, index) => {
                const visibility = func.isPublic ? 'pub ' : '';
                const asyncStr = func.isAsync ? 'async ' : '';
                const unsafeStr = func.isUnsafe ? 'unsafe ' : '';
                console.log(`  ${index + 1}. ${visibility}${asyncStr}${unsafeStr}${func.name} (lines ${func.startLine}-${func.endLine})`);
                if (func.returnType) {
                    console.log(`     -> ${func.returnType}`);
                }
            });
            if (structure.functions.length > 5) {
                console.log(`     ... and ${structure.functions.length - 5} more`);
            }
        }
        
        if (structure.structs.length > 0) {
            console.log('\n🏗️  Structs:');
            structure.structs.forEach((struct, index) => {
                console.log(`  ${index + 1}. ${struct.name} (lines ${struct.startLine}-${struct.endLine})`);
                if (struct.derives && struct.derives.length > 0) {
                    console.log(`     - Derives: ${struct.derives.join(', ')}`);
                }
                if (struct.fields && struct.fields.length > 0) {
                    console.log(`     - Fields: ${struct.fields.join(', ')}`);
                }
            });
        }
        
        if (structure.traits.length > 0) {
            console.log('\n🔗 Traits:');
            structure.traits.forEach((trait, index) => {
                console.log(`  ${index + 1}. ${trait.name} (lines ${trait.startLine}-${trait.endLine})`);
                if (trait.methods && trait.methods.length > 0) {
                    console.log(`     - Methods: ${trait.methods.join(', ')}`);
                }
            });
        }
        
        if (structure.impls.length > 0) {
            console.log('\n⚙️  Implementations:');
            structure.impls.slice(0, 3).forEach((impl, index) => {
                const traitStr = impl.trait ? ` of ${impl.trait}` : '';
                console.log(`  ${index + 1}. impl${traitStr} for ${impl.target} (lines ${impl.startLine}-${impl.endLine})`);
                if (impl.methods && impl.methods.length > 0) {
                    console.log(`     - Methods: ${impl.methods.join(', ')}`);
                }
            });
            if (structure.impls.length > 3) {
                console.log(`     ... and ${structure.impls.length - 3} more`);
            }
        }
        
        if (structure.rustImports.length > 0) {
            console.log('\n📦 Rust Imports:');
            structure.rustImports.slice(0, 10).forEach((imp, index) => {
                const external = imp.isExternal ? ' (external)' : ' (internal)';
                const alias = imp.alias ? ` as ${imp.alias}` : '';
                const glob = imp.isGlob ? '::*' : '';
                console.log(`  ${index + 1}. ${imp.path}${glob}${alias}${external}`);
            });
            if (structure.rustImports.length > 10) {
                console.log(`     ... and ${structure.rustImports.length - 10} more`);
            }
        }
        
        // Test framework detection
        console.log('\n🛠️  Framework Detection:');
        // Check for frameworks in imports
        const frameworks = [];
        if (structure.rustImports.some(imp => imp.path.includes('actix'))) frameworks.push('Actix-Web');
        if (structure.rustImports.some(imp => imp.path.includes('tokio'))) frameworks.push('Tokio');
        if (structure.rustImports.some(imp => imp.path.includes('serde'))) frameworks.push('Serde');
        if (structure.rustImports.some(imp => imp.path.includes('async_trait'))) frameworks.push('Async-Trait');
        
        if (frameworks.length > 0) {
            console.log('Detected frameworks:', frameworks.join(', '));
        } else {
            console.log('No frameworks detected');
        }
        
        // Test pattern analysis
        console.log('\n📋 Pattern Analysis:');
        // Analyze patterns based on structure
        const patterns = [];
        if (structure.functions.some(f => f.isAsync)) patterns.push('Async/Await');
        if (structure.traits.length > 0) patterns.push('Trait-based design');
        if (structure.impls.some(i => i.trait)) patterns.push('Trait implementation');
        if (structure.structs.some(s => s.derives?.includes('Serialize'))) patterns.push('Serialization');
        
        if (patterns.length > 0) {
            patterns.forEach((pattern, index) => {
                console.log(`  ${index + 1}. ${pattern}`);
            });
        } else {
            console.log('No patterns detected');
        }
        
        // Test performance
        console.log('\n⏱️  Performance Test:');
        const startTime = process.hrtime.bigint();
        await analyzer.analyzeFile(testFilePath);
        const endTime = process.hrtime.bigint();
        const duration = Number(endTime - startTime) / 1_000_000; // Convert to milliseconds
        console.log(`Analysis completed in ${duration.toFixed(2)}ms`);
        
        // Clean up
        await unlink(testFilePath);
        
        console.log('\n✅ Rust AST Analyzer test completed successfully!');
        
    } catch (error) {
        console.error('❌ Test failed:', error);
        console.error('Stack trace:', error.stack);
    }
}

// Run the test
testRustAnalyzer().catch(console.error);