const { forwardTo } = require("prisma-binding");
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
  },
  createItem: forwardTo("db"),
  async createTransaction(parent, args, ctx, info) {
    const { buyer, items } = args;
    // Retrieve Items and validate that they have the same currency.
    const item_ids = items.map(item => ({ id: item }));
    const item_objects = await ctx.db.query.items(
      { where: { OR: item_ids } },
      `{ id price currency seller{id seller {commission_percentage stripe_id}} transaction{id} }`
    );
    const same_currency = item_objects.every(
      item => item.currency === item_objects[0].currency
    );
    if (!same_currency) {
      throw new Error(
        `All items must have the same currency to be part of one transaction.`
      );
    }
    // Check if item has already been sold.
    const sold_items = [];
    item_objects.forEach(item => {
      if (item.transaction) {
        sold_items.push(item.id);
      }
    });
    if (sold_items.length) {
      throw new Error(
        `The following items have already been sold: ${sold_items.toString()}.`
      );
    }

    // Check if they are all from the same seller (ONE-TO-ONE) or different sellers (ONE-TO-MANY)
    const one_to_one = item_objects.every(
      item => item.seller.id === item_objects[0].seller.id
    );

    // Define global transaction variables.
    let transaction = { id: "testitest" }; // TODO: delete mock data
    const transaction_amount = item_objects.reduce(
      (total, item) => total + item.price,
      0
    );
    let commission_amount;
    // Retrieve buyer customer details.
    const { email, customer } = await ctx.db.query.user(
      { where: { id: buyer } },
      `{ email customer{stripe_id} }`
    );

    if (one_to_one) {
      // ONE-TO-ONE: Destination Charge
      const seller = item_objects[0].seller.seller;
      commission_amount = Math.round(
        (transaction_amount * seller.commission_percentage) / 100
      );
      const charge = await stripe.charges.create({
        amount: transaction_amount,
        currency: item_objects[0].currency,
        customer: customer.stripe_id,
        description: `Charge for ${email}`,
        destination: {
          account: seller.stripe_id,
          amount: transaction_amount - commission_amount
        },
        metadata: {
          buyer_user_id: buyer,
          seller_user_id: item_objects[0].seller.id,
          commission_amount,
          commission_percentage: seller.commission_percentage
        },
        expand: ["balance_transaction", "transfer"]
      });
      // Persist transaction, transfer, and commission details in database.
      transaction = await ctx.db.mutation.createTransaction(
        {
          data: {
            stripe_id: charge.id,
            items: {
              connect: item_ids
            },
            buyer: { connect: { id: buyer } },
            sellers: {
              connect: [{ id: item_objects[0].seller.id }]
            },
            amount: charge.balance_transaction.amount,
            presentment_currency: charge.currency,
            settlement_currency: charge.balance_transaction.currency,
            exchange_rate: charge.balance_transaction.exchange_rate,
            stripe_fee: charge.balance_transaction.fee,
            net_amount: charge.balance_transaction.net,
            transfers: {
              create: [
                {
                  stripe_id: charge.transfer.id,
                  amount: charge.transfer.amount,
                  currency: charge.transfer.currency,
                  recipient: {
                    connect: { id: item_objects[0].seller.id }
                  }
                }
              ]
            },
            comission: {
              create: {
                amount:
                  charge.balance_transaction.amount - charge.transfer.amount,
                net_amount:
                  charge.balance_transaction.amount -
                  charge.transfer.amount -
                  charge.balance_transaction.fee,
                currency: charge.balance_transaction.currency
              }
            }
          }
        },
        info
      );
    } else {
      // ONE-TO-MANY: Separate charge and multiple transfers
    }

    return transaction;
  }
};

module.exports = Mutations;
