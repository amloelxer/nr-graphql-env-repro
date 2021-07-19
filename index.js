require('dotenv').config();

// New relic
const newrelic = require('newrelic');
const nrGraphQLPlugin = require('@newrelic/apollo-server-plugin');

// Express imports
const { createServer } = require('http');
const express = require('express');
const cookieParser = require('cookie-parser');
const bodyParser = require('body-parser');
const helmet = require('helmet');
const useragent = require('express-useragent');

// GraphQL imports
const { ApolloServer, gql } = require('apollo-server-express');
const { makeExecutableSchema } = require('graphql-tools');
const { SubscriptionServer } = require('subscriptions-transport-ws');
const { execute, subscribe } = require('graphql');

const throng = require('throng');
const numberOfWorkers = process.env.WEB_CONCURRENCY || 1;

const makeGQLSchema = () => {
  const resolvers = {
    Query: {
      mockQuery: () => {
        return "Hello World"
      },
    },
  }
  const queries = gql`
    type Query {
      "Get user details"
      mockQuery: String
    }
  `;

  return makeExecutableSchema({
    typeDefs: [
      queries,
    ],
    resolvers: [
      resolvers,
    ],
  });
}

const startProcess = async () => {
  // Set up Express
  const app = express();
  app.use(cookieParser());

  app.use(helmet());
  app.use(helmet.referrerPolicy({ policy: 'same-origin' }));
  app.use(bodyParser.json({ limit: '10mb' }));
  app.use(
    bodyParser.urlencoded({
      limit: '10mb',
      extended: false,
    }),
  );

  app.use(useragent.express());

  // we server our static files at "/"
  //app.use('/', ServeSiteRoutes);

  // Catchall for React HTML
  // app.get('*', serveReact);

  const apolloServer = new ApolloServer({
    schema: makeGQLSchema(),
    engine: {
      apiKey: process.env.APOLLO_KEY,
      graphVariant: process.env.APOLLO_GRAPH_VARIANT || 'current',
    },
    plugins: [nrGraphQLPlugin],
    context: async ({ req, res }) => {
        // we enrich our context here
        return null 
    },
  });

  apolloServer.applyMiddleware({ app, path: '/graphql' });
  const server = createServer(app);

  // Setup graphql subscriptions
  SubscriptionServer.create(
    {
      schema: makeGQLSchema(),
      execute,
      subscribe,
      keepAlive: 10 * 1000,
      onConnect: (connectionParams, webSocket, context) => {
        // do basic auth for subscription server here
      },
    },
    {
      server: server,
      path: '/subscriptions',
    },
  );

  const portNumber = 3001
  server.listen(portNumber, () => {
    console.log(`server running at at port: ${portNumber}`)
  });
}

// we use throng to cluster our node.js processes (), which is just a wrapper around the Node Cluster API
throng({
    worker: startProcess,
    liftime: Infinity,
    workers: numberOfWorkers,
});