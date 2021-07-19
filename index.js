

require('dotenv').config();

const express = require('express');
const cookieParser = require('cookie-parser');
const bodyParser = require('body-parser');
const helmet = require('helmet');

const useragent = require('express-useragent');
const throng = require('throng');
const nrGraphQLPlugin = require('@newrelic/apollo-server-plugin');
const { ApolloServer, gql } = require('apollo-server-express');
const { makeExecutableSchema } = require('graphql-tools');
const newrelic = require('newrelic');

const numberOfWorkers = process.env.WEB_CONCURRENCY || 1;
// import httpsRedirect from 'express-https-redirect';
// import session from 'express-session';

const makeGQLSchema = () => {
  const resolvers = {
    Query: {
      mockQuery: () => {},
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

    // use for handling sessions
//   app.set('trust proxy', 1);
//   const sessionHandler = session(sess);
//   app.use(sessionHandler);

  // we server our static files at / 
  //app.use('/', ServeSiteRoutes);

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

  // Catchall for React HTML
  // app.get('*', serveReact);


  console.log(`Hello world`)
}

// we use throng to cluster our node.js processes (), which is just a wrapper our the Node Cluster API
throng({
    worker: startProcess,
    liftime: Infinity,
    workers: numberOfWorkers,
});