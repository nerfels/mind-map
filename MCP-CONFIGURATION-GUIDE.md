# 🔧 MCP Cross-Project Configuration Guide

## Current Configuration

The current `.mcp.json` configuration is set up for the main mind-map project:

```json
{
  "mcpServers": {
    "mind-map-mcp": {
      "command": "node",
      "args": ["/data/data/com.termux/files/home/projects/mind-map/dist/index.js"],
      "env": {}
    }
  }
}
```

## 🎯 Configuration Options for Cross-Project Usage

### Option 1: Global MCP Server (Recommended)
Keep the current configuration and use parameters/environment variables to specify projects:

**Advantages:**
- One MCP server handles all projects
- Can switch between projects dynamically
- Uses `project_root` parameter or `MCP_PROJECT_ROOT` environment variable

**Usage:**
```javascript
// Explicit project specification
mcp__mind_map_mcp__scan_project({
  project_root: "/path/to/your/project",
  force_rescan: true
})

// Or set environment variable before starting Claude Code
export MCP_PROJECT_ROOT="/path/to/your/project"
```

### Option 2: Project-Specific Configuration
Create separate MCP configurations for different projects:

```json
{
  "mcpServers": {
    "mind-map-main": {
      "command": "node",
      "args": ["/data/data/com.termux/files/home/projects/mind-map/dist/index.js"],
      "env": {
        "MCP_PROJECT_ROOT": "/data/data/com.termux/files/home/projects/mind-map"
      }
    },
    "mind-map-demo": {
      "command": "node",
      "args": ["/data/data/com.termux/files/home/projects/mind-map/dist/index.js"],
      "env": {
        "MCP_PROJECT_ROOT": "/data/data/com.termux/files/home/projects/mind-map/demo-project"
      }
    }
  }
}
```

### Option 3: Working Directory Configuration
Set the working directory for the MCP server:

```json
{
  "mcpServers": {
    "mind-map-mcp": {
      "command": "node",
      "args": ["/data/data/com.termux/files/home/projects/mind-map/dist/index.js"],
      "cwd": "/path/to/target/project",
      "env": {}
    }
  }
}
```

## 🚀 Recommended Setup for Different Use Cases

### For Main Mind-Map Development
```json
{
  "mcpServers": {
    "mind-map-mcp": {
      "command": "node",
      "args": ["/data/data/com.termux/files/home/projects/mind-map/dist/index.js"],
      "env": {}
    }
  }
}
```

### For Demo Project Testing
```json
{
  "mcpServers": {
    "mind-map-mcp": {
      "command": "node",
      "args": ["/data/data/com.termux/files/home/projects/mind-map/dist/index.js"],
      "env": {
        "MCP_PROJECT_ROOT": "/data/data/com.termux/files/home/projects/mind-map/demo-project"
      }
    }
  }
}
```

### For Any Other Project
```json
{
  "mcpServers": {
    "mind-map-mcp": {
      "command": "node",
      "args": ["/data/data/com.termux/files/home/projects/mind-map/dist/index.js"],
      "env": {
        "MCP_PROJECT_ROOT": "/path/to/your/project"
      }
    }
  }
}
```

## 🔄 Dynamic Project Switching

### Method 1: Environment Variable (System Level)
```bash
# Set before starting Claude Code
export MCP_PROJECT_ROOT="/path/to/your/project"
claude-code

# Or for Windows
set MCP_PROJECT_ROOT=C:\path\to\your\project
claude-code
```

### Method 2: Explicit Parameter (Call Level)
```javascript
// Always specify project_root in calls
mcp__mind_map_mcp__scan_project({
  project_root: "/path/to/your/project",
  force_rescan: true
})

mcp__mind_map_mcp__query_mindmap({
  query: "your search",
  project_root: "/path/to/your/project"
})
```

### Method 3: Multiple MCP Servers
```json
{
  "mcpServers": {
    "mindmap-project-a": {
      "command": "node",
      "args": ["/path/to/mind-map/dist/index.js"],
      "env": { "MCP_PROJECT_ROOT": "/path/to/project-a" }
    },
    "mindmap-project-b": {
      "command": "node",
      "args": ["/path/to/mind-map/dist/index.js"],
      "env": { "MCP_PROJECT_ROOT": "/path/to/project-b" }
    }
  }
}
```

## 📁 Project Structure Results

Each configuration approach creates the following structure:

```
your-project/
├── .mindmap-cache/
│   ├── mindmap.json     # Project-specific mind map data
│   └── mcp.log          # Project-specific logs
├── src/
├── package.json
└── ...project files
```

## ⚙️ Configuration Priority Order

The MCP uses this priority order for determining the project root:

1. **Explicit `project_root` parameter** (highest priority)
2. **`MCP_PROJECT_ROOT` environment variable**
3. **Current working directory of MCP server process**
4. **Server's default project root** (lowest priority)

## 🎯 Recommendation

**For most users**: Use Option 1 (Global MCP Server) with environment variables or explicit parameters. This provides the most flexibility without requiring multiple MCP server instances.

**For dedicated project work**: Use Option 2 (Project-Specific Configuration) when you're working primarily on one specific project for extended periods.

## 🔧 How to Apply Configuration Changes

1. **Edit the `.mcp.json` file** in your Claude Code configuration directory
2. **Restart Claude Code** to apply the new configuration
3. **Test the MCP** with your target project

The MCP will now correctly scan and cache files in the specified project directory!