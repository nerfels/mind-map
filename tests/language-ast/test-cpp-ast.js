#!/usr/bin/env node

/**
 * Test script for C++ AST analyzer
 * Tests C++ code parsing, class/struct detection, and framework analysis
 */

import { CppAnalyzer } from './dist/core/CppAnalyzer.js';
import { writeFile, unlink } from 'fs/promises';

const analyzer = new CppAnalyzer();

// Sample C++ code for testing
const cppTestCode = `
#include <iostream>
#include <vector>
#include <memory>
#include <string>
#include <boost/algorithm/string.hpp>
#include <Qt/QApplication>

using namespace std;

namespace UserService {
    
    enum class UserRole {
        ADMIN,
        USER,
        GUEST
    };
    
    class User {
    private:
        int id;
        string name;
        string email;
        UserRole role;
        
    public:
        User(int id, const string& name, const string& email) 
            : id(id), name(name), email(email), role(UserRole::USER) {}
        
        virtual ~User() = default;
        
        int getId() const { return id; }
        string getName() const { return name; }
        string getEmail() const { return email; }
        UserRole getRole() const { return role; }
        
        void setRole(UserRole newRole) { role = newRole; }
        
        virtual void displayInfo() const {
            cout << "User: " << name << " (" << email << ")" << endl;
        }
    };
    
    class AdminUser : public User {
    private:
        vector<string> permissions;
        
    public:
        AdminUser(int id, const string& name, const string& email) 
            : User(id, name, email) {
            setRole(UserRole::ADMIN);
        }
        
        void addPermission(const string& permission) {
            permissions.push_back(permission);
        }
        
        void displayInfo() const override {
            cout << "Admin: " << getName() << " (" << getEmail() << ")" << endl;
            cout << "Permissions: " << permissions.size() << endl;
        }
    };
    
    template<typename T>
    class Repository {
    private:
        vector<shared_ptr<T>> items;
        
    public:
        void add(shared_ptr<T> item) {
            items.push_back(item);
        }
        
        shared_ptr<T> findById(int id) {
            for (const auto& item : items) {
                if (item->getId() == id) {
                    return item;
                }
            }
            return nullptr;
        }
        
        size_t count() const {
            return items.size();
        }
    };
}

int main(int argc, char* argv[]) {
    using namespace UserService;
    
    Repository<User> userRepo;
    
    auto user1 = make_shared<User>(1, "John Doe", "john@example.com");
    auto admin1 = make_shared<AdminUser>(2, "Admin User", "admin@example.com");
    
    userRepo.add(user1);
    userRepo.add(admin1);
    
    cout << "Total users: " << userRepo.count() << endl;
    
    auto foundUser = userRepo.findById(1);
    if (foundUser) {
        foundUser->displayInfo();
    }
    
    return 0;
}
`;

async function testCppAnalyzer() {
    console.log('🔧 Testing C++ AST Analyzer\n');
    
    try {
        // Create temporary C++ file
        const testFilePath = './test-cpp-file.cpp';
        await writeFile(testFilePath, cppTestCode);
        
        console.log('📁 Created test C++ file:', testFilePath);
        
        // Test file detection
        console.log('\n🔍 Testing file detection:');
        console.log('Can analyze .cpp file:', analyzer.canAnalyze('test.cpp'));
        console.log('Can analyze .cc file:', analyzer.canAnalyze('test.cc'));
        console.log('Can analyze .h file:', analyzer.canAnalyze('test.h'));
        console.log('Cannot analyze .js file:', analyzer.canAnalyze('test.js'));
        
        // Analyze the C++ file
        console.log('\n⚡ Analyzing C++ code structure...');
        const structure = await analyzer.analyzeFile(testFilePath);
        
        if (!structure) {
            console.error('❌ Failed to analyze C++ file');
            return;
        }
        
        console.log('\n📊 Analysis Results:');
        console.log('Functions Found:', structure.functions.length);
        console.log('Classes Found:', structure.classes.length);
        console.log('Structs Found:', structure.structs?.length || 0);
        console.log('Namespaces Found:', structure.namespaces?.length || 0);
        console.log('Templates Found:', structure.templates?.length || 0);
        console.log('Enums Found:', structure.enums?.length || 0);
        console.log('C++ Includes Found:', structure.cppIncludes?.length || 0);
        
        // Show detailed results
        if (structure.functions.length > 0) {
            console.log('\n🔧 Functions:');
            structure.functions.slice(0, 5).forEach((func, index) => {
                console.log(`  ${index + 1}. ${func.name} (lines ${func.startLine}-${func.endLine})`);
                if (func.returnType) {
                    console.log(`     -> ${func.returnType}`);
                }
            });
            if (structure.functions.length > 5) {
                console.log(`     ... and ${structure.functions.length - 5} more`);
            }
        }
        
        if (structure.classes.length > 0) {
            console.log('\n🏗️  Classes:');
            structure.classes.forEach((cls, index) => {
                console.log(`  ${index + 1}. ${cls.name} (lines ${cls.startLine}-${cls.endLine})`);
                if (cls.methods && cls.methods.length > 0) {
                    console.log(`     - Methods: ${cls.methods.slice(0, 3).join(', ')}${cls.methods.length > 3 ? '...' : ''}`);
                }
                if (cls.inheritance) {
                    console.log(`     - Inherits from: ${cls.inheritance}`);
                }
            });
        }
        
        if (structure.namespaces && structure.namespaces.length > 0) {
            console.log('\n📦 Namespaces:');
            structure.namespaces.forEach((ns, index) => {
                console.log(`  ${index + 1}. ${ns.name || '(anonymous)'} (lines ${ns.startLine}-${ns.endLine})`);
            });
        }
        
        if (structure.templates && structure.templates.length > 0) {
            console.log('\n🔷 Templates:');
            structure.templates.forEach((tmpl, index) => {
                console.log(`  ${index + 1}. ${tmpl.type} template: ${tmpl.name} (line ${tmpl.startLine})`);
                if (tmpl.parameters && tmpl.parameters.length > 0) {
                    console.log(`     - Parameters: ${tmpl.parameters.join(', ')}`);
                }
            });
        }
        
        if (structure.enums && structure.enums.length > 0) {
            console.log('\n🔢 Enums:');
            structure.enums.forEach((enm, index) => {
                const classEnum = enm.isClass ? 'class ' : '';
                console.log(`  ${index + 1}. enum ${classEnum}${enm.name} (lines ${enm.startLine}-${enm.endLine})`);
                if (enm.values && enm.values.length > 0) {
                    console.log(`     - Values: ${enm.values.join(', ')}`);
                }
            });
        }
        
        if (structure.cppIncludes && structure.cppIncludes.length > 0) {
            console.log('\n📚 C++ Includes:');
            structure.cppIncludes.forEach((inc, index) => {
                const type = inc.isSystem ? ' (system)' : inc.isLocal ? ' (local)' : '';
                console.log(`  ${index + 1}. ${inc.path}${type}`);
            });
        }
        
        // Test framework detection
        console.log('\n🛠️  Framework Detection:');
        const frameworks = [];
        if (structure.cppIncludes) {
            if (structure.cppIncludes.some(inc => inc.path.includes('boost'))) frameworks.push('Boost');
            if (structure.cppIncludes.some(inc => inc.path.includes('Qt') || inc.path.includes('Q'))) frameworks.push('Qt');
            if (structure.cppIncludes.some(inc => inc.path.includes('gtest'))) frameworks.push('Google Test');
            if (structure.cppIncludes.some(inc => inc.path.includes('opencv'))) frameworks.push('OpenCV');
        }
        
        if (frameworks.length > 0) {
            console.log('Detected frameworks:', frameworks.join(', '));
        } else {
            console.log('No frameworks detected');
        }
        
        // Test pattern analysis
        console.log('\n📋 Pattern Analysis:');
        const patterns = [];
        if (structure.templates && structure.templates.length > 0) patterns.push('Template programming');
        if (structure.classes.some(c => c.inheritance)) patterns.push('Inheritance');
        if (structure.functions.some(f => f.name?.includes('virtual'))) patterns.push('Polymorphism');
        if (structure.namespaces && structure.namespaces.length > 0) patterns.push('Namespace organization');
        
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
        
        console.log('\n✅ C++ AST Analyzer test completed successfully!');
        
    } catch (error) {
        console.error('❌ Test failed:', error);
        console.error('Stack trace:', error.stack);
    }
}

// Run the test
testCppAnalyzer().catch(console.error);