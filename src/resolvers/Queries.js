const { forwardTo } = require("prisma-binding");

const Queries = {
  users: forwardTo("db")
};

module.exports = Queries;
