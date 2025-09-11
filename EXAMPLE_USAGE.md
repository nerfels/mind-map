# Mind Map MCP - Example Usage

This document shows practical examples of how the Mind Map MCP server enhances Claude Code's understanding of your projects.

## Initial Setup

When you first start using the Mind Map MCP with a project:

```bash
# The server automatically scans your project
# Creating a knowledge graph of files, directories, and patterns
```

**Result**: Creates nodes for 22 files, 5 directories with relationships between them.

## Basic Queries

### Finding Authentication Code
```json
{
  "name": "query_mindmap",
  "arguments": {
    "query": "authentication login user",
    "type": "file",
    "limit": 5
  }
}
```

**What happens**: The server searches through file names, paths, and metadata to find files related to authentication, even if they don't have "auth" in the filename.

### Finding TypeScript Files
```json
{
  "name": "query_mindmap", 
  "arguments": {
    "query": "typescript",
    "limit": 10
  }
}
```

**Result**: Returns all TypeScript files with confidence scores, language detection, and framework identification.

## Learning from Tasks

### Recording a Successful Fix
```json
{
  "name": "update_mindmap",
  "arguments": {
    "task_description": "Fixed JWT token validation bug",
    "files_involved": ["src/auth/jwt.ts", "src/middleware/auth.ts"],
    "outcome": "success",
    "solution_details": {
      "approach": "Updated token expiration check logic",
      "files_changed": ["src/auth/jwt.ts"],
      "key_changes": "Added proper null check for token.exp",
      "effectiveness": 0.9
    }
  }
}
```

**Impact**: 
- Increases confidence score for `src/auth/jwt.ts` 
- Creates associations between JWT bugs and these specific files
- Next time Claude Code looks for auth issues, these files will be prioritized

### Recording an Error Pattern
```json
{
  "name": "update_mindmap",
  "arguments": {
    "task_description": "Tried to fix TypeScript import error",
    "files_involved": ["src/utils/helpers.ts"],
    "outcome": "error", 
    "error_details": {
      "error_type": "import",
      "error_message": "Cannot find module './missing-file'",
      "fix_applied": "Updated import path to './existing-file'"
    }
  }
}
```

**Impact**:
- Creates error node linking import problems to this file
- Maps "import" errors to solutions involving path corrections
- Helps identify files prone to import issues

## Smart Exploration

### Getting Task-Specific Suggestions
```json
{
  "name": "suggest_exploration",
  "arguments": {
    "task_description": "add user registration endpoint",
    "exploration_type": "files"
  }
}
```

**Response**: Server analyzes the request and suggests:
1. Existing authentication files (high confidence)
2. API route files 
3. User model/schema files
4. Validation middleware
5. Database connection files

### Context-Aware Recommendations  
```json
{
  "name": "suggest_exploration",
  "arguments": {
    "task_description": "database connection is failing",
    "current_location": "src/api/users.ts"
  }
}
```

**Response**: Prioritizes files based on:
- Previous database-related fixes
- Files in similar directory structure
- Configuration files (database.ts, .env references)
- Error patterns from past database issues

## Project Intelligence

### Getting Project Overview
```json
{
  "name": "get_context",
  "arguments": {
    "context_type": "project_overview"
  }
}
```

**Response**:
```
Project Overview (/path/to/project):
- Files: 22
- Directories: 5  
- Functions: 0 (requires code analysis)
- Classes: 0 (requires code analysis)
- Errors tracked: 1
- Patterns: 2
- Average confidence: 0.95
```

### Analyzing Success Patterns
```json
{
  "name": "get_context", 
  "arguments": {
    "context_type": "success_patterns",
    "limit": 3
  }
}
```

**Response**:
```
Success Patterns (3):
- src/auth/jwt.ts (confidence: 0.95)
- src/middleware/auth.ts (confidence: 0.90) 
- src/api/auth.ts (confidence: 0.85)
```

## Real-World Workflow Examples

### Scenario 1: New Developer Joining Project

**Step 1**: Claude Code scans project
```json
{"name": "scan_project", "arguments": {"force_rescan": true}}
```

**Step 2**: Get project overview
```json
{"name": "get_context", "arguments": {"context_type": "project_overview"}}
```

**Step 3**: Explore specific area
```json
{
  "name": "suggest_exploration",
  "arguments": {
    "task_description": "understand how API routes are structured"
  }
}
```

**Result**: New developer gets intelligent guidance to the most important files and patterns.

### Scenario 2: Debugging a Persistent Issue

**Step 1**: Query for similar past errors  
```json
{"name": "get_context", "arguments": {"context_type": "error_patterns"}}
```

**Step 2**: Search for related files
```json
{
  "name": "query_mindmap",
  "arguments": {
    "query": "database connection timeout",
    "include_metadata": true
  }
}
```

**Step 3**: After fixing, record the solution
```json
{
  "name": "update_mindmap", 
  "arguments": {
    "task_description": "Fixed database connection timeout",
    "outcome": "success",
    "solution_details": {
      "approach": "Increased connection pool size",
      "effectiveness": 0.95
    }
  }
}
```

**Result**: Next time anyone faces database timeouts, the mind map will immediately suggest the connection pool as a likely culprit.

### Scenario 3: Adding New Feature

**Step 1**: Get exploration suggestions
```json
{
  "name": "suggest_exploration",
  "arguments": {
    "task_description": "add email notification system"
  }
}
```

**Step 2**: Query for existing patterns
```json
{
  "name": "query_mindmap",
  "arguments": {
    "query": "email notification template",
    "type": "pattern"
  }
}
```

**Step 3**: Record patterns discovered during implementation
```json
{
  "name": "update_mindmap",
  "arguments": {
    "task_description": "Added email notification system", 
    "outcome": "success",
    "patterns_discovered": [{
      "pattern_type": "email_template",
      "description": "HTML email templates in /templates/email/",
      "confidence": 0.8
    }]
  }
}
```

**Result**: Future email-related tasks will immediately know about the template structure and location.

## Advanced Queries

### Finding Files by Framework
```json
{
  "name": "query_mindmap",
  "arguments": {
    "query": "react",
    "include_metadata": true
  }
}
```

### Files Modified Recently
The mind map tracks file modification times and recent activity, boosting recently active files in search results.

### Cross-Reference Patterns
```json
{
  "name": "query_mindmap",
  "arguments": {
    "query": "database model user",
    "type": "file"
  }
}
```

Finds files that likely contain user database models, even if they're named something like `person.ts` or `account.ts`.

## Benefits Over Time

As you use Claude Code with the Mind Map MCP:

1. **Faster Discovery**: Find relevant files in seconds instead of minutes
2. **Learning Accumulation**: Each session builds on the last
3. **Error Prevention**: Avoid repeating past mistakes  
4. **Pattern Recognition**: Automatically identify project conventions
5. **Context Retention**: Pick up where you left off across sessions

The longer you use it, the smarter it becomes at understanding your specific codebase and development patterns.