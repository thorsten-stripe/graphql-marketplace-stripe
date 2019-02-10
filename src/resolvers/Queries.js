const { forwardTo } = require("prisma-binding");

const Queries = {
  users: forwardTo("db"),
  items: forwardTo("db")
};

module.exports = Queries;
