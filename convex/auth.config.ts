export default {
  providers: [
    {
      // This must match the CONVEX_SITE_URL environment variable
      // that @convex-dev/auth uses as the JWT issuer ("iss" claim).
      domain: process.env.CONVEX_SITE_URL,
      applicationID: "convex",
    },
  ],
};
