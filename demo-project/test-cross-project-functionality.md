# 🧪 Cross-Project MCP Functionality Test

## Current Status

**Problem Identified**: MCP server process runs in its own working directory context, so `process.cwd()` doesn't reflect where Claude Code commands are executed from.

**Code Status**: ✅ All implementation is complete and compiled
- Environment variable support (`MCP_PROJECT_ROOT`)
- Explicit project_root parameter support
- Cross-project scanning method (`scanProjectWithRoot`)
- Enhanced debug logging

## Testing Approach

### Option 1: Test with Explicit project_root Parameter
```javascript
mcp__mind_map_mcp__scan_project({
  force_rescan: true,
  project_root: "/data/data/com.termux/files/home/projects/mind-map/demo-project"
})
```
**Expected Result**: Should scan 13 files (demo project) instead of 155 files (main project)

### Option 2: Test with Environment Variable (Temporary)
Temporarily modify .mcp.json for testing:
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
Then restart Claude Code and test normal scan_project calls.

## What Should Happen When Working

### Before Fix:
- Always scans main project: 155 files
- Cache always created in: `mind-map/.mindmap-cache/`
- No cross-project support

### After Fix (when MCP server uses updated code):
- Scans specified project: 13 files for demo project
- Cache created in: `demo-project/.mindmap-cache/`
- Debug logs show: 🎯📁🖥️🌍 messages
- Query results only show demo project files

## Debug Information Expected

When the fix works, you should see in the MCP logs:
```
🎯 Target project root: /path/to/demo-project
📁 Current working directory: /path/to/current/dir
🖥️  Server project root: /path/to/mind-map
🌍 MCP_PROJECT_ROOT env var: /path/to/demo-project (or 'not set')
🔄 Using scanProjectWithRoot for different directory
```

## Current Test Results

- **Files in demo project**: 13
- **Files MCP is scanning**: 155 (wrong - main project)
- **Debug messages appearing**: No (server not using updated code)
- **Environment variable test**: Would require MCP server restart

## Conclusion

The implementation is complete but requires the MCP server process to restart to use the updated compiled code. This is a limitation of how Claude Code manages MCP server processes - they don't automatically reload when code changes.

The fix will work when:
1. Claude Code session is restarted, OR
2. MCP server process is restarted, OR
3. Explicit project_root parameters are used (once server uses updated code)