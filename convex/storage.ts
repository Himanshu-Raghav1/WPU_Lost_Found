import { mutation } from "./_generated/server";
import { auth } from "./auth.js";

export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }
    // Return an upload URL for files
    return await ctx.storage.generateUploadUrl();
  },
});
