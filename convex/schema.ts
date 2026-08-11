import { defineSchema, defineTable } from "convex/server";
import { authTables } from "@convex-dev/auth/server";
import { v } from "convex/values";

export default defineSchema({
  ...authTables,
  users: defineTable({
    name: v.optional(v.string()),
    image: v.optional(v.string()),
    email: v.optional(v.string()),
    emailVerificationTime: v.optional(v.number()),
    phone: v.optional(v.string()),
    phoneVerificationTime: v.optional(v.number()),
    isAnonymous: v.optional(v.boolean()),
    prn: v.optional(v.string()), // Added for WPU Lost & Found
  }).index("email", ["email"]),

  items: defineTable({
    title: v.string(),
    description: v.string(),
    category: v.string(), // e.g. electronics, clothing, id-cards
    type: v.string(), // "lost" or "found"
    location: v.string(),
    date: v.string(),
    imageId: v.optional(v.id("_storage")),
    reporterId: v.id("users"),
    status: v.string(), // "active" or "resolved"
  }),
});
