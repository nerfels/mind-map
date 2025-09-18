#!/usr/bin/env node

// Test file with various API patterns for detection testing

// Express.js REST API
const express = require('express');
const app = express();

app.get('/api/users', (req, res) => {
    res.json({ users: [] });
});

app.post('/api/users', (req, res) => {
    res.json({ created: true });
});

// Flask-like pattern (in comments for reference)
// @app.route('/api/products')
// def get_products():
//     return jsonify(products)

// GraphQL schema
const typeDefs = `
  type Query {
    books: [Book]
  }
  type Book {
    title: String
    author: String
  }
`;

// WebSocket
const WebSocket = require('ws');
const wss = new WebSocket.Server({ port: 8080 });

wss.on('connection', ws => {
    ws.on('message', message => {
        console.log('received:', message);
    });
});

// gRPC service definition (proto-like)
// service Greeter {
//   rpc SayHello (HelloRequest) returns (HelloReply) {}
// }

module.exports = { app, typeDefs, wss };
