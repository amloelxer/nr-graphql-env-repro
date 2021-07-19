const numberOfWorkers = process.env.WEB_CONCURRENCY || 1;

import express from 'express';
import cookieParser from 'cookie-parser';
// import path from 'path';
import bodyParser from 'body-parser';
import helmet from 'helmet';
import useragent from 'express-useragent';
import throng from 'throng';
import nrGraphQLPlugin from '@newrelic/apollo-server-plugin';
// import httpsRedirect from 'express-https-redirect';
// import session from 'express-session';

// we use throng to cluster our node.js processes (), which is just a wrapper our the Node Cluster API

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
    schema,
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
  app.get('*', serveReact);


  console.log(`Hello world`)
}

throng({
    worker: startProcess,
    liftime: Infinity,
    workers: numberOfWorkers,
});