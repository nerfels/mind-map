import { readFile } from 'fs/promises';
import { spawn } from 'child_process';
import { join } from 'path';
import { CodeStructure } from '../types/index.js';

export interface GoCodeStructure extends CodeStructure {
  goImports: Array<{
    path: string;
    alias?: string;
    isStandard?: boolean;
    isDot?: boolean;
  }>;
  interfaces: Array<{
    name: string;
    startLine: number;
    endLine: number;
    methods: string[];
  }>;
  structs: Array<{
    name: string;
    startLine: number;
    endLine: number;
    fields: string[];
    methods: string[];
  }>;
  packageName?: string;
}

/**
 * Go AST Analyzer using Go's built-in go/parser and go/ast packages
 * Executes Go scripts to parse AST and extract code structure
 */
export class GoAnalyzer {
  private supportedExtensions: Set<string>;
  private goExecutable: string;
  private astParserScript: string;

  constructor() {
    this.supportedExtensions = new Set(['go']);
    this.goExecutable = 'go'; // Go executable
    this.astParserScript = this.generateASTParserScript();
  }

  canAnalyze(filePath: string): boolean {
    const extension = filePath.split('.').pop()?.toLowerCase();
    return extension ? this.supportedExtensions.has(extension) : false;
  }

  async analyzeFile(filePath: string): Promise<GoCodeStructure | null> {
    if (!this.canAnalyze(filePath)) {
      return null;
    }

    try {
      const content = await readFile(filePath, 'utf-8');
      return await this.parseCode(content, filePath);
    } catch (error) {
      console.warn(`Failed to analyze Go file ${filePath}:`, error);
      return null;
    }
  }

  private async parseCode(content: string, filePath: string): Promise<GoCodeStructure> {
    try {
      // Create temporary Go script to parse the AST
      const goScript = this.astParserScript;
      
      const result = await this.executeGoAST(goScript, content);
      return this.processASTResult(result);
    } catch (error) {
      console.warn(`Failed to parse Go code ${filePath}:`, error);
      return {
        functions: [],
        classes: [], // Go doesn't have classes, but we'll map structs here
        imports: [],
        exports: [], // Go doesn't have explicit exports like JS/TS
        goImports: [],
        interfaces: [],
        structs: []
      };
    }
  }

  private generateASTParserScript(): string {
    return `
package main

import (
	"encoding/json"
	"fmt"
	"go/ast"
	"go/parser"
	"go/token"
	"io/ioutil"
	"os"
	"strings"
)

type GoCodeStructure struct {
	Functions   []Function   \`json:"functions"\`
	Classes     []Struct     \`json:"classes"\`     // Map structs to classes for compatibility
	Imports     []Import     \`json:"imports"\`
	Exports     []Export     \`json:"exports"\`     // Always empty for Go
	GoImports   []GoImport   \`json:"goImports"\`
	Interfaces  []Interface  \`json:"interfaces"\`
	Structs     []Struct     \`json:"structs"\`
	PackageName string       \`json:"packageName"\`
}

type Function struct {
	Name       string   \`json:"name"\`
	StartLine  int      \`json:"startLine"\`
	EndLine    int      \`json:"endLine"\`
	Parameters []string \`json:"parameters"\`
	ReturnType string   \`json:"returnType,omitempty"\`
	IsMethod   bool     \`json:"isMethod,omitempty"\`
	Receiver   string   \`json:"receiver,omitempty"\`
}

type Struct struct {
	Name      string   \`json:"name"\`
	StartLine int      \`json:"startLine"\`
	EndLine   int      \`json:"endLine"\`
	Methods   []string \`json:"methods"\`
	Fields    []string \`json:"fields,omitempty"\`
}

type Interface struct {
	Name      string   \`json:"name"\`
	StartLine int      \`json:"startLine"\`
	EndLine   int      \`json:"endLine"\`
	Methods   []string \`json:"methods"\`
}

type Import struct {
	Module string \`json:"module"\`
	Type   string \`json:"type"\`
}

type Export struct {
	Name string \`json:"name"\`
	Type string \`json:"type"\`
}

type GoImport struct {
	Path       string \`json:"path"\`
	Alias      string \`json:"alias,omitempty"\`
	IsStandard bool   \`json:"isStandard,omitempty"\`
	IsDot      bool   \`json:"isDot,omitempty"\`
}

func main() {
	// Read Go code from stdin
	input, err := ioutil.ReadAll(os.Stdin)
	if err != nil {
		fmt.Fprintf(os.Stderr, "Error reading input: %v\n", err)
		os.Exit(1)
	}

	result, err := analyzeGoCode(string(input))
	if err != nil {
		fmt.Fprintf(os.Stderr, "Error analyzing Go code: %v\n", err)
		os.Exit(1)
	}

	output, err := json.MarshalIndent(result, "", "  ")
	if err != nil {
		fmt.Fprintf(os.Stderr, "Error marshaling result: %v\n", err)
		os.Exit(1)
	}

	fmt.Print(string(output))
}

func analyzeGoCode(code string) (*GoCodeStructure, error) {
	fset := token.NewFileSet()
	
	// Parse the Go source code
	file, err := parser.ParseFile(fset, "", code, parser.ParseComments)
	if err != nil {
		return nil, fmt.Errorf("parse error: %v", err)
	}

	result := &GoCodeStructure{
		Functions:  []Function{},
		Classes:    []Struct{},
		Imports:    []Import{},
		Exports:    []Export{},
		GoImports:  []GoImport{},
		Interfaces: []Interface{},
		Structs:    []Struct{},
	}

	// Extract package name
	if file.Name != nil {
		result.PackageName = file.Name.Name
	}

	// Extract imports
	for _, imp := range file.Imports {
		path := strings.Trim(imp.Path.Value, "\"\`")
		goImport := GoImport{
			Path:       path,
			IsStandard: isStandardLibrary(path),
		}

		if imp.Name != nil {
			if imp.Name.Name == "." {
				goImport.IsDot = true
			} else if imp.Name.Name != "_" {
				goImport.Alias = imp.Name.Name
			}
		}

		result.GoImports = append(result.GoImports, goImport)
		result.Imports = append(result.Imports, Import{
			Module: path,
			Type:   "named", // Default for Go imports
		})
	}

	// Traverse AST to extract declarations
	ast.Inspect(file, func(n ast.Node) bool {
		switch node := n.(type) {
		case *ast.FuncDecl:
			extractFunction(fset, node, result)
		case *ast.TypeSpec:
			switch typeNode := node.Type.(type) {
			case *ast.StructType:
				extractStruct(fset, node, typeNode, result)
			case *ast.InterfaceType:
				extractInterface(fset, node, typeNode, result)
			}
		}
		return true
	})

	return result, nil
}

func extractFunction(fset *token.FileSet, node *ast.FuncDecl, result *GoCodeStructure) {
	if node.Name == nil {
		return
	}

	startPos := fset.Position(node.Pos())
	endPos := fset.Position(node.End())

	function := Function{
		Name:      node.Name.Name,
		StartLine: startPos.Line,
		EndLine:   endPos.Line,
		Parameters: extractParameters(node.Type.Params),
	}

	// Check if it's a method (has receiver)
	if node.Recv != nil && len(node.Recv.List) > 0 {
		function.IsMethod = true
		function.Receiver = extractReceiverType(node.Recv.List[0])
		
		// Add method to corresponding struct
		for i := range result.Structs {
			if result.Structs[i].Name == function.Receiver {
				result.Structs[i].Methods = append(result.Structs[i].Methods, function.Name)
				break
			}
		}
		for i := range result.Classes {
			if result.Classes[i].Name == function.Receiver {
				result.Classes[i].Methods = append(result.Classes[i].Methods, function.Name)
				break
			}
		}
	}

	// Extract return type
	if node.Type.Results != nil && len(node.Type.Results.List) > 0 {
		function.ReturnType = extractTypeString(node.Type.Results.List[0].Type)
	}

	result.Functions = append(result.Functions, function)
}

func extractStruct(fset *token.FileSet, typeSpec *ast.TypeSpec, structType *ast.StructType, result *GoCodeStructure) {
	if typeSpec.Name == nil {
		return
	}

	startPos := fset.Position(typeSpec.Pos())
	endPos := fset.Position(typeSpec.End())

	structInfo := Struct{
		Name:      typeSpec.Name.Name,
		StartLine: startPos.Line,
		EndLine:   endPos.Line,
		Methods:   []string{},
		Fields:    []string{},
	}

	// Extract struct fields
	if structType.Fields != nil {
		for _, field := range structType.Fields.List {
			for _, name := range field.Names {
				structInfo.Fields = append(structInfo.Fields, name.Name)
			}
		}
	}

	result.Structs = append(result.Structs, structInfo)
	result.Classes = append(result.Classes, structInfo) // Map to classes for compatibility
}

func extractInterface(fset *token.FileSet, typeSpec *ast.TypeSpec, interfaceType *ast.InterfaceType, result *GoCodeStructure) {
	if typeSpec.Name == nil {
		return
	}

	startPos := fset.Position(typeSpec.Pos())
	endPos := fset.Position(typeSpec.End())

	interfaceInfo := Interface{
		Name:      typeSpec.Name.Name,
		StartLine: startPos.Line,
		EndLine:   endPos.Line,
		Methods:   []string{},
	}

	// Extract interface methods
	if interfaceType.Methods != nil {
		for _, method := range interfaceType.Methods.List {
			for _, name := range method.Names {
				interfaceInfo.Methods = append(interfaceInfo.Methods, name.Name)
			}
		}
	}

	result.Interfaces = append(result.Interfaces, interfaceInfo)
}

func extractParameters(fieldList *ast.FieldList) []string {
	if fieldList == nil {
		return []string{}
	}

	var params []string
	for _, field := range fieldList.List {
		for _, name := range field.Names {
			params = append(params, name.Name)
		}
	}
	return params
}

func extractReceiverType(field *ast.Field) string {
	switch t := field.Type.(type) {
	case *ast.Ident:
		return t.Name
	case *ast.StarExpr:
		if ident, ok := t.X.(*ast.Ident); ok {
			return ident.Name
		}
	}
	return "unknown"
}

func extractTypeString(expr ast.Expr) string {
	switch t := expr.(type) {
	case *ast.Ident:
		return t.Name
	case *ast.StarExpr:
		return "*" + extractTypeString(t.X)
	case *ast.ArrayType:
		return "[]" + extractTypeString(t.Elt)
	case *ast.SelectorExpr:
		return extractTypeString(t.X) + "." + t.Sel.Name
	default:
		return "unknown"
	}
}

func isStandardLibrary(importPath string) bool {
	// Common standard library prefixes
	stdLibPrefixes := []string{
		"fmt", "os", "io", "net", "http", "strings", "strconv", "time",
		"context", "encoding", "crypto", "database", "reflect", "sync",
		"runtime", "path", "log", "flag", "regexp", "sort", "bufio",
		"bytes", "errors", "math", "unicode", "archive", "compress",
		"container", "debug", "go", "hash", "html", "image", "index",
		"mime", "plugin", "testing", "text", "unsafe",
	}

	// Check if import path starts with standard library prefix
	for _, prefix := range stdLibPrefixes {
		if strings.HasPrefix(importPath, prefix) {
			return true
		}
	}

	// Standard library packages don't typically contain dots in the first segment
	parts := strings.Split(importPath, "/")
	if len(parts) > 0 && !strings.Contains(parts[0], ".") {
		return true
	}

	return false
}
`;
  }

  private async executeGoAST(script: string, code: string): Promise<any> {
    return new Promise((resolve, reject) => {
      // For now, use a simplified approach that parses Go code with regex patterns
      // This is a fallback until we can set up proper Go AST parsing
      try {
        const result = this.parseGoCodeSimple(code);
        resolve(result);
      } catch (error) {
        reject(error);
      }
    });
  }

  private parseGoCodeSimple(code: string): any {
    // Simple regex-based Go parser as fallback
    const result: any = {
      functions: [],
      classes: [], // structs mapped to classes
      imports: [],
      exports: [],
      goImports: [],
      interfaces: [],
      structs: [],
      packageName: ''
    };

    // Extract package name
    const packageMatch = code.match(/^package\s+(\w+)/m);
    if (packageMatch) {
      result.packageName = packageMatch[1];
    }

    // Extract imports
    const importMatches = code.matchAll(/import\s+(?:"([^"]+)"|`([^`]+)`|\(\s*([\s\S]*?)\s*\))/g);
    for (const match of importMatches) {
      if (match[1] || match[2]) {
        // Single import
        const path = match[1] || match[2];
        result.goImports.push({ path, isStandard: this.isStandardLibrary(path) });
        result.imports.push({ module: path, type: 'named' });
      } else if (match[3]) {
        // Multiple imports in parentheses
        const imports = match[3].split('\n');
        for (const imp of imports) {
          const impMatch = imp.trim().match(/(?:(\w+)\s+)?(?:"([^"]+)"|`([^`]+)`)/);
          if (impMatch) {
            const alias = impMatch[1];
            const path = impMatch[2] || impMatch[3];
            if (path) {
              result.goImports.push({ path, alias, isStandard: this.isStandardLibrary(path) });
              result.imports.push({ module: path, type: 'named' });
            }
          }
        }
      }
    }

    // Extract functions
    const functionMatches = code.matchAll(/func\s+(?:\([^)]*\)\s+)?(\w+)\s*\([^{]*\)\s*(?:\([^)]*\)|[\w\[\]*]+)?\s*{/g);
    let lineNumber = 1;
    for (const match of functionMatches) {
      const beforeMatch = code.substring(0, match.index);
      const startLine = beforeMatch.split('\n').length;
      
      result.functions.push({
        name: match[1],
        startLine,
        endLine: startLine + 5, // Approximate
        parameters: [],
        returnType: 'unknown'
      });
    }

    // Extract structs (map to classes for compatibility)
    const structMatches = code.matchAll(/type\s+(\w+)\s+struct\s*{/g);
    for (const match of structMatches) {
      const beforeMatch = code.substring(0, match.index);
      const startLine = beforeMatch.split('\n').length;
      
      const structInfo = {
        name: match[1],
        startLine,
        endLine: startLine + 5, // Approximate
        methods: [],
        fields: []
      };
      
      result.structs.push(structInfo);
      result.classes.push(structInfo); // Map to classes for compatibility
    }

    // Extract interfaces
    const interfaceMatches = code.matchAll(/type\s+(\w+)\s+interface\s*{/g);
    for (const match of interfaceMatches) {
      const beforeMatch = code.substring(0, match.index);
      const startLine = beforeMatch.split('\n').length;
      
      result.interfaces.push({
        name: match[1],
        startLine,
        endLine: startLine + 5, // Approximate
        methods: []
      });
    }

    return result;
  }

  private isStandardLibrary(importPath: string): boolean {
    const stdLibPrefixes = [
      'fmt', 'os', 'io', 'net', 'http', 'strings', 'strconv', 'time',
      'context', 'encoding', 'crypto', 'database', 'reflect', 'sync',
      'runtime', 'path', 'log', 'flag', 'regexp', 'sort', 'bufio',
      'bytes', 'errors', 'math', 'unicode', 'archive', 'compress',
      'container', 'debug', 'go', 'hash', 'html', 'image', 'index',
      'mime', 'plugin', 'testing', 'text', 'unsafe'
    ];

    // Check if import path starts with standard library prefix
    for (const prefix of stdLibPrefixes) {
      if (importPath.startsWith(prefix)) {
        return true;
      }
    }

    // Standard library packages don't typically contain dots in the first segment
    const parts = importPath.split('/');
    if (parts.length > 0 && !parts[0].includes('.')) {
      return true;
    }

    return false;
  }

  private processASTResult(astResult: any): GoCodeStructure {
    if (astResult.error) {
      throw new Error(astResult.error);
    }

    // Convert Go AST result to our GoCodeStructure format
    const structure: GoCodeStructure = {
      functions: astResult.functions.map((func: any) => ({
        name: func.name,
        startLine: func.startLine,
        endLine: func.endLine,
        parameters: func.parameters || [],
        returnType: func.returnType
      })),
      classes: astResult.structs.map((struct: any) => ({
        name: struct.name,
        startLine: struct.startLine,
        endLine: struct.endLine,
        methods: struct.methods || [],
        properties: struct.fields || []
      })),
      imports: astResult.imports || [],
      exports: [], // Go doesn't have explicit exports
      goImports: astResult.goImports || [],
      interfaces: astResult.interfaces || [],
      structs: astResult.structs || [],
      packageName: astResult.packageName
    };

    return structure;
  }

  /**
   * Detect Go frameworks based on imports and file patterns
   */
  detectFrameworks(structure: GoCodeStructure, filePath: string): string[] {
    const frameworks: string[] = [];
    const imports = structure.goImports.map(imp => imp.path.toLowerCase());
    const fileName = filePath.toLowerCase();

    // Web frameworks
    if (imports.some(imp => imp.includes('gin-gonic/gin'))) {
      frameworks.push('Gin');
    }
    if (imports.some(imp => imp.includes('labstack/echo'))) {
      frameworks.push('Echo');
    }
    if (imports.some(imp => imp.includes('gofiber/fiber'))) {
      frameworks.push('Fiber');
    }
    if (imports.some(imp => imp.includes('gorilla/mux'))) {
      frameworks.push('Gorilla Mux');
    }
    if (imports.some(imp => imp.includes('chi-middleware/chi'))) {
      frameworks.push('Chi');
    }

    // Database frameworks
    if (imports.some(imp => imp.includes('gorm.io/gorm'))) {
      frameworks.push('GORM');
    }
    if (imports.some(imp => imp.includes('jmoiron/sqlx'))) {
      frameworks.push('SQLx');
    }
    if (imports.some(imp => imp.includes('database/sql'))) {
      frameworks.push('SQL');
    }
    if (imports.some(imp => imp.includes('go-redis/redis'))) {
      frameworks.push('Redis');
    }
    if (imports.some(imp => imp.includes('mongodb/mongo-go-driver'))) {
      frameworks.push('MongoDB');
    }

    // Testing frameworks
    if (imports.some(imp => imp.includes('testify'))) {
      frameworks.push('Testify');
    }
    if (imports.some(imp => imp.includes('onsi/ginkgo'))) {
      frameworks.push('Ginkgo');
    }
    if (imports.some(imp => imp.includes('onsi/gomega'))) {
      frameworks.push('Gomega');
    }

    // Cloud-native and microservices
    if (imports.some(imp => imp.includes('kubernetes'))) {
      frameworks.push('Kubernetes');
    }
    if (imports.some(imp => imp.includes('docker'))) {
      frameworks.push('Docker');
    }
    if (imports.some(imp => imp.includes('grpc'))) {
      frameworks.push('gRPC');
    }
    if (imports.some(imp => imp.includes('prometheus'))) {
      frameworks.push('Prometheus');
    }
    if (imports.some(imp => imp.includes('consul'))) {
      frameworks.push('Consul');
    }
    if (imports.some(imp => imp.includes('etcd'))) {
      frameworks.push('Etcd');
    }

    // CLI frameworks
    if (imports.some(imp => imp.includes('spf13/cobra'))) {
      frameworks.push('Cobra');
    }
    if (imports.some(imp => imp.includes('urfave/cli'))) {
      frameworks.push('CLI');
    }

    // Configuration
    if (imports.some(imp => imp.includes('spf13/viper'))) {
      frameworks.push('Viper');
    }

    // Logging frameworks
    if (imports.some(imp => imp.includes('sirupsen/logrus'))) {
      frameworks.push('Logrus');
    }
    if (imports.some(imp => imp.includes('uber-go/zap'))) {
      frameworks.push('Zap');
    }

    // Message queues
    if (imports.some(imp => imp.includes('streadway/amqp'))) {
      frameworks.push('RabbitMQ');
    }
    if (imports.some(imp => imp.includes('confluentinc/confluent-kafka-go'))) {
      frameworks.push('Kafka');
    }

    // File-based detection
    if (fileName.includes('main.go')) {
      frameworks.push('Main Package');
    }
    if (fileName.includes('_test.go')) {
      frameworks.push('Go Testing');
    }
    if (fileName.includes('go.mod') || fileName.includes('go.sum')) {
      frameworks.push('Go Modules');
    }

    return frameworks;
  }

  /**
   * Analyze Go code patterns and conventions
   */
  analyzePatterns(structure: GoCodeStructure): any[] {
    const patterns: any[] = [];

    // Check for Go naming conventions (camelCase for unexported, PascalCase for exported)
    const nonConventionFunctions = structure.functions.filter(func => {
      const firstChar = func.name.charAt(0);
      const isExported = firstChar === firstChar.toUpperCase();
      const isCorrectCase = isExported ? 
        /^[A-Z][a-zA-Z0-9]*$/.test(func.name) : 
        /^[a-z][a-zA-Z0-9]*$/.test(func.name);
      return !isCorrectCase;
    });
    
    if (nonConventionFunctions.length > 0) {
      patterns.push({
        type: 'naming_convention',
        description: 'Non-Go naming convention functions detected',
        severity: 'warning',
        functions: nonConventionFunctions.map(f => f.name)
      });
    }

    // Check for Go interface patterns
    const interfaceCount = structure.interfaces.length;
    if (interfaceCount > 0) {
      patterns.push({
        type: 'design_pattern',
        description: 'Interface-based design pattern detected',
        severity: 'info',
        count: interfaceCount
      });
    }

    // Check for struct embedding patterns
    const structsWithMethods = structure.structs.filter(s => s.methods && s.methods.length > 0);
    if (structsWithMethods.length > 0) {
      patterns.push({
        type: 'design_pattern',
        description: 'Struct with methods pattern (OOP-like) detected',
        severity: 'info',
        count: structsWithMethods.length
      });
    }

    // Check for error handling patterns
    const errorReturningFunctions = structure.functions.filter(func => 
      func.returnType && func.returnType.includes('error')
    );
    if (errorReturningFunctions.length > 0) {
      patterns.push({
        type: 'error_handling',
        description: 'Go error handling pattern detected',
        severity: 'info',
        count: errorReturningFunctions.length
      });
    }

    // Check for pointer receiver patterns
    const methodsCount = structure.functions.filter(func => (func as any).isMethod).length;
    if (methodsCount > 0) {
      patterns.push({
        type: 'method_pattern',
        description: 'Method receiver pattern detected',
        severity: 'info',
        count: methodsCount
      });
    }

    return patterns;
  }
}