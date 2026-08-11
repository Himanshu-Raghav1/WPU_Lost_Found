import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { auth } from "./auth.js";

export const createItem = mutation({
  args: {
    title: v.string(),
    description: v.string(),
    category: v.string(),
    type: v.string(),
    location: v.string(),
    date: v.string(),
    imageId: v.optional(v.id("_storage")),
  },
  handler: async (ctx, args) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    const itemId = await ctx.db.insert("items", {
      title: args.title,
      description: args.description,
      category: args.category,
      type: args.type,
      location: args.location,
      date: args.date,
      imageId: args.imageId,
      reporterId: userId,
      status: "active",
    });

    return itemId;
  },
});

export const getAllItems = query({
  args: {},
  handler: async (ctx) => {
    const items = await ctx.db.query("items").order("desc").collect();
    
    // Attach image URLs and user info
    return Promise.all(
      items.map(async (item) => {
        const imageUrl = item.imageId ? await ctx.storage.getUrl(item.imageId) : null;
        const reporter = await ctx.db.get(item.reporterId);
        
        return {
          ...item,
          imageUrl,
          reporterName: reporter?.name,
          reporterPrn: reporter?.prn,
        };
      })
    );
  },
});

export const resolveItem = mutation({
  args: { itemId: v.id("items") },
  handler: async (ctx, args) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    const item = await ctx.db.get(args.itemId);
    if (!item) {
      throw new Error("Item not found");
    }

    // Allow only the reporter to resolve the item
    if (item.reporterId !== userId) {
      throw new Error("Not authorized to resolve this item");
    }

    await ctx.db.patch(args.itemId, { status: "resolved" });
  },
});
