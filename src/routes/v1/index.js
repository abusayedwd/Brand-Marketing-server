const express = require("express");
const config = require("../../config/config");
const authRoute = require("./auth.routes");
const userRoute = require("./user.routes");
const docsRoute = require("./docs.routes");
const taskRoute = require("./tasks.routes");
const paymentRorte = require("./payment.route");
const campaignRoute = require("./campaign.route");
const withdrawRoute = require("./withdraw.route");
const dashboardRoute = require("./dashboardStatus.route");
const notificationRoute = require("./notification.route");
const contentRoute = require("./content.route");
const planRoute = require("./plan.route");
const favoriteRoute = require("./favorite.route");
const ratingRoute = require("./rating.route");
const supportRoute = require("./support.route");


const router = express.Router();

const defaultRoutes = [
  {
    path: "/auth",
    route: authRoute,
  },
  {
    path: "/users",
    route: userRoute,
  },
  {
    path: "/tasks",
    route: taskRoute, 
  },
  {
    path: "/payments",
    route: paymentRorte, 
  },
  {
    path: "/campaigns",
    route: campaignRoute, 
  },
  {
    path: "/withdraw",
    route: withdrawRoute, 
  },
  {
    path: "/dashboard",
    route: dashboardRoute, 
  },
  {
    path: "/notifications",
    route: notificationRoute,
  },
  {
    path: "/content",
    route: contentRoute,
  },
  {
    path: "/plans",
    route: planRoute,
  },
  {
    path: "/favorites",
    route: favoriteRoute,
  },
  {
    path: "/ratings",
    route: ratingRoute,
  },
  {
    path: "/support",
    route: supportRoute,
  },
];

const devRoutes = [
  // routes available only in development mode
  {
    path: "/docs",
    route: docsRoute,
  },
];

defaultRoutes.forEach((route) => {
  router.use(route.path, route.route);
});

/* istanbul ignore next */
if (config.env === "development") {
  devRoutes.forEach((route) => {
    router.use(route.path, route.route);
  });
}

module.exports = router;
