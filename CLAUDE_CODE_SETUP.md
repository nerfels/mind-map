# Setting Up Mind Map MCP in Claude Code

## 🚀 Quick Setup

The Mind Map MCP server has been configured for your Claude Code installation. Here's how to use it:

### 1. Configuration Complete ✅

MCP configurations have been created in these locations:
- `~/.claude/mcp_config.json`
- `~/.claude/mcp/config.json`
- `~/.config/claude/mcp_config.json`
- `~/.claude/plugins/mcp_config.json`

### 2. Verify Installation

In Claude Code, run:
```
/mcp
```

You should see `mind-map-mcp` listed as an available server.

### 3. If Not Visible

Try these steps in order:

1. **Restart Claude Code** to reload configurations
2. **Check MCP status** with `/doctor`
3. **Manual configuration** - You may need to tell Claude Code where to find the config

## 📖 Using Mind Map MCP

Once configured, Claude Code will have access to these intelligent tools:

### Available Commands

#### Initial Project Scan
When starting with a new project:
```
Use the scan_project tool to analyze this codebase
```

#### Query for Files
Find relevant files using natural language:
```
Use query_mindmap to find authentication-related files
Use query_mindmap to search for TypeScript configuration files
```

#### Track Your Work
After completing tasks:
```
Use update_mindmap to record that I fixed the login bug in src/auth/login.ts
```

#### Get Project Context
Understand the project structure:
```
Use get_context to show me a project overview
Use get_context to show recent tasks
```

#### Smart Exploration
Get intelligent suggestions:
```
Use suggest_exploration for where to look to add user registration
```

## 🎯 Example Workflow

### Starting a New Task

1. **Scan the project** (if first time):
   ```
   Please scan this project with scan_project
   ```

2. **Query for relevant files**:
   ```
   Use query_mindmap to find files related to "database models"
   ```

3. **Get exploration suggestions**:
   ```
   Use suggest_exploration for "adding email notifications"
   ```

4. **After completing work**:
   ```
   Use update_mindmap to record successful implementation of email notifications in src/email/
   ```

## 🧠 How It Helps Claude Code

The Mind Map MCP makes Claude Code smarter by:

1. **Remembering Past Work**: Tracks what files were involved in successful tasks
2. **Learning From Errors**: Records error patterns and their solutions
3. **Smart Suggestions**: Provides context-aware file recommendations
4. **Cross-Session Memory**: Maintains knowledge between Claude Code sessions

## 🔧 Troubleshooting

### Server Not Found
If `/mcp` doesn't show the mind-map-mcp server:

1. **Check server is running**:
   ```bash
   node /data/data/com.termux/files/home/projects/mind-map/test-server.js
   ```

2. **Rebuild if needed**:
   ```bash
   cd /data/data/com.termux/files/home/projects/mind-map
   npm run build
   ```

3. **Re-run setup**:
   ```bash
   bash /data/data/com.termux/files/home/projects/mind-map/setup-mcp.sh
   ```

### Manual Testing
Test the MCP server directly:
```bash
node /data/data/com.termux/files/home/projects/mind-map/test-server.js
```

### View Mind Map Data
The mind map data is stored in:
```bash
cat .mindmap-cache/mindmap.json | jq '.'
```

## 📊 Mind Map Statistics

To see what the mind map knows about your project:
```
Use get_stats to show mind map statistics
```

This will show:
- Total files and directories mapped
- Error patterns tracked
- Confidence scores
- Learning statistics

## 🎉 You're Ready!

The Mind Map MCP is now enhancing Claude Code with:
- **Intelligent file discovery**
- **Learning from your interactions**
- **Cross-session project memory**
- **Smart exploration suggestions**

Start using it by asking Claude Code to scan your project or query for specific files!