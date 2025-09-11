#!/bin/bash

echo "🧠 Mind Map MCP Server Setup for Claude Code"
echo "============================================"
echo ""

PROJECT_DIR="/data/data/com.termux/files/home/projects/mind-map"
CONFIG_LOCATIONS=(
    "$HOME/.claude/mcp_config.json"
    "$HOME/.claude/mcp/config.json"
    "$HOME/.config/claude/mcp_config.json"
    "$HOME/.claude/plugins/mcp_config.json"
)

echo "📍 Project directory: $PROJECT_DIR"
echo ""

# Check if the server is built
if [ ! -f "$PROJECT_DIR/dist/index.js" ]; then
    echo "⚠️  Server not built. Building now..."
    cd "$PROJECT_DIR"
    npm run build
    if [ $? -ne 0 ]; then
        echo "❌ Build failed. Please fix build errors first."
        exit 1
    fi
    echo "✅ Build successful!"
else
    echo "✅ Server is built"
fi

echo ""
echo "📝 Creating MCP configuration files..."

# Create configuration content
CONFIG_CONTENT='{
  "mcpServers": {
    "mind-map-mcp": {
      "command": "node",
      "args": ["'$PROJECT_DIR'/dist/index.js"],
      "env": {}
    }
  }
}'

# Try to create config in multiple locations
for CONFIG_PATH in "${CONFIG_LOCATIONS[@]}"; do
    CONFIG_DIR=$(dirname "$CONFIG_PATH")
    if [ ! -d "$CONFIG_DIR" ]; then
        echo "  Creating directory: $CONFIG_DIR"
        mkdir -p "$CONFIG_DIR"
    fi
    echo "$CONFIG_CONTENT" > "$CONFIG_PATH"
    echo "  ✅ Created: $CONFIG_PATH"
done

echo ""
echo "🧪 Testing MCP server..."
cd "$PROJECT_DIR"
timeout 5 node dist/index.js < /dev/null > /dev/null 2>&1
if [ $? -eq 124 ]; then
    echo "✅ Server starts correctly (timed out as expected for stdio server)"
else
    echo "⚠️  Server may have issues. Check manually with: node dist/index.js"
fi

echo ""
echo "📋 Configuration Summary:"
echo "========================="
echo ""
echo "The Mind Map MCP server has been configured in multiple locations."
echo "Claude Code should now be able to discover and use it."
echo ""
echo "To verify in Claude Code, try:"
echo "1. Restart Claude Code if it's running"
echo "2. Run: /mcp"
echo "3. You should see 'mind-map-mcp' in the list of available servers"
echo ""
echo "If it doesn't appear, you may need to:"
echo "1. Check Claude Code's MCP documentation for your platform"
echo "2. Manually specify the config location in Claude Code settings"
echo ""
echo "Manual test command:"
echo "  node $PROJECT_DIR/test-server.js"
echo ""
echo "🎉 Setup complete!"