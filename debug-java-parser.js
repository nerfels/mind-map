#!/usr/bin/env node

import * as JavaParser from 'java-parser';
import { readFile } from 'fs/promises';

async function testJavaParser() {
    console.log('🔍 Testing java-parser library directly...\n');

    const testFile = './test-java-project/src/main/java/com/example/Calculator.java';

    try {
        console.log('📁 Reading file:', testFile);
        const content = await readFile(testFile, 'utf-8');
        console.log('✅ File read successfully, length:', content.length);
        console.log('📝 Content preview:');
        console.log(content.substring(0, 300) + '...\n');

        console.log('🚀 Running JavaParser.parse...');
        const parseResult = JavaParser.parse(content);
        console.log('📊 Parse result type:', typeof parseResult);
        console.log('📊 Parse result keys:', parseResult ? Object.keys(parseResult) : 'null/undefined');
        if (parseResult && parseResult.children) {
            console.log('📊 Children keys:', Object.keys(parseResult.children));
        }

        console.log('\n🔍 Checking for ordinaryCompilationUnit...');
        if (parseResult && parseResult.children && parseResult.children.ordinaryCompilationUnit) {
            console.log('✅ Found ordinaryCompilationUnit');
            const compilationUnit = parseResult.children.ordinaryCompilationUnit[0];
            console.log('📋 CompilationUnit keys:', Object.keys(compilationUnit.children || {}));

            if (compilationUnit.children.typeDeclaration) {
                console.log('✅ Found typeDeclaration, count:', compilationUnit.children.typeDeclaration.length);
                compilationUnit.children.typeDeclaration.forEach((typeDecl, i) => {
                    console.log(`📝 Type Declaration ${i}:`, Object.keys(typeDecl.children || {}));
                    if (typeDecl.children.classDeclaration) {
                        const classDecl = typeDecl.children.classDeclaration[0];
                        console.log('📋 Class Declaration keys:', Object.keys(classDecl.children || {}));

                        // Check normalClassDeclaration
                        if (classDecl.children.normalClassDeclaration) {
                            const normalClassDecl = classDecl.children.normalClassDeclaration[0];
                            console.log('📋 Normal Class Declaration keys:', Object.keys(normalClassDecl.children || {}));

                            if (normalClassDecl.children.typeIdentifier) {
                                console.log('✅ Class name:', normalClassDecl.children.typeIdentifier[0].children.Identifier[0].image);
                            }

                            if (normalClassDecl.children.classBody) {
                                const classBody = normalClassDecl.children.classBody[0];
                                console.log('📋 Class Body keys:', Object.keys(classBody.children || {}));

                                if (classBody.children.classBodyDeclaration) {
                                    console.log('✅ Found classBodyDeclaration, count:', classBody.children.classBodyDeclaration.length);
                                    classBody.children.classBodyDeclaration.forEach((bodyDecl, j) => {
                                        console.log(`📝 Body Declaration ${j}:`, Object.keys(bodyDecl.children || {}));

                                        // Check constructorDeclaration
                                        if (bodyDecl.children.constructorDeclaration) {
                                            const constructorDecl = bodyDecl.children.constructorDeclaration[0];
                                            console.log(`  🏗️ Constructor Declaration ${j}:`, Object.keys(constructorDecl.children || {}));
                                            if (constructorDecl.children.constructorDeclarator) {
                                                const declarator = constructorDecl.children.constructorDeclarator[0];
                                                if (declarator.children.Identifier) {
                                                    console.log(`  ✅ Constructor name:`, declarator.children.Identifier[0].image);
                                                }
                                            }
                                        }

                                        // Check classMemberDeclaration
                                        if (bodyDecl.children.classMemberDeclaration) {
                                            const memberDecl = bodyDecl.children.classMemberDeclaration[0];
                                            console.log(`  📋 Member Declaration ${j}:`, Object.keys(memberDecl.children || {}));

                                            if (memberDecl.children.methodDeclaration) {
                                                const methodDecl = memberDecl.children.methodDeclaration[0];
                                                console.log(`    🔧 Method Declaration:`, Object.keys(methodDecl.children || {}));
                                                if (methodDecl.children.methodHeader) {
                                                    const header = methodDecl.children.methodHeader[0];
                                                    if (header.children.methodDeclarator) {
                                                        const declarator = header.children.methodDeclarator[0];
                                                        if (declarator.children.Identifier) {
                                                            console.log(`    ✅ Method name:`, declarator.children.Identifier[0].image);
                                                        }
                                                    }
                                                }
                                            }

                                            if (memberDecl.children.fieldDeclaration) {
                                                const fieldDecl = memberDecl.children.fieldDeclaration[0];
                                                console.log(`    📝 Field Declaration:`, Object.keys(fieldDecl.children || {}));
                                            }
                                        }
                                    });
                                }
                            }
                        }
                    }
                });
            } else {
                console.log('❌ No typeDeclaration found');
            }
        } else {
            console.log('❌ No compilationUnit found');
        }

    } catch (error) {
        console.error('❌ Error:', error);
        console.error('Stack:', error.stack);
    }
}

testJavaParser().catch(console.error);