import { users, apartments, savedApartments, chatMessages, messages, rentRequests, transactions, wallets, notifications, verifications, termsAndConditions, userTermsAcceptance, userReports, blockedUsers } from "@shared/schema";
import type {
  User,
  InsertUser,
  Apartment,
  InsertApartment,
  SavedApartment,
  ChatMessage,
  Message,
  RentRequest,
  Transaction,
  Wallet,
  Notification,
  Verification,
} from "@shared/schema";
import { db } from "./db";
import { eq, and, or, desc } from "drizzle-orm";

export interface IStorage {
  // Users
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;

  // Apartments
  getApartment(id: string): Promise<Apartment | undefined>;
  getAllApartments(): Promise<Apartment[]>;
  getApartmentsByLandlord(landlordId: string): Promise<Apartment[]>;
  createApartment(apartment: InsertApartment): Promise<Apartment>;
  updateApartment(id: string, data: Partial<InsertApartment>): Promise<Apartment | undefined>;
  deleteApartment(id: string): Promise<void>;

  // Saved apartments
  getSavedApartmentsByUser(userId: string): Promise<Apartment[]>;
  saveApartment(userId: string, apartmentId: string): Promise<SavedApartment>;
  unsaveApartment(userId: string, apartmentId: string): Promise<void>;
  isApartmentSaved(userId: string, apartmentId: string): Promise<boolean>;

  // Chat
  getChatHistory(userId: string): Promise<ChatMessage[]>;
  addChatMessage(userId: string, role: string, content: string): Promise<ChatMessage>;
  clearChatHistory(userId: string): Promise<void>;

  // Messages (user-to-user)
  sendMessage(senderId: string, receiverId: string, apartmentId: string, message: string): Promise<Message>;
  getConversation(userId: string, otherUserId: string, apartmentId: string): Promise<Message[]>;

  // Rent requests
  createRentRequest(userId: string, apartmentId: string, moveInDate: Date, rentDuration: number): Promise<RentRequest>;
  getRentRequests(apartmentId: string): Promise<RentRequest[]>;
  updateRentRequestStatus(requestId: string, status: string): Promise<RentRequest | undefined>;

  // Transactions
  createTransaction(userId: string, ownerId: string, apartmentId: string, totalAmount: number, commissionRate: number): Promise<Transaction>;
  completeTransaction(transactionId: string): Promise<void>;
  getUserTransactions(userId: string): Promise<Transaction[]>;

  // Wallets
  getOrCreateWallet(ownerId: string): Promise<Wallet>;
  updateWalletBalance(ownerId: string, amount: number): Promise<void>;
  getWalletBalance(ownerId: string): Promise<number>;

  // Notifications
  createNotification(userId: string, message: string, type: string): Promise<Notification>;
  getUserNotifications(userId: string): Promise<Notification[]>;
  markNotificationAsRead(notificationId: string): Promise<void>;

  // Owner verification
  submitVerification(ownerId: string, facePhotoUrl: string, idPhotoUrl: string, idType: string): Promise<Verification>;
  getVerification(ownerId: string): Promise<Verification | undefined>;
  getPendingVerifications(): Promise<Verification[]>;
  approveVerification(verificationId: string, approvedBy: string): Promise<void>;
  rejectVerification(verificationId: string, rejectionReason: string): Promise<void>;

  // Message filtering
  filterMessageContent(content: string): boolean;

  // User Deletion
  deleteUser(id: string): Promise<void>;

  // Terms and Conditions
  getLatestTermsAndConditions(): Promise<any>;
  acceptTermsAndConditions(userId: string, termsVersion: string): Promise<void>;

  // User Reports
  reportUser(reportedByUserId: string, reportedUserId: string, reason: string, description: string): Promise<any>;
  getPendingUserReports(): Promise<any[]>;

  // User Blocking
  blockUser(blockingUserId: string, blockedUserId: string, reason: string): Promise<void>;
  unblockUser(blockingUserId: string, blockedUserId: string): Promise<void>;
  isUserBlocked(blockingUserId: string, blockedUserId: string): Promise<boolean>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  async deleteUser(id: string): Promise<void> {
    await db.delete(users).where(eq(users.id, id));
  }

  async getLatestTermsAndConditions(): Promise<any> {
    const [tc] = await db.select().from(termsAndConditions).orderBy(desc(termsAndConditions.createdAt)).limit(1);
    return tc;
  }

  async acceptTermsAndConditions(userId: string, termsVersion: string): Promise<void> {
    await db.insert(userTermsAcceptance).values({ userId, termsVersion }).onConflictDoNothing();
  }

  async reportUser(reportedByUserId: string, reportedUserId: string, reason: string, description: string): Promise<any> {
    const [report] = await db.insert(userReports).values({ reportedByUserId, reportedUserId, reason, description }).returning();
    return report;
  }

  async getPendingUserReports(): Promise<any[]> {
    return db.select().from(userReports).where(eq(userReports.status, "pending")).orderBy(desc(userReports.createdAt));
  }

  async blockUser(blockingUserId: string, blockedUserId: string, reason: string): Promise<void> {
    await db.insert(blockedUsers).values({ blockingUserId, blockedUserId, reason }).onConflictDoNothing();
  }

  async unblockUser(blockingUserId: string, blockedUserId: string): Promise<void> {
    await db.delete(blockedUsers).where(and(eq(blockedUsers.blockingUserId, blockingUserId), eq(blockedUsers.blockedUserId, blockedUserId)));
  }

  async isUserBlocked(blockingUserId: string, blockedUserId: string): Promise<boolean> {
    const [blocked] = await db.select().from(blockedUsers).where(and(eq(blockedUsers.blockingUserId, blockingUserId), eq(blockedUsers.blockedUserId, blockedUserId)));
    return !!blocked;
  }

  async sendMessage(senderId: string, receiverId: string, apartmentId: string, message: string): Promise<Message> {
    const [msg] = await db.insert(messages).values({ senderId, receiverId, apartmentId, message }).returning();
    return msg;
  }

  async getConversation(userId: string, otherUserId: string, apartmentId: string): Promise<Message[]> {
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

  async createRentRequest(userId: string, apartmentId: string, moveInDate: Date, rentDuration: number): Promise<RentRequest> {
    const [req] = await db.insert(rentRequests).values({ userId, apartmentId, moveInDate, rentDuration }).returning();
    return req;
  }

  async getRentRequests(apartmentId: string): Promise<RentRequest[]> {
    return db.select().from(rentRequests).where(eq(rentRequests.apartmentId, apartmentId));
  }

  async updateRentRequestStatus(requestId: string, status: string): Promise<RentRequest | undefined> {
    const [req] = await db.update(rentRequests).set({ status }).where(eq(rentRequests.id, requestId)).returning();
    return req;
  }

  async createTransaction(userId: string, ownerId: string, apartmentId: string, totalAmount: number, commissionRate: number): Promise<Transaction> {
    const commissionAmount = Math.floor(totalAmount * (commissionRate / 100));
    const ownerPayout = totalAmount - commissionAmount;
    const [tx] = await db.insert(transactions).values({ userId, ownerId, apartmentId, totalAmount, commissionAmount, ownerPayout }).returning();
    return tx;
  }

  async completeTransaction(transactionId: string): Promise<void> {
    const tx = await db.select().from(transactions).where(eq(transactions.id, transactionId));
    if (tx[0]) {
      await db.update(transactions).set({ status: "completed" }).where(eq(transactions.id, transactionId));
      await this.updateWalletBalance(tx[0].ownerId, tx[0].ownerPayout);
    }
  }

  async getUserTransactions(userId: string): Promise<Transaction[]> {
    return db.select().from(transactions).where(eq(transactions.userId, userId)).orderBy(desc(transactions.createdAt));
  }

  async getOrCreateWallet(ownerId: string): Promise<Wallet> {
    let wallet = await db.select().from(wallets).where(eq(wallets.ownerId, ownerId));
    if (wallet.length === 0) {
      const [newWallet] = await db.insert(wallets).values({ ownerId, balance: 0 }).returning();
      return newWallet;
    }
    return wallet[0];
  }

  async updateWalletBalance(ownerId: string, amount: number): Promise<void> {
    const wallet = await this.getOrCreateWallet(ownerId);
    await db.update(wallets).set({ balance: wallet.balance + amount }).where(eq(wallets.ownerId, ownerId));
  }

  async getWalletBalance(ownerId: string): Promise<number> {
    const wallet = await this.getOrCreateWallet(ownerId);
    return wallet.balance;
  }

  async createNotification(userId: string, message: string, type: string): Promise<Notification> {
    const [notif] = await db.insert(notifications).values({ userId, message, type }).returning();
    return notif;
  }

  async getUserNotifications(userId: string): Promise<Notification[]> {
    return db.select().from(notifications).where(eq(notifications.userId, userId)).orderBy(desc(notifications.createdAt));
  }

  async markNotificationAsRead(notificationId: string): Promise<void> {
    await db.update(notifications).set({ readStatus: true }).where(eq(notifications.id, notificationId));
  }

  async submitVerification(ownerId: string, facePhotoUrl: string, idPhotoUrl: string, idType: string): Promise<Verification> {
    const [verification] = await db.insert(verifications).values({ ownerId, facePhotoUrl, idPhotoUrl, idType }).returning();
    return verification;
  }

  async getVerification(ownerId: string): Promise<Verification | undefined> {
    const [verification] = await db.select().from(verifications).where(eq(verifications.ownerId, ownerId));
    return verification;
  }

  async getPendingVerifications(): Promise<Verification[]> {
    return db.select().from(verifications).where(eq(verifications.status, "pending"));
  }

  async approveVerification(verificationId: string, approvedBy: string): Promise<void> {
    const verification = await db.select().from(verifications).where(eq(verifications.id, verificationId));
    if (verification[0]) {
      await db.update(verifications).set({ status: "approved", approvedAt: new Date(), approvedBy }).where(eq(verifications.id, verificationId));
      await db.update(users).set({ isVerified: true, verificationStatus: "approved" }).where(eq(users.id, verification[0].ownerId));
    }
  }

  async rejectVerification(verificationId: string, rejectionReason: string): Promise<void> {
    const verification = await db.select().from(verifications).where(eq(verifications.id, verificationId));
    if (verification[0]) {
      await db.update(verifications).set({ status: "rejected", rejectionReason }).where(eq(verifications.id, verificationId));
      await db.update(users).set({ verificationStatus: "rejected" }).where(eq(users.id, verification[0].ownerId));
    }
  }

  filterMessageContent(content: string): boolean {
    // Detect phone numbers
    const phoneRegex = /(\+?1?\s?)?(\(?\d{3}\)?[\s.-]?)?\d{3}[\s.-]?\d{4}|(\+\d{1,3}[\s.-]?\d{1,14})/g;
    if (phoneRegex.test(content)) return false;

    // Detect email addresses
    const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
    if (emailRegex.test(content)) return false;

    // Detect external links and social media
    const urlRegex = /(https?:\/\/|www\.|@|#|telegram|whatsapp|facebook|instagram|twitter|signal|skype)/gi;
    if (urlRegex.test(content)) return false;

    // Detect common payment app names
    const paymentAppsRegex = /(paypal|stripe|venmo|square cash|wire transfer|bank transfer)/gi;
    if (paymentAppsRegex.test(content)) return false;

    return true;
  }

  async getApartment(id: string): Promise<Apartment | undefined> {
    const [apt] = await db.select().from(apartments).where(eq(apartments.id, id));
    return apt;
  }

  async getAllApartments(): Promise<Apartment[]> {
    return db
      .select()
      .from(apartments)
      .where(eq(apartments.isActive, true))
      .orderBy(desc(apartments.createdAt));
  }

  async getApartmentsByLandlord(landlordId: string): Promise<Apartment[]> {
    return db
      .select()
      .from(apartments)
      .where(eq(apartments.landlordId, landlordId))
      .orderBy(desc(apartments.createdAt));
  }

  async createApartment(apartment: InsertApartment): Promise<Apartment> {
    const [apt] = await db.insert(apartments).values(apartment).returning();
    return apt;
  }

  async updateApartment(id: string, data: Partial<InsertApartment>): Promise<Apartment | undefined> {
    const [apt] = await db
      .update(apartments)
      .set(data)
      .where(eq(apartments.id, id))
      .returning();
    return apt;
  }

  async deleteApartment(id: string): Promise<void> {
    await db.delete(apartments).where(eq(apartments.id, id));
  }

  async getSavedApartmentsByUser(userId: string): Promise<Apartment[]> {
    const saved = await db
      .select({ apartment: apartments })
      .from(savedApartments)
      .innerJoin(apartments, eq(savedApartments.apartmentId, apartments.id))
      .where(eq(savedApartments.userId, userId))
      .orderBy(desc(savedApartments.createdAt));
    return saved.map((s) => s.apartment);
  }

  async saveApartment(userId: string, apartmentId: string): Promise<SavedApartment> {
    const [saved] = await db
      .insert(savedApartments)
      .values({ userId, apartmentId })
      .returning();
    return saved;
  }

  async unsaveApartment(userId: string, apartmentId: string): Promise<void> {
    await db
      .delete(savedApartments)
      .where(and(eq(savedApartments.userId, userId), eq(savedApartments.apartmentId, apartmentId)));
  }

  async isApartmentSaved(userId: string, apartmentId: string): Promise<boolean> {
    const [saved] = await db
      .select()
      .from(savedApartments)
      .where(and(eq(savedApartments.userId, userId), eq(savedApartments.apartmentId, apartmentId)));
    return !!saved;
  }

  async getChatHistory(userId: string): Promise<ChatMessage[]> {
    return db
      .select()
      .from(chatMessages)
      .where(eq(chatMessages.userId, userId))
      .orderBy(chatMessages.createdAt);
  }

  async addChatMessage(userId: string, role: string, content: string): Promise<ChatMessage> {
    const [msg] = await db
      .insert(chatMessages)
      .values({ userId, role, content })
      .returning();
    return msg;
  }

  async clearChatHistory(userId: string): Promise<void> {
    await db.delete(chatMessages).where(eq(chatMessages.userId, userId));
  }

  async deleteUser(id: string): Promise<void> {
    await db.delete(users).where(eq(users.id, id));
  }
}

export const storage = new DatabaseStorage();
