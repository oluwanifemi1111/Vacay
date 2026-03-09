var __defProp = Object.defineProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// server/index.ts
import express from "express";

// server/routes.ts
import { createServer } from "node:http";
import { scryptSync, randomBytes, timingSafeEqual } from "crypto";
import OpenAI2 from "openai";

// shared/schema.ts
var schema_exports = {};
__export(schema_exports, {
  apartments: () => apartments,
  apartmentsRelations: () => apartmentsRelations,
  chatMessages: () => chatMessages,
  chatMessagesRelations: () => chatMessagesRelations,
  insertApartmentSchema: () => insertApartmentSchema,
  insertMessageSchema: () => insertMessageSchema,
  insertNotificationSchema: () => insertNotificationSchema,
  insertRentRequestSchema: () => insertRentRequestSchema,
  insertSavedApartmentSchema: () => insertSavedApartmentSchema,
  insertTransactionSchema: () => insertTransactionSchema,
  insertUserSchema: () => insertUserSchema,
  insertVerificationSchema: () => insertVerificationSchema,
  insertWalletSchema: () => insertWalletSchema,
  messages: () => messages,
  messagesRelations: () => messagesRelations,
  notifications: () => notifications,
  notificationsRelations: () => notificationsRelations,
  otpVerifications: () => otpVerifications,
  rentRequests: () => rentRequests,
  rentRequestsRelations: () => rentRequestsRelations,
  savedApartments: () => savedApartments,
  savedApartmentsRelations: () => savedApartmentsRelations,
  transactions: () => transactions,
  transactionsRelations: () => transactionsRelations,
  users: () => users,
  usersRelations: () => usersRelations,
  verifications: () => verifications,
  verificationsRelations: () => verificationsRelations,
  wallets: () => wallets,
  walletsRelations: () => walletsRelations
});
import { sql, relations } from "drizzle-orm";
import {
  pgTable,
  text,
  varchar,
  integer,
  boolean,
  timestamp,
  json
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
var otpVerifications = pgTable("otp_verifications", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  phone: text("phone").notNull(),
  otp: text("otp").notNull(),
  attempts: integer("attempts").notNull().default(0),
  isVerified: boolean("is_verified").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow(),
  expiresAt: timestamp("expires_at").notNull()
});
var users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: text("email").notNull().unique(),
  username: text("username").notNull().unique(),
  fullName: text("full_name").notNull().default(""),
  phone: text("phone").notNull().unique(),
  password: text("password").notNull(),
  phoneVerified: boolean("phone_verified").notNull().default(false),
  role: text("role").notNull().default("renter"),
  // "renter" | "owner" | "admin"
  isVerified: boolean("is_verified").notNull().default(false),
  verificationStatus: text("verification_status").notNull().default("none"),
  // none | pending | approved | rejected
  createdAt: timestamp("created_at").defaultNow()
});
var usersRelations = relations(users, ({ many, one }) => ({
  apartments: many(apartments),
  savedApartments: many(savedApartments),
  sentMessages: many(messages, { relationName: "sender" }),
  receivedMessages: many(messages, { relationName: "receiver" }),
  rentRequests: many(rentRequests),
  wallet: one(wallets, { fields: [users.id], references: [users.ownerId] }),
  transactions: many(transactions),
  notifications: many(notifications)
}));
var apartments = pgTable("apartments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: text("title").notNull(),
  description: text("description").notNull(),
  price: integer("price").notNull(),
  location: text("location").notNull(),
  bedrooms: integer("bedrooms").notNull(),
  bathrooms: integer("bathrooms").notNull().default(1),
  apartmentType: text("apartment_type").notNull(),
  // studio | 1bed | 2bed | duplex
  amenities: json("amenities").$type().notNull().default([]),
  photos: json("photos").$type().notNull().default([]),
  videos: json("videos").$type().notNull().default([]),
  ownerId: varchar("owner_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  status: text("status").notNull().default("available"),
  // available | rented | pending
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow()
});
var apartmentsRelations = relations(apartments, ({ one, many }) => ({
  owner: one(users, { fields: [apartments.ownerId], references: [users.id] }),
  savedByUsers: many(savedApartments),
  rentRequests: many(rentRequests),
  transactions: many(transactions),
  messages: many(messages)
}));
var savedApartments = pgTable("saved_apartments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  apartmentId: varchar("apartment_id").notNull().references(() => apartments.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").defaultNow()
});
var savedApartmentsRelations = relations(savedApartments, ({ one }) => ({
  user: one(users, { fields: [savedApartments.userId], references: [users.id] }),
  apartment: one(apartments, { fields: [savedApartments.apartmentId], references: [apartments.id] })
}));
var chatMessages = pgTable("chat_messages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  role: text("role").notNull(),
  // "user" | "assistant"
  content: text("content").notNull(),
  createdAt: timestamp("created_at").defaultNow()
});
var chatMessagesRelations = relations(chatMessages, ({ one }) => ({
  user: one(users, { fields: [chatMessages.userId], references: [users.id] })
}));
var messages = pgTable("messages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  senderId: varchar("sender_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  receiverId: varchar("receiver_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  apartmentId: varchar("apartment_id").notNull().references(() => apartments.id, { onDelete: "cascade" }),
  message: text("message").notNull(),
  timestamp: timestamp("timestamp").defaultNow()
});
var messagesRelations = relations(messages, ({ one }) => ({
  sender: one(users, { fields: [messages.senderId], references: [users.id], relationName: "sender" }),
  receiver: one(users, { fields: [messages.receiverId], references: [users.id], relationName: "receiver" }),
  apartment: one(apartments, { fields: [messages.apartmentId], references: [apartments.id] })
}));
var rentRequests = pgTable("rent_requests", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  apartmentId: varchar("apartment_id").notNull().references(() => apartments.id, { onDelete: "cascade" }),
  moveInDate: timestamp("move_in_date").notNull(),
  rentDuration: integer("rent_duration").notNull(),
  // in months
  status: text("status").notNull().default("pending"),
  // pending | approved | rejected
  createdAt: timestamp("created_at").defaultNow()
});
var rentRequestsRelations = relations(rentRequests, ({ one }) => ({
  user: one(users, { fields: [rentRequests.userId], references: [users.id] }),
  apartment: one(apartments, { fields: [rentRequests.apartmentId], references: [apartments.id] })
}));
var transactions = pgTable("transactions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  ownerId: varchar("owner_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  apartmentId: varchar("apartment_id").notNull().references(() => apartments.id, { onDelete: "cascade" }),
  totalAmount: integer("total_amount").notNull(),
  commissionAmount: integer("commission_amount").notNull(),
  ownerPayout: integer("owner_payout").notNull(),
  status: text("status").notNull().default("pending"),
  // pending | completed | failed
  createdAt: timestamp("created_at").defaultNow()
});
var transactionsRelations = relations(transactions, ({ one }) => ({
  user: one(users, { fields: [transactions.userId], references: [users.id] }),
  owner: one(users, { fields: [transactions.ownerId], references: [users.id] }),
  apartment: one(apartments, { fields: [transactions.apartmentId], references: [apartments.id] })
}));
var wallets = pgTable("wallets", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  ownerId: varchar("owner_id").notNull().unique().references(() => users.id, { onDelete: "cascade" }),
  balance: integer("balance").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow()
});
var walletsRelations = relations(wallets, ({ one }) => ({
  owner: one(users, { fields: [wallets.ownerId], references: [users.id] })
}));
var notifications = pgTable("notifications", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  message: text("message").notNull(),
  readStatus: boolean("read_status").notNull().default(false),
  type: text("type").notNull(),
  // "message" | "request" | "payment" | "approval" | "verification"
  createdAt: timestamp("created_at").defaultNow()
});
var notificationsRelations = relations(notifications, ({ one }) => ({
  user: one(users, { fields: [notifications.userId], references: [users.id] })
}));
var verifications = pgTable("verifications", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  ownerId: varchar("owner_id").notNull().unique().references(() => users.id, { onDelete: "cascade" }),
  facePhotoUrl: text("face_photo_url").notNull(),
  idPhotoUrl: text("id_photo_url").notNull(),
  idType: text("id_type").notNull(),
  // "passport" | "license" | "national_id"
  status: text("status").notNull().default("pending"),
  // pending | approved | rejected
  rejectionReason: text("rejection_reason"),
  submittedAt: timestamp("submitted_at").defaultNow(),
  approvedAt: timestamp("approved_at"),
  approvedBy: varchar("approved_by").references(() => users.id, { onDelete: "set null" })
});
var verificationsRelations = relations(verifications, ({ one }) => ({
  owner: one(users, { fields: [verifications.ownerId], references: [users.id] }),
  approver: one(users, { fields: [verifications.approvedBy], references: [users.id] })
}));
var insertUserSchema = createInsertSchema(users).pick({
  email: true,
  username: true,
  fullName: true,
  phone: true,
  password: true,
  role: true
});
var insertApartmentSchema = createInsertSchema(apartments).omit({
  id: true,
  createdAt: true
});
var insertSavedApartmentSchema = createInsertSchema(savedApartments).omit({
  id: true,
  createdAt: true
});
var insertMessageSchema = createInsertSchema(messages).omit({
  id: true,
  timestamp: true
});
var insertRentRequestSchema = createInsertSchema(rentRequests).omit({
  id: true,
  createdAt: true
});
var insertTransactionSchema = createInsertSchema(transactions).omit({
  id: true,
  createdAt: true
});
var insertWalletSchema = createInsertSchema(wallets).omit({
  id: true,
  createdAt: true
});
var insertNotificationSchema = createInsertSchema(notifications).omit({
  id: true,
  createdAt: true
});
var insertVerificationSchema = createInsertSchema(verifications).omit({
  id: true,
  submittedAt: true,
  approvedAt: true
});

// server/db.ts
import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
var { Pool } = pg;
if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?"
  );
}
var pool = new Pool({ connectionString: process.env.DATABASE_URL });
var db = drizzle(pool, { schema: schema_exports });

// server/storage.ts
import { eq, and, or, desc } from "drizzle-orm";
var DatabaseStorage = class {
  async getUser(id) {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }
  async getUserByEmail(email) {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }
  async getUserByUsername(username) {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }
  async createUser(insertUser) {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }
  async deleteUser(id) {
    await db.delete(users).where(eq(users.id, id));
  }
  async sendMessage(senderId, receiverId, apartmentId, message) {
    const [msg] = await db.insert(messages).values({ senderId, receiverId, apartmentId, message }).returning();
    return msg;
  }
  async getConversation(userId, otherUserId, apartmentId) {
    return db.select().from(messages).where(
      and(
        eq(messages.apartmentId, apartmentId),
        or(
          and(eq(messages.senderId, userId), eq(messages.receiverId, otherUserId)),
          and(eq(messages.senderId, otherUserId), eq(messages.receiverId, userId))
        )
      )
    ).orderBy(messages.timestamp);
  }
  async createRentRequest(userId, apartmentId, moveInDate, rentDuration) {
    const [req] = await db.insert(rentRequests).values({ userId, apartmentId, moveInDate, rentDuration }).returning();
    return req;
  }
  async getRentRequests(apartmentId) {
    return db.select().from(rentRequests).where(eq(rentRequests.apartmentId, apartmentId));
  }
  async updateRentRequestStatus(requestId, status) {
    const [req] = await db.update(rentRequests).set({ status }).where(eq(rentRequests.id, requestId)).returning();
    return req;
  }
  async createTransaction(userId, ownerId, apartmentId, totalAmount, commissionRate) {
    const commissionAmount = Math.floor(totalAmount * (commissionRate / 100));
    const ownerPayout = totalAmount - commissionAmount;
    const [tx] = await db.insert(transactions).values({ userId, ownerId, apartmentId, totalAmount, commissionAmount, ownerPayout }).returning();
    return tx;
  }
  async completeTransaction(transactionId) {
    const tx = await db.select().from(transactions).where(eq(transactions.id, transactionId));
    if (tx[0]) {
      await db.update(transactions).set({ status: "completed" }).where(eq(transactions.id, transactionId));
      await this.updateWalletBalance(tx[0].ownerId, tx[0].ownerPayout);
    }
  }
  async getUserTransactions(userId) {
    return db.select().from(transactions).where(eq(transactions.userId, userId)).orderBy(desc(transactions.createdAt));
  }
  async getOrCreateWallet(ownerId) {
    let wallet = await db.select().from(wallets).where(eq(wallets.ownerId, ownerId));
    if (wallet.length === 0) {
      const [newWallet] = await db.insert(wallets).values({ ownerId, balance: 0 }).returning();
      return newWallet;
    }
    return wallet[0];
  }
  async updateWalletBalance(ownerId, amount) {
    const wallet = await this.getOrCreateWallet(ownerId);
    await db.update(wallets).set({ balance: wallet.balance + amount }).where(eq(wallets.ownerId, ownerId));
  }
  async getWalletBalance(ownerId) {
    const wallet = await this.getOrCreateWallet(ownerId);
    return wallet.balance;
  }
  async createNotification(userId, message, type) {
    const [notif] = await db.insert(notifications).values({ userId, message, type }).returning();
    return notif;
  }
  async getUserNotifications(userId) {
    return db.select().from(notifications).where(eq(notifications.userId, userId)).orderBy(desc(notifications.createdAt));
  }
  async markNotificationAsRead(notificationId) {
    await db.update(notifications).set({ readStatus: true }).where(eq(notifications.id, notificationId));
  }
  async submitVerification(ownerId, facePhotoUrl, idPhotoUrl, idType) {
    const [verification] = await db.insert(verifications).values({ ownerId, facePhotoUrl, idPhotoUrl, idType }).returning();
    return verification;
  }
  async getVerification(ownerId) {
    const [verification] = await db.select().from(verifications).where(eq(verifications.ownerId, ownerId));
    return verification;
  }
  async getPendingVerifications() {
    return db.select().from(verifications).where(eq(verifications.status, "pending"));
  }
  async approveVerification(verificationId, approvedBy) {
    const verification = await db.select().from(verifications).where(eq(verifications.id, verificationId));
    if (verification[0]) {
      await db.update(verifications).set({ status: "approved", approvedAt: /* @__PURE__ */ new Date(), approvedBy }).where(eq(verifications.id, verificationId));
      await db.update(users).set({ isVerified: true, verificationStatus: "approved" }).where(eq(users.id, verification[0].ownerId));
    }
  }
  async rejectVerification(verificationId, rejectionReason) {
    const verification = await db.select().from(verifications).where(eq(verifications.id, verificationId));
    if (verification[0]) {
      await db.update(verifications).set({ status: "rejected", rejectionReason }).where(eq(verifications.id, verificationId));
      await db.update(users).set({ verificationStatus: "rejected" }).where(eq(users.id, verification[0].ownerId));
    }
  }
  filterMessageContent(content) {
    const phoneRegex = /(\+?1?\s?)?(\(?\d{3}\)?[\s.-]?)?\d{3}[\s.-]?\d{4}|(\+\d{1,3}[\s.-]?\d{1,14})/g;
    if (phoneRegex.test(content)) return false;
    const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
    if (emailRegex.test(content)) return false;
    const urlRegex = /(https?:\/\/|www\.|@|#|telegram|whatsapp|facebook|instagram|twitter|signal|skype)/gi;
    if (urlRegex.test(content)) return false;
    const paymentAppsRegex = /(paypal|stripe|venmo|square cash|wire transfer|bank transfer)/gi;
    if (paymentAppsRegex.test(content)) return false;
    return true;
  }
  async getApartment(id) {
    const [apt] = await db.select().from(apartments).where(eq(apartments.id, id));
    return apt;
  }
  async getAllApartments() {
    return db.select().from(apartments).where(eq(apartments.isActive, true)).orderBy(desc(apartments.createdAt));
  }
  async getApartmentsByLandlord(landlordId) {
    return db.select().from(apartments).where(eq(apartments.landlordId, landlordId)).orderBy(desc(apartments.createdAt));
  }
  async createApartment(apartment) {
    const [apt] = await db.insert(apartments).values(apartment).returning();
    return apt;
  }
  async updateApartment(id, data) {
    const [apt] = await db.update(apartments).set(data).where(eq(apartments.id, id)).returning();
    return apt;
  }
  async deleteApartment(id) {
    await db.delete(apartments).where(eq(apartments.id, id));
  }
  async getSavedApartmentsByUser(userId) {
    const saved = await db.select({ apartment: apartments }).from(savedApartments).innerJoin(apartments, eq(savedApartments.apartmentId, apartments.id)).where(eq(savedApartments.userId, userId)).orderBy(desc(savedApartments.createdAt));
    return saved.map((s) => s.apartment);
  }
  async saveApartment(userId, apartmentId) {
    const [saved] = await db.insert(savedApartments).values({ userId, apartmentId }).returning();
    return saved;
  }
  async unsaveApartment(userId, apartmentId) {
    await db.delete(savedApartments).where(and(eq(savedApartments.userId, userId), eq(savedApartments.apartmentId, apartmentId)));
  }
  async isApartmentSaved(userId, apartmentId) {
    const [saved] = await db.select().from(savedApartments).where(and(eq(savedApartments.userId, userId), eq(savedApartments.apartmentId, apartmentId)));
    return !!saved;
  }
  async getChatHistory(userId) {
    return db.select().from(chatMessages).where(eq(chatMessages.userId, userId)).orderBy(chatMessages.createdAt);
  }
  async addChatMessage(userId, role, content) {
    const [msg] = await db.insert(chatMessages).values({ userId, role, content }).returning();
    return msg;
  }
  async clearChatHistory(userId) {
    await db.delete(chatMessages).where(eq(chatMessages.userId, userId));
  }
  async deleteUser(id) {
    await db.delete(users).where(eq(users.id, id));
  }
};
var storage = new DatabaseStorage();

// server/replit_integrations/image/client.ts
import OpenAI, { toFile } from "openai";
var openai = new OpenAI({
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL
});

// server/replit_integrations/image/routes.ts
function registerImageRoutes(app2) {
  app2.post("/api/generate-image", async (req, res) => {
    try {
      const { prompt, size = "1024x1024" } = req.body;
      if (!prompt) {
        return res.status(400).json({ error: "Prompt is required" });
      }
      const response = await openai.images.generate({
        model: "gpt-image-1",
        prompt,
        n: 1,
        size
      });
      const imageData = response.data[0];
      res.json({
        url: imageData.url,
        b64_json: imageData.b64_json
      });
    } catch (error) {
      console.error("Error generating image:", error);
      res.status(500).json({ error: "Failed to generate image" });
    }
  });
}

// server/otp.ts
var otpStore = /* @__PURE__ */ new Map();
function generateOTP() {
  return Math.floor(1e5 + Math.random() * 9e5).toString();
}
function createOTP(phone) {
  const otp = generateOTP();
  const now = /* @__PURE__ */ new Date();
  const expiresAt = new Date(now.getTime() + 10 * 6e4);
  const otpData = {
    id: Math.random().toString(36).substring(7),
    phone,
    otp,
    attempts: 0,
    isVerified: false,
    createdAt: now,
    expiresAt
  };
  otpStore.set(phone, otpData);
  console.log(`[OTP SMS TO ${phone}]: Your verification code is ${otp}`);
  return otpData;
}
function verifyOTP(phone, otp) {
  const otpData = otpStore.get(phone);
  if (!otpData) return false;
  if (/* @__PURE__ */ new Date() > otpData.expiresAt) {
    otpStore.delete(phone);
    return false;
  }
  if (otpData.attempts >= 3) return false;
  otpData.attempts++;
  if (otpData.otp === otp) {
    otpData.isVerified = true;
    return true;
  }
  return false;
}
function clearOTP(phone) {
  otpStore.delete(phone);
}

// server/routes.ts
var openai2 = new OpenAI2({
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL
});
function hashPassword(password) {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}
function verifyPassword(password, stored) {
  const [salt, hash] = stored.split(":");
  const hashBuffer = Buffer.from(hash, "hex");
  const suppliedHash = scryptSync(password, salt, 64);
  return timingSafeEqual(hashBuffer, suppliedHash);
}
var tokenStore = /* @__PURE__ */ new Map();
function generateToken() {
  return randomBytes(32).toString("hex");
}
function getTokenFromReq(req) {
  const auth = req.headers.authorization;
  if (auth && auth.startsWith("Bearer ")) return auth.slice(7);
  return null;
}
async function getUserFromReq(req) {
  const token = getTokenFromReq(req);
  if (!token) return null;
  const userId = tokenStore.get(token);
  if (!userId) return null;
  return storage.getUser(userId);
}
var sampleApartments = [
  {
    title: "Modern Loft in Downtown",
    description: "A stunning modern loft in the heart of downtown with floor-to-ceiling windows, exposed brick walls, and premium finishes. Walking distance to restaurants, shopping, and public transit.",
    price: 2400,
    location: "Downtown, New York",
    bedrooms: 1,
    apartmentType: "1bed",
    amenities: ["parking", "gym", "rooftop", "doorman", "laundry"],
    photos: [
      "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800",
      "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800"
    ]
  },
  {
    title: "Cozy Studio Near University",
    description: "Perfect for students and young professionals. A cozy, well-maintained studio with all utilities included. Minutes from campus and public transit.",
    price: 950,
    location: "Brooklyn, New York",
    bedrooms: 0,
    apartmentType: "studio",
    amenities: ["laundry", "furnished", "utilities included"],
    photos: [
      "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800",
      "https://images.unsplash.com/photo-1536376070602-b99659c28e42?w=800"
    ]
  },
  {
    title: "Spacious 2-Bedroom with Park View",
    description: "Enjoy stunning park views from this beautifully renovated 2-bedroom apartment. Features an open-plan kitchen, hardwood floors, and a private balcony.",
    price: 3200,
    location: "Upper West Side, New York",
    bedrooms: 2,
    apartmentType: "2bed",
    amenities: ["parking", "balcony", "gym", "pet-friendly", "doorman"],
    photos: [
      "https://images.unsplash.com/photo-1493809842364-78817add7ffb?w=800",
      "https://images.unsplash.com/photo-1484154218962-a197022b5858?w=800"
    ]
  },
  {
    title: "Luxury Duplex in Tribeca",
    description: "Exceptional duplex with dramatic 20-ft ceilings, private terrace, chef's kitchen, and curated design throughout. A truly one-of-a-kind home in one of NYC's most sought-after neighborhoods.",
    price: 8500,
    location: "Tribeca, New York",
    bedrooms: 3,
    apartmentType: "duplex",
    amenities: ["parking", "terrace", "gym", "concierge", "storage", "wine cellar"],
    photos: [
      "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=800",
      "https://images.unsplash.com/photo-1565183997392-2f6f122e5912?w=800"
    ]
  },
  {
    title: "Charming 1-Bed in Williamsburg",
    description: "Sun-drenched 1-bedroom in the heart of Williamsburg with original details, a large eat-in kitchen, and hardwood floors throughout. Near the L train and the best of Brooklyn.",
    price: 2100,
    location: "Williamsburg, Brooklyn",
    bedrooms: 1,
    apartmentType: "1bed",
    amenities: ["laundry", "pet-friendly", "storage", "bike room"],
    photos: [
      "https://images.unsplash.com/photo-1469022563428-aa04fef9f5a2?w=800",
      "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800"
    ]
  },
  {
    title: "Furnished Studio with City Views",
    description: "Fully furnished studio with incredible skyline views from the 28th floor. Perfect for a professional relocating to the city. Includes high-speed internet and all utilities.",
    price: 1800,
    location: "Midtown, New York",
    bedrooms: 0,
    apartmentType: "studio",
    amenities: ["furnished", "gym", "rooftop", "doorman", "utilities included", "high-speed internet"],
    photos: [
      "https://images.unsplash.com/photo-1574362848149-11496d93a7c7?w=800",
      "https://images.unsplash.com/photo-1554995207-c18c203602cb?w=800"
    ]
  },
  {
    title: "2-Bed Family Apartment in Astoria",
    description: "Bright and spacious 2-bedroom on a quiet, tree-lined block in Astoria. Renovated kitchen, two full baths, and a private yard. Minutes from the N/W train.",
    price: 2800,
    location: "Astoria, Queens",
    bedrooms: 2,
    apartmentType: "2bed",
    amenities: ["private yard", "laundry", "pet-friendly", "parking", "security"],
    photos: [
      "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800",
      "https://images.unsplash.com/photo-1567767292278-a4f21aa2d36e?w=800"
    ]
  },
  {
    title: "Garden Duplex in Park Slope",
    description: "Beautiful garden-level duplex in coveted Park Slope. Features a private garden, working fireplace, and exposed brick. Steps from Prospect Park and the F/G trains.",
    price: 3800,
    location: "Park Slope, Brooklyn",
    bedrooms: 2,
    apartmentType: "duplex",
    amenities: ["private garden", "fireplace", "laundry", "storage", "pet-friendly"],
    photos: [
      "https://images.unsplash.com/photo-1600585154526-990dced4db0d?w=800",
      "https://images.unsplash.com/photo-1600607686527-6fb886090705?w=800"
    ]
  }
];
async function seedApartments(landlordId, landlordName, landlordPhone, landlordEmail) {
  const existing = await storage.getAllApartments();
  if (existing.length > 0) return;
  for (const apt of sampleApartments) {
    await storage.createApartment({
      ...apt,
      landlordId,
      landlordName,
      landlordPhone,
      landlordEmail,
      isActive: true
    });
  }
}
async function registerRoutes(app2) {
  app2.post("/api/auth/register-init", async (req, res) => {
    try {
      const { email, username, phone, password, role = "renter" } = req.body;
      if (!email || !username || !phone || !password) {
        return res.status(400).json({ error: "Email, username, phone, and password are required" });
      }
      const existingEmail = await storage.getUserByEmail(email);
      if (existingEmail) return res.status(409).json({ error: "Email already registered" });
      const existingUsername = await storage.getUserByUsername(username);
      if (existingUsername) return res.status(409).json({ error: "Username already taken" });
      const otpData = createOTP(phone);
      res.json({
        message: "OTP sent to phone number",
        phone,
        expiresIn: 600
        // seconds
      });
    } catch (err) {
      console.error("Register init error:", err);
      res.status(500).json({ error: "Failed to initiate registration" });
    }
  });
  app2.post("/api/auth/verify-otp", async (req, res) => {
    try {
      const { email, username, phone, password, otp, fullName = "", role = "renter" } = req.body;
      if (!phone || !otp) {
        return res.status(400).json({ error: "Phone and OTP are required" });
      }
      if (!verifyOTP(phone, otp)) {
        return res.status(400).json({ error: "Invalid or expired OTP" });
      }
      const hashedPassword = hashPassword(password);
      const user = await storage.createUser({
        email,
        username,
        fullName,
        phone,
        password: hashedPassword,
        role
      });
      clearOTP(phone);
      if (role === "landlord") {
        await seedApartments(user.id, username, phone, email);
      }
      const token = generateToken();
      tokenStore.set(token, user.id);
      const { password: _, ...safeUser } = user;
      res.status(201).json({ token, user: safeUser });
    } catch (err) {
      console.error("Verify OTP error:", err);
      res.status(500).json({ error: "Registration failed" });
    }
  });
  app2.post("/api/auth/register", async (req, res) => {
    try {
      const { email, username, fullName = "", phone = "", password, role = "renter" } = req.body;
      if (!email || !username || !password || !phone) {
        return res.status(400).json({ error: "Email, username, phone, and password are required" });
      }
      const existingEmail = await storage.getUserByEmail(email);
      if (existingEmail) return res.status(409).json({ error: "Email already registered" });
      const existingUsername = await storage.getUserByUsername(username);
      if (existingUsername) return res.status(409).json({ error: "Username already taken" });
      const hashedPassword = hashPassword(password);
      const user = await storage.createUser({ email, username, fullName, phone, password: hashedPassword, role });
      if (role === "landlord") {
        await seedApartments(user.id, username, phone, email);
      }
      const token = generateToken();
      tokenStore.set(token, user.id);
      const { password: _, ...safeUser } = user;
      res.status(201).json({ token, user: safeUser });
    } catch (err) {
      console.error("Register error:", err);
      res.status(500).json({ error: "Registration failed" });
    }
  });
  app2.post("/api/auth/login", async (req, res) => {
    try {
      const { email, password } = req.body;
      if (!email || !password) {
        return res.status(400).json({ error: "Email and password are required" });
      }
      const user = await storage.getUserByEmail(email);
      if (!user || !verifyPassword(password, user.password)) {
        return res.status(401).json({ error: "Invalid email or password" });
      }
      const token = generateToken();
      tokenStore.set(token, user.id);
      const { password: _, ...safeUser } = user;
      res.json({ token, user: safeUser });
    } catch (err) {
      console.error("Login error:", err);
      res.status(500).json({ error: "Login failed" });
    }
  });
  app2.post("/api/auth/logout", async (req, res) => {
    const token = getTokenFromReq(req);
    if (token) tokenStore.delete(token);
    res.json({ success: true });
  });
  app2.get("/api/auth/me", async (req, res) => {
    const user = await getUserFromReq(req);
    if (!user) return res.status(401).json({ error: "Unauthorized" });
    const { password: _, ...safeUser } = user;
    res.json(safeUser);
  });
  app2.delete("/api/auth/me", async (req, res) => {
    try {
      const user = await getUserFromReq(req);
      if (!user) return res.status(401).json({ error: "Unauthorized" });
      const token = getTokenFromReq(req);
      if (token) tokenStore.delete(token);
      await storage.deleteUser(user.id);
      res.status(204).send();
    } catch (err) {
      console.error("Delete user error:", err);
      res.status(500).json({ error: "Failed to delete account" });
    }
  });
  app2.get("/api/apartments", async (req, res) => {
    try {
      const all = await storage.getAllApartments();
      res.json(all);
    } catch (err) {
      res.status(500).json({ error: "Failed to fetch apartments" });
    }
  });
  app2.get("/api/apartments/:id", async (req, res) => {
    try {
      const apt = await storage.getApartment(req.params.id);
      if (!apt) return res.status(404).json({ error: "Apartment not found" });
      res.json(apt);
    } catch (err) {
      res.status(500).json({ error: "Failed to fetch apartment" });
    }
  });
  app2.post("/api/apartments", async (req, res) => {
    try {
      const user = await getUserFromReq(req);
      if (!user) return res.status(401).json({ error: "Unauthorized" });
      if (user.role !== "landlord") return res.status(403).json({ error: "Only landlords can list apartments" });
      const apt = await storage.createApartment({
        ...req.body,
        ownerId: user.id
      });
      res.status(201).json(apt);
    } catch (err) {
      console.error("Create apartment error:", err);
      res.status(500).json({ error: "Failed to create apartment" });
    }
  });
  app2.put("/api/apartments/:id", async (req, res) => {
    try {
      const user = await getUserFromReq(req);
      if (!user) return res.status(401).json({ error: "Unauthorized" });
      const apt = await storage.getApartment(req.params.id);
      if (!apt) return res.status(404).json({ error: "Apartment not found" });
      if (apt.ownerId !== user.id) return res.status(403).json({ error: "Forbidden" });
      const updated = await storage.updateApartment(req.params.id, req.body);
      res.json(updated);
    } catch (err) {
      res.status(500).json({ error: "Failed to update apartment" });
    }
  });
  app2.delete("/api/apartments/:id", async (req, res) => {
    try {
      const user = await getUserFromReq(req);
      if (!user) return res.status(401).json({ error: "Unauthorized" });
      const apt = await storage.getApartment(req.params.id);
      if (!apt) return res.status(404).json({ error: "Apartment not found" });
      if (apt.ownerId !== user.id) return res.status(403).json({ error: "Forbidden" });
      await storage.deleteApartment(req.params.id);
      res.status(204).send();
    } catch (err) {
      res.status(500).json({ error: "Failed to delete apartment" });
    }
  });
  app2.get("/api/my-apartments", async (req, res) => {
    try {
      const user = await getUserFromReq(req);
      if (!user) return res.status(401).json({ error: "Unauthorized" });
      const apts = await storage.getApartmentsByLandlord(user.id);
      res.json(apts);
    } catch (err) {
      res.status(500).json({ error: "Failed to fetch your apartments" });
    }
  });
  app2.post("/api/apartments/match", async (req, res) => {
    try {
      const { location, budget, bedrooms, apartmentType, preferences } = req.body;
      const all = await storage.getAllApartments();
      if (all.length === 0) {
        return res.json({ apartments: [], explanation: "No apartments available yet." });
      }
      const apartmentList = all.map((a) => `ID: ${a.id} | ${a.title} | ${a.location} | $${a.price}/mo | ${a.bedrooms} bed | ${a.apartmentType} | Amenities: ${a.amenities.join(", ")}`).join("\n");
      const prompt = `You are an apartment matching expert. A user is looking for an apartment with these preferences:
- Location: ${location || "any"}
- Max budget: $${budget || "any"}/month
- Bedrooms: ${bedrooms ?? "any"}
- Type: ${apartmentType || "any"}
- Additional preferences: ${preferences || "none"}

Available apartments:
${apartmentList}

Return a JSON object with:
1. "matches": array of apartment IDs (as strings) in order of best match (max 5)
2. "explanation": a brief, friendly explanation of why these are good matches

Response format:
{"matches": ["id1", "id2", ...], "explanation": "..."}`;
      const response = await openai2.chat.completions.create({
        model: "gpt-5.1",
        messages: [{ role: "user", content: prompt }],
        max_completion_tokens: 1024,
        response_format: { type: "json_object" }
      });
      const content = response.choices[0]?.message?.content || "{}";
      const parsed = JSON.parse(content);
      const matchIds = parsed.matches || [];
      const matchedApts = matchIds.map((id) => all.find((a) => a.id === id)).filter(Boolean);
      res.json({ apartments: matchedApts, explanation: parsed.explanation || "" });
    } catch (err) {
      console.error("AI match error:", err);
      res.status(500).json({ error: "AI matching failed" });
    }
  });
  app2.get("/api/saved", async (req, res) => {
    try {
      const user = await getUserFromReq(req);
      if (!user) return res.status(401).json({ error: "Unauthorized" });
      const saved = await storage.getSavedApartmentsByUser(user.id);
      res.json(saved);
    } catch (err) {
      res.status(500).json({ error: "Failed to fetch saved apartments" });
    }
  });
  app2.post("/api/saved/:apartmentId", async (req, res) => {
    try {
      const user = await getUserFromReq(req);
      if (!user) return res.status(401).json({ error: "Unauthorized" });
      const saved = await storage.saveApartment(user.id, req.params.apartmentId);
      res.status(201).json(saved);
    } catch (err) {
      res.status(500).json({ error: "Failed to save apartment" });
    }
  });
  app2.delete("/api/saved/:apartmentId", async (req, res) => {
    try {
      const user = await getUserFromReq(req);
      if (!user) return res.status(401).json({ error: "Unauthorized" });
      await storage.unsaveApartment(user.id, req.params.apartmentId);
      res.status(204).send();
    } catch (err) {
      res.status(500).json({ error: "Failed to remove saved apartment" });
    }
  });
  app2.get("/api/saved/:apartmentId/status", async (req, res) => {
    try {
      const user = await getUserFromReq(req);
      if (!user) return res.json({ saved: false });
      const saved = await storage.isApartmentSaved(user.id, req.params.apartmentId);
      res.json({ saved });
    } catch (err) {
      res.status(500).json({ error: "Failed to check saved status" });
    }
  });
  app2.post("/api/chat", async (req, res) => {
    try {
      const user = await getUserFromReq(req);
      if (!user) return res.status(401).json({ error: "Unauthorized" });
      const { message } = req.body;
      if (!message) return res.status(400).json({ error: "Message required" });
      await storage.addChatMessage(user.id, "user", message);
      const history = await storage.getChatHistory(user.id);
      const messages2 = history.map((m) => ({
        role: m.role,
        content: m.content
      }));
      const apts = await storage.getAllApartments();
      const aptContext = apts.slice(0, 20).map((a) => `${a.title} in ${a.location} - $${a.price}/mo, ${a.bedrooms} bed ${a.apartmentType}`).join("\n");
      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache, no-transform");
      res.setHeader("X-Accel-Buffering", "no");
      res.flushHeaders();
      const stream = await openai2.chat.completions.create({
        model: "gpt-5.1",
        messages: [
          {
            role: "system",
            content: `You are Vacay AI, a friendly apartment-finding assistant. Help users find their perfect apartment by asking about their location preferences, budget, number of bedrooms, apartment type (studio, 1-bed, 2-bed, duplex), and any special requirements like parking, furnished, or pet-friendly.

Available apartments in our database:
${aptContext}

Be conversational, helpful, and specific. If the user has described their needs, suggest relevant apartments from the list above. Keep responses concise and friendly.`
          },
          ...messages2
        ],
        stream: true,
        max_completion_tokens: 512
      });
      let fullContent = "";
      for await (const chunk of stream) {
        const content = chunk.choices[0]?.delta?.content || "";
        if (content) {
          fullContent += content;
          res.write(`data: ${JSON.stringify({ content })}

`);
        }
      }
      await storage.addChatMessage(user.id, "assistant", fullContent);
      res.write(`data: [DONE]

`);
      res.end();
    } catch (err) {
      console.error("Chat error:", err);
      if (!res.headersSent) {
        res.status(500).json({ error: "Chat failed" });
      }
    }
  });
  app2.get("/api/chat/history", async (req, res) => {
    try {
      const user = await getUserFromReq(req);
      if (!user) return res.status(401).json({ error: "Unauthorized" });
      const history = await storage.getChatHistory(user.id);
      res.json(history);
    } catch (err) {
      res.status(500).json({ error: "Failed to fetch chat history" });
    }
  });
  app2.delete("/api/chat/history", async (req, res) => {
    try {
      const user = await getUserFromReq(req);
      if (!user) return res.status(401).json({ error: "Unauthorized" });
      await storage.clearChatHistory(user.id);
      res.status(204).send();
    } catch (err) {
      res.status(500).json({ error: "Failed to clear chat history" });
    }
  });
  app2.post("/api/messages", async (req, res) => {
    try {
      const user = await getUserFromReq(req);
      if (!user) return res.status(401).json({ error: "Unauthorized" });
      const { receiverId, apartmentId, message } = req.body;
      if (!receiverId || !apartmentId || !message) return res.status(400).json({ error: "Missing required fields" });
      if (!storage.filterMessageContent(message)) {
        return res.status(400).json({ error: "Messages cannot contain phone numbers, emails, external links, or payment information" });
      }
      const msg = await storage.sendMessage(user.id, receiverId, apartmentId, message);
      await storage.createNotification(receiverId, `New message about apartment ${apartmentId}`, "message");
      res.status(201).json(msg);
    } catch (err) {
      res.status(500).json({ error: "Failed to send message" });
    }
  });
  app2.get("/api/messages/:apartmentId/:userId", async (req, res) => {
    try {
      const user = await getUserFromReq(req);
      if (!user) return res.status(401).json({ error: "Unauthorized" });
      const conversation = await storage.getConversation(user.id, req.params.userId, req.params.apartmentId);
      res.json(conversation);
    } catch (err) {
      res.status(500).json({ error: "Failed to fetch conversation" });
    }
  });
  app2.post("/api/requests", async (req, res) => {
    try {
      const user = await getUserFromReq(req);
      if (!user) return res.status(401).json({ error: "Unauthorized" });
      const { apartmentId, moveInDate, rentDuration } = req.body;
      if (!apartmentId || !moveInDate || !rentDuration) return res.status(400).json({ error: "Missing required fields" });
      const request = await storage.createRentRequest(user.id, apartmentId, new Date(moveInDate), rentDuration);
      const apt = await storage.getApartment(apartmentId);
      if (apt) {
        await storage.createNotification(apt.ownerId, `New rent request for ${apt.title}`, "request");
      }
      res.status(201).json(request);
    } catch (err) {
      res.status(500).json({ error: "Failed to create rent request" });
    }
  });
  app2.get("/api/requests/:apartmentId", async (req, res) => {
    try {
      const requests = await storage.getRentRequests(req.params.apartmentId);
      res.json(requests);
    } catch (err) {
      res.status(500).json({ error: "Failed to fetch requests" });
    }
  });
  app2.patch("/api/requests/:id/approve", async (req, res) => {
    try {
      const updated = await storage.updateRentRequestStatus(req.params.id, "approved");
      if (updated) {
        const renter = await storage.getUser(updated.userId);
        if (renter) {
          await storage.createNotification(updated.userId, "Your rent request was approved!", "approval");
        }
      }
      res.json(updated);
    } catch (err) {
      res.status(500).json({ error: "Failed to approve request" });
    }
  });
  app2.post("/api/transactions", async (req, res) => {
    try {
      const user = await getUserFromReq(req);
      if (!user) return res.status(401).json({ error: "Unauthorized" });
      const { apartmentId, totalAmount, commissionRate = 10 } = req.body;
      const apt = await storage.getApartment(apartmentId);
      if (!apt) return res.status(404).json({ error: "Apartment not found" });
      const tx = await storage.createTransaction(user.id, apt.ownerId, apartmentId, totalAmount, commissionRate);
      res.status(201).json(tx);
    } catch (err) {
      res.status(500).json({ error: "Failed to create transaction" });
    }
  });
  app2.patch("/api/transactions/:id/complete", async (req, res) => {
    try {
      await storage.completeTransaction(req.params.id);
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: "Failed to complete transaction" });
    }
  });
  app2.get("/api/transactions", async (req, res) => {
    try {
      const user = await getUserFromReq(req);
      if (!user) return res.status(401).json({ error: "Unauthorized" });
      const transactions2 = await storage.getUserTransactions(user.id);
      res.json(transactions2);
    } catch (err) {
      res.status(500).json({ error: "Failed to fetch transactions" });
    }
  });
  app2.get("/api/wallet/balance", async (req, res) => {
    try {
      const user = await getUserFromReq(req);
      if (!user) return res.status(401).json({ error: "Unauthorized" });
      if (user.role !== "owner") return res.status(403).json({ error: "Only owners have wallets" });
      const balance = await storage.getWalletBalance(user.id);
      res.json({ balance });
    } catch (err) {
      res.status(500).json({ error: "Failed to fetch wallet balance" });
    }
  });
  app2.get("/api/notifications", async (req, res) => {
    try {
      const user = await getUserFromReq(req);
      if (!user) return res.status(401).json({ error: "Unauthorized" });
      const notifications2 = await storage.getUserNotifications(user.id);
      res.json(notifications2);
    } catch (err) {
      res.status(500).json({ error: "Failed to fetch notifications" });
    }
  });
  app2.patch("/api/notifications/:id/read", async (req, res) => {
    try {
      await storage.markNotificationAsRead(req.params.id);
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: "Failed to mark notification as read" });
    }
  });
  app2.post("/api/apartments/:id/photos", async (req, res) => {
    try {
      const user = await getUserFromReq(req);
      if (!user) return res.status(401).json({ error: "Unauthorized" });
      const { photoUrls } = req.body;
      if (!Array.isArray(photoUrls) || photoUrls.length === 0) return res.status(400).json({ error: "photoUrls must be a non-empty array" });
      const apt = await storage.getApartment(req.params.id);
      if (!apt) return res.status(404).json({ error: "Apartment not found" });
      if (apt.ownerId !== user.id) return res.status(403).json({ error: "Forbidden" });
      const existingPhotos = apt.photos || [];
      const updatedPhotos = [...existingPhotos, ...photoUrls];
      const updated = await storage.updateApartment(req.params.id, { photos: updatedPhotos });
      res.json(updated);
    } catch (err) {
      res.status(500).json({ error: "Failed to upload photos" });
    }
  });
  app2.post("/api/apartments/:id/videos", async (req, res) => {
    try {
      const user = await getUserFromReq(req);
      if (!user) return res.status(401).json({ error: "Unauthorized" });
      const { videoUrls } = req.body;
      if (!Array.isArray(videoUrls) || videoUrls.length === 0) return res.status(400).json({ error: "videoUrls must be a non-empty array" });
      const apt = await storage.getApartment(req.params.id);
      if (!apt) return res.status(404).json({ error: "Apartment not found" });
      if (apt.ownerId !== user.id) return res.status(403).json({ error: "Forbidden" });
      const existingVideos = apt.videos || [];
      const updatedVideos = [...existingVideos, ...videoUrls];
      const updated = await storage.updateApartment(req.params.id, { videos: updatedVideos });
      res.json(updated);
    } catch (err) {
      res.status(500).json({ error: "Failed to upload videos" });
    }
  });
  app2.delete("/api/apartments/:id/photos/:photoIndex", async (req, res) => {
    try {
      const user = await getUserFromReq(req);
      if (!user) return res.status(401).json({ error: "Unauthorized" });
      const photoIndex = parseInt(req.params.photoIndex);
      const apt = await storage.getApartment(req.params.id);
      if (!apt) return res.status(404).json({ error: "Apartment not found" });
      if (apt.ownerId !== user.id) return res.status(403).json({ error: "Forbidden" });
      const photos = (apt.photos || []).filter((_, i) => i !== photoIndex);
      const updated = await storage.updateApartment(req.params.id, { photos });
      res.json(updated);
    } catch (err) {
      res.status(500).json({ error: "Failed to delete photo" });
    }
  });
  app2.delete("/api/apartments/:id/videos/:videoIndex", async (req, res) => {
    try {
      const user = await getUserFromReq(req);
      if (!user) return res.status(401).json({ error: "Unauthorized" });
      const videoIndex = parseInt(req.params.videoIndex);
      const apt = await storage.getApartment(req.params.id);
      if (!apt) return res.status(404).json({ error: "Apartment not found" });
      if (apt.ownerId !== user.id) return res.status(403).json({ error: "Forbidden" });
      const videos = (apt.videos || []).filter((_, i) => i !== videoIndex);
      const updated = await storage.updateApartment(req.params.id, { videos });
      res.json(updated);
    } catch (err) {
      res.status(500).json({ error: "Failed to delete video" });
    }
  });
  app2.post("/api/verification/submit", async (req, res) => {
    try {
      const user = await getUserFromReq(req);
      if (!user) return res.status(401).json({ error: "Unauthorized" });
      if (user.role !== "owner") return res.status(403).json({ error: "Only owners can submit verification" });
      const { facePhotoUrl, idPhotoUrl, idType } = req.body;
      if (!facePhotoUrl || !idPhotoUrl || !idType) return res.status(400).json({ error: "Missing required fields" });
      const verification = await storage.submitVerification(user.id, facePhotoUrl, idPhotoUrl, idType);
      await storage.createNotification(user.id, "Your verification request has been submitted. Admins will review it.", "verification");
      res.status(201).json(verification);
    } catch (err) {
      res.status(500).json({ error: "Failed to submit verification" });
    }
  });
  app2.get("/api/verification/status", async (req, res) => {
    try {
      const user = await getUserFromReq(req);
      if (!user) return res.status(401).json({ error: "Unauthorized" });
      const verification = await storage.getVerification(user.id);
      res.json({ verification: verification || null, isVerified: user.isVerified, status: user.verificationStatus });
    } catch (err) {
      res.status(500).json({ error: "Failed to fetch verification status" });
    }
  });
  app2.get("/api/admin/verifications/pending", async (req, res) => {
    try {
      const user = await getUserFromReq(req);
      if (!user) return res.status(401).json({ error: "Unauthorized" });
      if (user.role !== "admin") return res.status(403).json({ error: "Only admins can view pending verifications" });
      const pending = await storage.getPendingVerifications();
      res.json(pending);
    } catch (err) {
      res.status(500).json({ error: "Failed to fetch pending verifications" });
    }
  });
  app2.patch("/api/admin/verifications/:id/approve", async (req, res) => {
    try {
      const user = await getUserFromReq(req);
      if (!user) return res.status(401).json({ error: "Unauthorized" });
      if (user.role !== "admin") return res.status(403).json({ error: "Only admins can approve verifications" });
      await storage.approveVerification(req.params.id, user.id);
      const verification = await storage.getVerification(req.params.id);
      if (verification) {
        await storage.createNotification(verification.ownerId, "Your identity verification has been approved! You now have a verified badge.", "verification");
      }
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: "Failed to approve verification" });
    }
  });
  app2.patch("/api/admin/verifications/:id/reject", async (req, res) => {
    try {
      const user = await getUserFromReq(req);
      if (!user) return res.status(401).json({ error: "Unauthorized" });
      if (user.role !== "admin") return res.status(403).json({ error: "Only admins can reject verifications" });
      const { rejectionReason } = req.body;
      if (!rejectionReason) return res.status(400).json({ error: "rejectionReason is required" });
      await storage.rejectVerification(req.params.id, rejectionReason);
      const verification = await storage.getVerification(req.params.id);
      if (verification) {
        await storage.createNotification(verification.ownerId, `Your verification was rejected: ${rejectionReason}`, "verification");
      }
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: "Failed to reject verification" });
    }
  });
  registerImageRoutes(app2);
  const httpServer = createServer(app2);
  return httpServer;
}

// server/index.ts
import * as fs from "fs";
import * as path from "path";
var app = express();
var log = console.log;
function setupCors(app2) {
  app2.use((req, res, next) => {
    const origins = /* @__PURE__ */ new Set();
    if (process.env.REPLIT_DEV_DOMAIN) {
      origins.add(`https://${process.env.REPLIT_DEV_DOMAIN}`);
    }
    if (process.env.REPLIT_DOMAINS) {
      process.env.REPLIT_DOMAINS.split(",").forEach((d) => {
        origins.add(`https://${d.trim()}`);
      });
    }
    const origin = req.header("origin");
    const isLocalhost = origin?.startsWith("http://localhost:") || origin?.startsWith("http://127.0.0.1:");
    if (origin && (origins.has(origin) || isLocalhost)) {
      res.header("Access-Control-Allow-Origin", origin);
      res.header(
        "Access-Control-Allow-Methods",
        "GET, POST, PUT, DELETE, OPTIONS"
      );
      res.header("Access-Control-Allow-Headers", "Content-Type");
      res.header("Access-Control-Allow-Credentials", "true");
    }
    if (req.method === "OPTIONS") {
      return res.sendStatus(200);
    }
    next();
  });
}
function setupBodyParsing(app2) {
  app2.use(
    express.json({
      verify: (req, _res, buf) => {
        req.rawBody = buf;
      }
    })
  );
  app2.use(express.urlencoded({ extended: false }));
}
function setupRequestLogging(app2) {
  app2.use((req, res, next) => {
    const start = Date.now();
    const path2 = req.path;
    let capturedJsonResponse = void 0;
    const originalResJson = res.json;
    res.json = function(bodyJson, ...args) {
      capturedJsonResponse = bodyJson;
      return originalResJson.apply(res, [bodyJson, ...args]);
    };
    res.on("finish", () => {
      if (!path2.startsWith("/api")) return;
      const duration = Date.now() - start;
      let logLine = `${req.method} ${path2} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }
      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "\u2026";
      }
      log(logLine);
    });
    next();
  });
}
function getAppName() {
  try {
    const appJsonPath = path.resolve(process.cwd(), "app.json");
    const appJsonContent = fs.readFileSync(appJsonPath, "utf-8");
    const appJson = JSON.parse(appJsonContent);
    return appJson.expo?.name || "App Landing Page";
  } catch {
    return "App Landing Page";
  }
}
function serveExpoManifest(platform, res) {
  const manifestPath = path.resolve(
    process.cwd(),
    "static-build",
    platform,
    "manifest.json"
  );
  if (!fs.existsSync(manifestPath)) {
    return res.status(404).json({ error: `Manifest not found for platform: ${platform}` });
  }
  res.setHeader("expo-protocol-version", "1");
  res.setHeader("expo-sfv-version", "0");
  res.setHeader("content-type", "application/json");
  const manifest = fs.readFileSync(manifestPath, "utf-8");
  res.send(manifest);
}
function serveLandingPage({
  req,
  res,
  landingPageTemplate,
  appName
}) {
  const forwardedProto = req.header("x-forwarded-proto");
  const protocol = forwardedProto || req.protocol || "https";
  const forwardedHost = req.header("x-forwarded-host");
  const host = forwardedHost || req.get("host");
  const baseUrl = `${protocol}://${host}`;
  const expsUrl = `${host}`;
  log(`baseUrl`, baseUrl);
  log(`expsUrl`, expsUrl);
  const html = landingPageTemplate.replace(/BASE_URL_PLACEHOLDER/g, baseUrl).replace(/EXPS_URL_PLACEHOLDER/g, expsUrl).replace(/APP_NAME_PLACEHOLDER/g, appName);
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.status(200).send(html);
}
function configureExpoAndLanding(app2) {
  const templatePath = path.resolve(
    process.cwd(),
    "server",
    "templates",
    "landing-page.html"
  );
  const landingPageTemplate = fs.readFileSync(templatePath, "utf-8");
  const appName = getAppName();
  log("Serving static Expo files with dynamic manifest routing");
  app2.use((req, res, next) => {
    if (req.path.startsWith("/api")) {
      return next();
    }
    if (req.path !== "/" && req.path !== "/manifest") {
      return next();
    }
    const platform = req.header("expo-platform");
    if (platform && (platform === "ios" || platform === "android")) {
      return serveExpoManifest(platform, res);
    }
    if (req.path === "/") {
      return serveLandingPage({
        req,
        res,
        landingPageTemplate,
        appName
      });
    }
    next();
  });
  app2.use("/assets", express.static(path.resolve(process.cwd(), "assets")));
  app2.use(express.static(path.resolve(process.cwd(), "static-build")));
  log("Expo routing: Checking expo-platform header on / and /manifest");
}
function setupErrorHandler(app2) {
  app2.use((err, _req, res, next) => {
    const error = err;
    const status = error.status || error.statusCode || 500;
    const message = error.message || "Internal Server Error";
    console.error("Internal Server Error:", err);
    if (res.headersSent) {
      return next(err);
    }
    return res.status(status).json({ message });
  });
}
(async () => {
  setupCors(app);
  setupBodyParsing(app);
  setupRequestLogging(app);
  configureExpoAndLanding(app);
  const server = await registerRoutes(app);
  setupErrorHandler(app);
  const port = parseInt(process.env.PORT || "5000", 10);
  server.listen(
    {
      port,
      host: "0.0.0.0",
      reusePort: true
    },
    () => {
      log(`express server serving on port ${port}`);
    }
  );
})();
