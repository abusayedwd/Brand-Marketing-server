// ===== PAYMENT CONTROLLER (payment.controller.js) =====
const stripe = require("stripe")(process.env.STRIPE_PRIVATE_KEY);
const httpStatus = require("http-status");
const { User } = require("../models");
const PlanSubscription = require("../models/payment.model");
const cron = require("node-cron");
const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;
const { STRIPE_PROJECT, FRONTEND_URL, getStripeRawBody } = require("../utils/stripeHelpers");
const { fulfillSubscriptionPayment } = require("../services/subscriptionPayment.service");

const stripeSessionRetrieveOptions = { expand: ['payment_intent'] };

const catchAsync = require("../utils/catchAsync");
const { subscriptionService } = require("../services");
const pick = require("../utils/pick");
const response = require("../config/response");
const ApiError = require("../utils/ApiError");
const { default: mongoose } = require("mongoose");

const createPlanPayment = catchAsync(async (req, res) => {
  const { planName, price, duration } = req.body;
  console.log(req.body, "Request body for plan payment");
  // console.log(req?.user?.id)
  const userId = req?.user?.id; // Get user ID from authenticated request

  // Validate required fields
  if (!userId || !planName || !price || !duration) {
    return res.status(400).json({ message: "Missing required fields." });
  }
  
  
  // Set the items for the selected plan
  const items = [
    {
      name: planName,
      quantity: 1,
    },
  ];

  // Convert price to cents
  const amount = Math.round(price * 100); // Stripe expects price in cents

  // Create the Stripe Checkout session for the selected plan
  const session = await stripe.checkout.sessions.create({
   payment_method_types: ["card"],
line_items: items.map((item) => ({
  price_data: {
    currency: "eur",  // Change currency to EUR
    product_data: {
      name: item.name,
    },
    unit_amount: amount,  // Ensure this is in the smallest currency unit (cents)
  },
  quantity: item.quantity,
})),
    mode: "payment",
    success_url: `${FRONTEND_URL}/pricing?payment=success&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${FRONTEND_URL}/pricing?payment=cancelled`,
    customer_email: req?.user?.email,
    metadata: {
      userId: userId.toString(),
      planName,
      planPrice: amount.toString(),
      duration: duration.toString(),
      project: STRIPE_PROJECT,
    },
  });

  // Create the new plan subscription record
  const newPlanSubscription = await PlanSubscription.create({
    userId,
    planName,
    currency: "eur",
    price,
    duration,
    status: "pending",
    stripeSessionId: session.id,
    transactionId: session.payment_intent,
  });

  // Send response with session URL
  res.status(httpStatus.CREATED).json(
     {
    status: "success",
    statusCode: httpStatus.CREATED,
    message: "Plan payment session created successfully.",
    sessionId: session.id,
    url: session.url, 
    data : newPlanSubscription,
  })
 
});
 
 
// const stripeWebhook = async (req, res) => {
//   console.log("Webhook endpoint hit!");

//   const sig = req.headers["stripe-signature"];
//   let event;

//   try {
//     if (!endpointSecret) {
//       console.error("Stripe webhook secret not configured.");
//       return res.status(400).json({ error: "Webhook secret not configured" });
//     }

//     event = stripe.webhooks.constructEvent(req.rawBody, sig, endpointSecret);
//     console.log("Webhook verified.");

//     const data = event.data.object;
//     const eventType = event.type;
//     console.log(`Received event type: ${eventType}`);

//     // Process checkout.session.completed event
//     if (eventType === "checkout.session.completed") {
//       const session = data;
//       console.log("Payment successfully completed. Session details:", session);

//       // Check if the event is for the correct project
//       if (session.metadata && session.metadata.project !== "your-project-name") {
//         console.log("Event not for this project, ignoring...");
//         return res.status(200).json({ received: true, ignored: true });
//       }

//       const { userId, planName, duration } = session.metadata;

//       // Validate userId and planName
//       if (!userId || !planName) {
//         console.error("Missing required metadata in session:", session.metadata);
//         return res.status(400).json({ error: "Missing metadata" });
//       }

//       // Check if the userId is valid
//       const mongoose = require("mongoose");
//       if (!mongoose.Types.ObjectId.isValid(userId)) {
//         console.error("Invalid userId in metadata:", userId);
//         return res.status(400).json({ error: "Invalid userId" });
//       }

//       // Calculate expiration date (2 minutes from now)
//       const expirationDate = new Date();
//       expirationDate.setMinutes(expirationDate.getMinutes() + 2); // Add 2 minutes

//       // Create subscription record
//       const updatedSubscription = await PlanSubscription.findOneAndUpdate(
//         { stripeSessionId: session.id }, // Find the plan subscription by the session ID
//         {
//          userId,
//         planName,
//         price: session.amount_total / 100, // Assuming amount is in cents
//         duration,
//         status: "active",
//         stripeSessionId: session.id,
//         transactionId: session.payment_intent,
//         expirationDate,
//         },
//         { new: true } // Return the updated record
//       );
//       if (!updatedSubscription) {
//         console.error("Failed to create or update subscription for session ID:", session.id);
//         return res.status(500).json({ error: "Failed to create or update subscription" });
//       }

//       console.log("New subscription updated:", updatedSubscription);

//       // Update the user with the subscription reference
//       const updatedUser = await User.findByIdAndUpdate(
//         userId,
//         {
//           isSubscribe: true,
//           planName,
//           subscriptionDate: new Date(),
//           subscriptionId: updatedSubscription._id, // Add reference to subscription
//         },
//         { new: true }
//       );

//       if (!updatedUser) {
//         console.error("User not found for ID:", userId);
//         return res.status(404).json({ error: "User not found" });
//       } else {
//         console.log("User subscription status updated:", updatedUser);
//       }

//       // Set a timeout to deactivate subscription after 2 minutes
//       setTimeout(async () => {
//         // Deactivate subscription
//         const statusUpdatedSubscription = await PlanSubscription.findByIdAndUpdate(
//           updatedSubscription._id,
//           {
//             status: "inactive",
//           },
//           { new: true }
//         );

//         // Deactivate user subscription
//         await User.findByIdAndUpdate(
//           userId,
//           {
//             isSubscribe: false,
//             subscriptionId: null, // Optionally clear the subscription reference
//           },
//           { new: true }
//         );

//         console.log("Subscription deactivated after 2 minutes:", statusUpdatedSubscription);
//       }, 2 * 60 * 1000); // 2 minutes in milliseconds

//       // Respond to acknowledge receipt of the event
//       res.status(200).json({ received: true, eventType });
//     }

//     // Handle other events like payment_intent.payment_failed if necessary
//     else if (eventType === "payment_intent.payment_failed") {
//       console.log("Payment failed:", data.id);
//       // Handle failed payment logic here
//       res.status(200).json({ received: true, eventType });
//     }

//   } catch (error) {
//     console.error("Error processing webhook event:", error);
//     // Always respond with 200 to prevent Stripe from retrying
//     res.status(200).json({ error: "Internal server error", received: true });
//   }
// };


const stripeWebhook = async (req, res) => {
  console.log("Subscription webhook endpoint hit!");

  const sig = req.headers["stripe-signature"];
  let event;

  try {
    if (!endpointSecret) {
      console.error("Stripe webhook secret not configured.");
      return res.status(400).json({ error: "Webhook secret not configured" });
    }

    event = stripe.webhooks.constructEvent(getStripeRawBody(req), sig, endpointSecret);
    console.log("Webhook verified.");

    const data = event.data.object;
    const eventType = event.type;
    console.log(`Received event type: ${eventType}`);

    if (eventType === "checkout.session.completed") {
      const session = data;
      console.log("Subscription payment completed. Session:", session.id);

      const result = await fulfillSubscriptionPayment(session);
      console.log("Subscription fulfillment result:", result);
      return res.status(200).json({ received: true, eventType, ...result });
    }

    if (eventType === "payment_intent.payment_failed") {
      console.log("Payment failed:", data.id);
      return res.status(200).json({ received: true, eventType });
    }

    return res.status(200).json({ received: true, ignored: true, eventType });
  } catch (error) {
    console.error("Error processing webhook event:", error);
    return res.status(400).json({ error: error.message });
  }
};

const verifySubscriptionPayment = catchAsync(async (req, res) => {
  const { sessionId } = req.body;

  if (!sessionId) {
    throw new ApiError(httpStatus.BAD_REQUEST, "Session ID is required");
  }

  const session = await stripe.checkout.sessions.retrieve(sessionId, stripeSessionRetrieveOptions);

  if (String(session.metadata?.userId) !== String(req.user.id)) {
    throw new ApiError(httpStatus.FORBIDDEN, "Not authorized for this payment session");
  }

  const result = await fulfillSubscriptionPayment(session);

  res.status(httpStatus.OK).json(
    response({
      message: result.ignored
        ? "Payment not completed yet"
        : "Subscription activated successfully",
      status: "OK",
      statusCode: httpStatus.OK,
      data: result,
    })
  );
});



// Periodic task to deactivate subscriptions based on expiration date
cron.schedule('0 0 1 * *', async () => { // Runs on the 1st day of every month at midnight
  // cron.schedule('* * * * *', async () => { // Runs every minute
  console.log('Checking for expired subscriptions...');

  const expiredSubscriptions = await PlanSubscription.find({
    status: 'active',
    expirationDate: { $lt: new Date() }, // Find subscriptions that are past expiration date
  });

  for (let subscription of expiredSubscriptions) {
    // Deactivate subscription
    await PlanSubscription.findByIdAndUpdate(subscription._id, {
      status: 'inactive',
    });

    // Deactivate user subscription
    await User.findByIdAndUpdate(subscription.userId, {
      isSubscribe: false,
      
    });

    console.log(`Subscription deactivated after expiration for user ${subscription.userId}`);
  }
});

 


const getMySubscriptions = catchAsync(async (req, res) => {
  const userId = req?.user?.id; // Get user ID from authenticated request
  console.log(userId, "User ID from request");

  // Validate user ID
  if (!userId) {
    return res.status(400).json({ message: "User ID is required." });
  }

  // Fetch all subscriptions for the user
  const subscriptions = await PlanSubscription.find({ userId });

  // If no subscriptions are found
  if (!subscriptions || subscriptions.length === 0) {
    throw new ApiError(httpStatus.NOT_FOUND, "No subscriptions found for this user");
  }

  res.status(httpStatus.OK).json(
    response({
      message: '',
      status: 'OK',
      statusCode: httpStatus.OK,
      data: subscriptions, // Return the list of subscriptions
    })
  );
});




const getSubscriptionById = catchAsync(async (req, res) => {
  const { id } = req.params; 
console.log(id, "Subscription ID from request parameters");
  // Validate the subscription ID
  if (!id) {
    return res.status(httpStatus.BAD_REQUEST).json({ message: "Subscription ID is required." });
  }

  // Fetch the subscription details by ID
  const subscription = await PlanSubscription.findById(id);
console.log(subscription, "Subscription details fetched by ID");
 
  if (!subscription) {
    throw new ApiError(httpStatus.NOT_FOUND, "Subscription not found");
  }

  // Return the found subscription as response
  res.status(httpStatus.OK).json(
    response({
      message: 'Successfully fetched subscription details',
      status: 'OK',
      statusCode: httpStatus.OK,
      data: subscription,
    })
  );
});


const getAllSubscriptions = catchAsync(async (req, res) => {
  
  const filter = pick(req.query, ['planName', 'status', 'price']); 
 
  const options = pick(req.query, ['sortBy', 'limit', 'page']);

  // Call the service to get subscriptions with filter and options
  const subscriptions = await subscriptionService.getAllSubscriptionsService(filter, options);

  if (!subscriptions || subscriptions?.length === 0) { 
    throw new ApiError(httpStatus.NOT_FOUND, "No subscriptions found.");
  }

   res.status(httpStatus.OK).json(
    response({
      message: 'All Subscriptions',
      status: 'OK',
      statusCode: httpStatus.OK,
      data: subscriptions,
    })
  ); 

});

 
 




module.exports = {
  createPlanPayment,
  stripeWebhook,
  verifySubscriptionPayment,
  getAllSubscriptions,
  getMySubscriptions,
  getSubscriptionById
};