const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);

const Mutations = {
  async signup(parent, args, ctx, info) {
    const { email, name } = args;
    // Create Stripe Customer object.
    const customer = await stripe.customers.create({
      description: `Customer for ${name}`,
      email,
      source: `tok_visa` // For demo purposes we're attaching a test card to the customer.
    });

    // Create the user in the database.
    const user = await ctx.db.mutation.createUser(
      {
        data: {
          name,
          email,
          customer: {
            create: {
              stripe_id: customer.id
            }
          }
        }
      },
      info
    );
    return user;
  },
  async becomeSeller(parent, args, ctx, info) {
    const { user_id, country, business_name } = args;
    // Retrieve user email
    const { email, seller } = await ctx.db.query.user(
      { where: { id: user_id } },
      `{ email seller{id} }`
    );
    // Check if user already is a seller.
    if (seller) {
      throw new Error(`This user already is a seller.`);
    }

    // Create Stripe Account object.
    const account = await stripe.accounts.create({
      type: "custom",
      country,
      email,
      business_name
    });

    // Create Seller record while updating the user in the database.
    const user = await ctx.db.mutation.updateUser(
      {
        where: { email },
        data: {
          email,
          seller: {
            create: {
              stripe_id: account.id,
              country,
              business_name,
              charges_enabled: account.charges_enabled,
              payouts_enabled: account.payouts_enabled,
              default_payout_currency: account.default_currency,
              verification_status: account.legal_entity.verification.status.toUpperCase()
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
