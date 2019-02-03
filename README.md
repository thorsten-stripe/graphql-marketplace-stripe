# Modelling Marketplaces with GraphQL

Simple GraphQL-Yoga server that exposes a declarative GraphQL API for multi-sided marketplace projects. We use [Stripe Connect](https://stripe.com/connect) for our marketplace payment infrastructure and [Primsa.io](https://www.prisma.io) for our database communication.

## Structure

- `src/schema.graphql` defines the Queries and Mutations that are made available to our client applications.
- `src/resolvers/Queries.js` implements the Queries (get, list, aggregate). This is the logic that retrieves both data from the Stripe API and our Prisma demo database.
- `src/resolvers/Mutations.js` implements the Mutations (create, update, upsert, delete). This is the logic that communicates with the Stripe API for account & payment creation and persist necessary data in our Prisma demo database.
- `datamodel.prisma` the datamodel of our Prisma demo database. This shows you all the data types and relations in our database.

## Setup

- `npm install`
- Follow steps 1-4 here: https://www.prisma.io/docs/1.17/get-started/01-setting-up-prisma-demo-server-a001/
  ** 3.1 select "Demo Server"
  ** 3.2 select region with smallest ping time
  ** 3.3 set your name
  ** 3.4 set stage name `dev`
  \*\* 3.5 select "Don't generate"
- `prisma deploy`
- rename `.env.example` to `.env`
- set the HTTP endpoint returned by `prisma deploy` in your `.env` file
- set a prisma secret in the `.env` file
- set your Stripe secret test key in the `.env` file

## Run

- `npm run dev`
- GraphQL playground now running at [localhost:4000](http://localhost:4000)
