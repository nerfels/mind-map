const express = require('express');
const _ = require('lodash');

class DemoApp {
  constructor() {
    this.app = express();
    this.port = 3000;
    this.setupRoutes();
  }

  setupRoutes() {
    this.app.get('/', (req, res) => {
      res.json({ message: 'Hello from Demo Project!' });
    });

    this.app.get('/users', (req, res) => {
      const users = this.getUsers();
      res.json(users);
    });
  }

  getUsers() {
    const users = [
      { id: 1, name: 'John Doe', email: 'john@example.com' },
      { id: 2, name: 'Jane Smith', email: 'jane@example.com' }
    ];
    return _.orderBy(users, ['name']);
  }

  start() {
    this.app.listen(this.port, () => {
      console.log(`Demo app listening on port ${this.port}`);
    });
  }
}

module.exports = DemoApp;

if (require.main === module) {
  const app = new DemoApp();
  app.start();
}