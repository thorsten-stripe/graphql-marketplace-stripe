const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);

const Mutations = {
  async signup(parent, args, ctx, info) {
    const { email, name } = args;
    // Create Stripe Customer object.
    const customer = await stripe.customers.create({
      description: `Customer for ${name}`,
      email
    });

    // Create Stripe Account object.
    const account = await stripe.accounts.create({
      type: "custom",
      email
    });

    // Create the user in the database.
    const user = await ctx.db.mutation.createUser(
      {
        data: {
          name,
          email,
          customer: {
            create: {
              email,
              stripeId: customer.id
            }
          },
          account: {
            create: {
              email,
              stripeAccountId: account.id
            }
          }
        }
      },
      info
    );
    return user;
  }
};

module.exports = Mutations;
