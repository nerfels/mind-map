
import React from 'react';
import express from 'express';

const app = express();

function HomePage() {
  return <h1>Hello World</h1>;
}

app.get('/', (req, res) => {
  res.send('API Server');
});

export { HomePage, app };
      