import { readFile } from 'fs/promises';
import { spawn } from 'child_process';
import { join } from 'path';
import { CodeStructure } from '../types/index.js';

export interface PythonCodeStructure extends CodeStructure {
  decorators: Array<{
    name: string;
    target: string;
    args?: string[];
  }>;
  pythonImports: Array<{
    module: string;
    alias?: string;
    fromImport?: boolean;
    items?: string[];
  }>;
}

/**
 * Python AST Analyzer using Python's built-in ast module
 * Executes Python scripts to parse AST and extract code structure
 */
export class PythonAnalyzer {
  private supportedExtensions: Set<string>;
  private pythonExecutable: string;
  private astParserScript: string;

  constructor() {
    this.supportedExtensions = new Set(['py']);
    this.pythonExecutable = 'python3'; // Fallback to 'python' if python3 not available
    this.astParserScript = this.generateASTParserScript();
  }

  canAnalyze(filePath: string): boolean {
    const extension = filePath.split('.').pop()?.toLowerCase();
    return extension ? this.supportedExtensions.has(extension) : false;
  }

  async analyzeFile(filePath: string): Promise<PythonCodeStructure | null> {
    if (!this.canAnalyze(filePath)) {
      return null;
    }

    try {
      const content = await readFile(filePath, 'utf-8');
      return await this.parseCode(content, filePath);
    } catch (error) {
      console.warn(`Failed to analyze Python file ${filePath}:`, error);
      return null;
    }
  }

  private async parseCode(content: string, filePath: string): Promise<PythonCodeStructure> {
    try {
      // Create temporary Python script to parse the AST
      const pythonScript = this.astParserScript;
      
      const result = await this.executePythonAST(pythonScript, content);
      return this.processASTResult(result);
    } catch (error) {
      console.warn(`Failed to parse Python code ${filePath}:`, error);
      return {
        functions: [],
        classes: [],
        imports: [],
        exports: [],
        decorators: [],
        pythonImports: []
      };
    }
  }

  private generateASTParserScript(): string {
    return `
import ast
import json
import sys

def analyze_python_code(code):
    """Parse Python code and extract structure information"""
    try:
        tree = ast.parse(code)
    except SyntaxError as e:
        return {"error": f"Syntax error: {e}"}
    
    result = {
        "functions": [],
        "classes": [],
        "imports": [],
        "decorators": [],
        "pythonImports": []
    }
    
    class CodeVisitor(ast.NodeVisitor):
        def visit_FunctionDef(self, node):
            func_info = {
                "name": node.name,
                "startLine": node.lineno,
                "endLine": getattr(node, 'end_lineno', node.lineno),
                "parameters": [arg.arg for arg in node.args.args],
                "returnType": None,
                "isAsync": False,
                "decorators": [self.get_decorator_name(d) for d in node.decorator_list]
            }
            
            # Check for type hints
            if node.returns:
                func_info["returnType"] = ast.unparse(node.returns) if hasattr(ast, 'unparse') else "Any"
            
            result["functions"].append(func_info)
            
            # Record decorators
            for decorator in node.decorator_list:
                decorator_info = {
                    "name": self.get_decorator_name(decorator),
                    "target": node.name,
                    "args": []
                }
                result["decorators"].append(decorator_info)
            
            self.generic_visit(node)
        
        def visit_AsyncFunctionDef(self, node):
            func_info = {
                "name": node.name,
                "startLine": node.lineno,
                "endLine": getattr(node, 'end_lineno', node.lineno),
                "parameters": [arg.arg for arg in node.args.args],
                "returnType": None,
                "isAsync": True,
                "decorators": [self.get_decorator_name(d) for d in node.decorator_list]
            }
            
            if node.returns:
                func_info["returnType"] = ast.unparse(node.returns) if hasattr(ast, 'unparse') else "Any"
            
            result["functions"].append(func_info)
            self.generic_visit(node)
        
        def visit_ClassDef(self, node):
            class_info = {
                "name": node.name,
                "startLine": node.lineno,
                "endLine": getattr(node, 'end_lineno', node.lineno),
                "methods": [],
                "properties": [],
                "baseClasses": [ast.unparse(base) if hasattr(ast, 'unparse') else str(base) for base in node.bases],
                "decorators": [self.get_decorator_name(d) for d in node.decorator_list]
            }
            
            # Extract methods and properties
            for item in node.body:
                if isinstance(item, ast.FunctionDef):
                    class_info["methods"].append(item.name)
                elif isinstance(item, ast.AsyncFunctionDef):
                    class_info["methods"].append(item.name)
                elif isinstance(item, ast.Assign):
                    for target in item.targets:
                        if isinstance(target, ast.Name):
                            class_info["properties"].append(target.id)
            
            result["classes"].append(class_info)
            self.generic_visit(node)
        
        def visit_Import(self, node):
            for alias in node.names:
                import_info = {
                    "module": alias.name,
                    "alias": alias.asname,
                    "fromImport": False,
                    "type": "import"
                }
                result["imports"].append(import_info)
                result["pythonImports"].append(import_info)
            
            self.generic_visit(node)
        
        def visit_ImportFrom(self, node):
            if node.module:
                items = [alias.name for alias in node.names] if node.names else []
                import_info = {
                    "module": node.module,
                    "alias": None,
                    "fromImport": True,
                    "items": items,
                    "type": "from_import"
                }
                result["imports"].append(import_info)
                result["pythonImports"].append(import_info)
            
            self.generic_visit(node)
        
        def get_decorator_name(self, decorator):
            """Extract decorator name from AST node"""
            if isinstance(decorator, ast.Name):
                return decorator.id
            elif isinstance(decorator, ast.Attribute):
                return f"{decorator.value.id}.{decorator.attr}" if hasattr(decorator.value, 'id') else decorator.attr
            elif isinstance(decorator, ast.Call):
                if isinstance(decorator.func, ast.Name):
                    return decorator.func.id
                elif isinstance(decorator.func, ast.Attribute):
                    return f"{decorator.func.value.id}.{decorator.func.attr}" if hasattr(decorator.func.value, 'id') else decorator.func.attr
            return "unknown_decorator"
    
    visitor = CodeVisitor()
    visitor.visit(tree)
    return result

if __name__ == "__main__":
    # Read code from stdin
    code = sys.stdin.read()
    result = analyze_python_code(code)
    print(json.dumps(result, indent=2))
`;
  }

  private async executePythonAST(script: string, code: string): Promise<any> {
    return new Promise((resolve, reject) => {
      const pythonProcess = spawn(this.pythonExecutable, ['-c', script], {
        stdio: ['pipe', 'pipe', 'pipe']
      });

      let stdout = '';
      let stderr = '';

      pythonProcess.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      pythonProcess.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      pythonProcess.on('close', (code_exit) => {
        if (code_exit !== 0) {
          reject(new Error(`Python AST parser failed: ${stderr}`));
        } else {
          try {
            const result = JSON.parse(stdout);
            resolve(result);
          } catch (e) {
            reject(new Error(`Failed to parse Python AST result: ${e instanceof Error ? e.message : String(e)}`));
          }
        }
      });

      pythonProcess.on('error', (error) => {
        reject(new Error(`Failed to spawn Python process: ${error.message}`));
      });

      // Send code to Python process
      pythonProcess.stdin.write(code);
      pythonProcess.stdin.end();
    });
  }

  private processASTResult(astResult: any): PythonCodeStructure {
    if (astResult.error) {
      throw new Error(astResult.error);
    }

    // Convert Python AST result to our CodeStructure format
    const structure: PythonCodeStructure = {
      functions: astResult.functions.map((func: any) => ({
        name: func.name,
        startLine: func.startLine,
        endLine: func.endLine,
        parameters: func.parameters,
        returnType: func.returnType
      })),
      classes: astResult.classes.map((cls: any) => ({
        name: cls.name,
        startLine: cls.startLine,
        endLine: cls.endLine,
        methods: cls.methods,
        properties: cls.properties,
        baseClasses: cls.baseClasses || [],
        decorators: cls.decorators || []
      })),
      imports: astResult.imports,
      exports: [], // Python doesn't have explicit exports like JS/TS
      decorators: astResult.decorators || [],
      pythonImports: astResult.pythonImports || []
    };

    return structure;
  }

  /**
   * Detect Python frameworks based on imports and file patterns
   */
  detectFrameworks(structure: PythonCodeStructure, filePath: string): string[] {
    const frameworks: string[] = [];
    const imports = structure.pythonImports.map(imp => imp.module.toLowerCase());
    const fileName = filePath.toLowerCase();

    // Web frameworks
    if (imports.some(imp => imp.includes('django'))) {
      frameworks.push('Django');
    }
    if (imports.some(imp => imp.includes('flask'))) {
      frameworks.push('Flask');
    }
    if (imports.some(imp => imp.includes('fastapi'))) {
      frameworks.push('FastAPI');
    }
    if (imports.some(imp => imp.includes('tornado'))) {
      frameworks.push('Tornado');
    }

    // Data science frameworks
    if (imports.some(imp => imp.includes('pandas'))) {
      frameworks.push('Pandas');
    }
    if (imports.some(imp => imp.includes('numpy'))) {
      frameworks.push('NumPy');
    }
    if (imports.some(imp => imp.includes('scipy'))) {
      frameworks.push('SciPy');
    }
    if (imports.some(imp => imp.includes('matplotlib'))) {
      frameworks.push('Matplotlib');
    }
    if (imports.some(imp => imp.includes('seaborn'))) {
      frameworks.push('Seaborn');
    }

    // ML frameworks
    if (imports.some(imp => imp.includes('tensorflow'))) {
      frameworks.push('TensorFlow');
    }
    if (imports.some(imp => imp.includes('torch') || imp.includes('pytorch'))) {
      frameworks.push('PyTorch');
    }
    if (imports.some(imp => imp.includes('sklearn') || imp.includes('scikit-learn'))) {
      frameworks.push('Scikit-learn');
    }

    // Testing frameworks
    if (imports.some(imp => imp.includes('pytest'))) {
      frameworks.push('pytest');
    }
    if (imports.some(imp => imp.includes('unittest'))) {
      frameworks.push('unittest');
    }

    // File-based detection
    if (fileName.includes('manage.py') || fileName.includes('settings.py')) {
      frameworks.push('Django');
    }
    if (fileName.includes('app.py') && imports.some(imp => imp.includes('flask'))) {
      frameworks.push('Flask');
    }

    return frameworks;
  }

  /**
   * Analyze Python code patterns and conventions
   */
  analyzePatterns(structure: PythonCodeStructure): any[] {
    const patterns: any[] = [];

    // Check for PEP 8 naming conventions
    const nonSnakeCaseFunctions = structure.functions.filter(func => 
      !/^[a-z][a-z0-9_]*$/.test(func.name) && !func.name.startsWith('__')
    );
    
    if (nonSnakeCaseFunctions.length > 0) {
      patterns.push({
        type: 'naming_convention',
        description: 'Non-snake_case function names detected',
        severity: 'warning',
        functions: nonSnakeCaseFunctions.map(f => f.name)
      });
    }

    // Check for common decorator patterns
    const decoratorUsage = structure.decorators.reduce((acc, dec) => {
      acc[dec.name] = (acc[dec.name] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    if (decoratorUsage['@property'] || decoratorUsage['property']) {
      patterns.push({
        type: 'design_pattern',
        description: 'Property decorator pattern used',
        severity: 'info'
      });
    }

    if (decoratorUsage['@staticmethod'] || decoratorUsage['staticmethod']) {
      patterns.push({
        type: 'design_pattern',
        description: 'Static method pattern used',
        severity: 'info'
      });
    }

    return patterns;
  }
}