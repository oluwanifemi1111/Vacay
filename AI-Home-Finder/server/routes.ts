import type { Express, Request, Response } from "express";
import { createServer, type Server } from "node:http";
import { scryptSync, randomBytes, timingSafeEqual } from "crypto";
import OpenAI from "openai";
import { storage } from "./storage";
import type { InsertUser, InsertApartment, Message, RentRequest, Transaction } from "@shared/schema";
import { registerImageRoutes } from "./replit_integrations/image";
import { createOTP, verifyOTP, clearOTP, resendOTP, canResendOTP } from "./otp";

let openai: OpenAI | null = null;

if (process.env.AI_INTEGRATIONS_OPENAI_API_KEY) {
  openai = new OpenAI({
    apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
    baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
  });
}

// --- Password utilities ---
function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

function verifyPassword(password: string, stored: string): boolean {
  const [salt, hash] = stored.split(":");
  const hashBuffer = Buffer.from(hash, "hex");
  const suppliedHash = scryptSync(password, salt, 64);
  return timingSafeEqual(hashBuffer, suppliedHash);
}

// --- Simple token store (in-memory, maps token -> userId) ---
const tokenStore = new Map<string, string>();

function generateToken(): string {
  return randomBytes(32).toString("hex");
}

function getTokenFromReq(req: Request): string | null {
  const auth = req.headers.authorization;
  if (auth && auth.startsWith("Bearer ")) return auth.slice(7);
  return null;
}

async function getUserFromReq(req: Request) {
  const token = getTokenFromReq(req);
  if (!token) return null;
  const userId = tokenStore.get(token);
  if (!userId) return null;
  return storage.getUser(userId);
}

// --- Sample apartment data for seeding ---
const sampleApartments = [
  {
    title: "Modern Loft in Downtown",
    description: "A stunning modern loft in the heart of downtown with floor-to-ceiling windows, exposed brick walls, and premium finishes. Walking distance to restaurants, shopping, and public transit.",
    price: 2400,
    currency: "USD",
    location: "Downtown, New York",
    bedrooms: 1,
    apartmentType: "1bed",
    amenities: ["parking", "gym", "rooftop", "doorman", "laundry"],
    photos: [
      "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800",
      "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800",
    ],
  },
  {
    title: "Cozy Studio Near University",
    description: "Perfect for students and young professionals. A cozy, well-maintained studio with all utilities included. Minutes from campus and public transit.",
    price: 950,
    currency: "USD",
    location: "Brooklyn, New York",
    bedrooms: 0,
    apartmentType: "studio",
    amenities: ["laundry", "furnished", "utilities included"],
    photos: [
      "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800",
      "https://images.unsplash.com/photo-1536376070602-b99659c28e42?w=800",
    ],
  },
  {
    title: "Spacious 2-Bedroom with Park View",
    description: "Enjoy stunning park views from this beautifully renovated 2-bedroom apartment. Features an open-plan kitchen, hardwood floors, and a private balcony.",
    price: 3200,
    currency: "USD",
    location: "Upper West Side, New York",
    bedrooms: 2,
    apartmentType: "2bed",
    amenities: ["parking", "balcony", "gym", "pet-friendly", "doorman"],
    photos: [
      "https://images.unsplash.com/photo-1493809842364-78817add7ffb?w=800",
      "https://images.unsplash.com/photo-1484154218962-a197022b5858?w=800",
    ],
  },
  {
    title: "Luxury Duplex in Tribeca",
    description: "Exceptional duplex with dramatic 20-ft ceilings, private terrace, chef's kitchen, and curated design throughout. A truly one-of-a-kind home in one of NYC's most sought-after neighborhoods.",
    price: 8500,
    currency: "USD",
    location: "Tribeca, New York",
    bedrooms: 3,
    apartmentType: "duplex",
    amenities: ["parking", "terrace", "gym", "concierge", "storage", "wine cellar"],
    photos: [
      "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=800",
      "https://images.unsplash.com/photo-1565183997392-2f6f122e5912?w=800",
    ],
  },
  {
    title: "Charming 1-Bed in Williamsburg",
    description: "Sun-drenched 1-bedroom in the heart of Williamsburg with original details, a large eat-in kitchen, and hardwood floors throughout. Near the L train and the best of Brooklyn.",
    price: 2100,
    currency: "USD",
    location: "Williamsburg, Brooklyn",
    bedrooms: 1,
    apartmentType: "1bed",
    amenities: ["laundry", "pet-friendly", "storage", "bike room"],
    photos: [
      "https://images.unsplash.com/photo-1469022563428-aa04fef9f5a2?w=800",
      "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800",
    ],
  },
  {
    title: "Furnished Studio with City Views",
    description: "Fully furnished studio with incredible skyline views from the 28th floor. Perfect for a professional relocating to the city. Includes high-speed internet and all utilities.",
    price: 1800,
    currency: "USD",
    location: "Midtown, New York",
    bedrooms: 0,
    apartmentType: "studio",
    amenities: ["furnished", "gym", "rooftop", "doorman", "utilities included", "high-speed internet"],
    photos: [
      "https://images.unsplash.com/photo-1574362848149-11496d93a7c7?w=800",
      "https://images.unsplash.com/photo-1554995207-c18c203602cb?w=800",
    ],
  },
  {
    title: "2-Bed Family Apartment in Astoria",
    description: "Bright and spacious 2-bedroom on a quiet, tree-lined block in Astoria. Renovated kitchen, two full baths, and a private yard. Minutes from the N/W train.",
    price: 2800,
    currency: "USD",
    location: "Astoria, Queens",
    bedrooms: 2,
    apartmentType: "2bed",
    amenities: ["private yard", "laundry", "pet-friendly", "parking", "security"],
    photos: [
      "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800",
      "https://images.unsplash.com/photo-1567767292278-a4f21aa2d36e?w=800",
    ],
  },
  {
    title: "Garden Duplex in Park Slope",
    description: "Beautiful garden-level duplex in coveted Park Slope. Features a private garden, working fireplace, and exposed brick. Steps from Prospect Park and the F/G trains.",
    price: 3800,
    currency: "USD",
    location: "Park Slope, Brooklyn",
    bedrooms: 2,
    apartmentType: "duplex",
    amenities: ["private garden", "fireplace", "laundry", "storage", "pet-friendly"],
    photos: [
      "https://images.unsplash.com/photo-1600585154526-990dced4db0d?w=800",
      "https://images.unsplash.com/photo-1600607686527-6fb886090705?w=800",
    ],
  },
];

async function seedApartments(landlordId: string, landlordName: string, landlordPhone: string, landlordEmail: string) {
  const existing = await storage.getAllApartments();
  if (existing.length > 0) return;

  for (const apt of sampleApartments) {
    await storage.createApartment({
      ...apt,
      landlordId,
      landlordName,
      landlordPhone,
      landlordEmail,
      isActive: true,
    } as InsertApartment);
  }
}

export async function registerRoutes(app: Express): Promise<Server> {
  // --- AUTH ---
  // Step 1: Initiate registration and send OTP to phone
  app.post("/api/auth/register-init", async (req: Request, res: Response) => {
    try {
      const { email, username, phone, password, role = "renter" } = req.body;
      if (!email || !username || !phone || !password) {
        return res.status(400).json({ error: "Email, username, phone, and password are required" });
      }

      const existingEmail = await storage.getUserByEmail(email);
      if (existingEmail) return res.status(409).json({ error: "Email already registered" });

      const existingUsername = await storage.getUserByUsername(username);
      if (existingUsername) return res.status(409).json({ error: "Username already taken" });

      // Generate and send OTP via Twilio
      const otpData = await createOTP(phone);
      
      res.json({ 
        message: "OTP sent to phone number",
        phone: phone,
        expiresIn: 300 // 5 minutes
      });
    } catch (err) {
      console.error("Register init error:", err);
      res.status(500).json({ error: "Failed to initiate registration" });
    }
  });

  // Resend OTP endpoint
  app.post("/api/auth/resend-otp", async (req: Request, res: Response) => {
    try {
      const { phone } = req.body;
      if (!phone) {
        return res.status(400).json({ error: "Phone number is required" });
      }

      // Check if resend is allowed
      if (!canResendOTP(phone)) {
        return res.status(429).json({ error: "Too many resend attempts or code expired. Try again later." });
      }

      // Resend OTP
      const otpData = await resendOTP(phone);
      if (!otpData) {
        return res.status(400).json({ error: "No OTP found for this phone number. Start registration again." });
      }

      res.json({ 
        message: "OTP resent to phone number",
        phone: phone,
        expiresIn: 300,
        resendCount: otpData.resendCount
      });
    } catch (err) {
      console.error("Resend OTP error:", err);
      res.status(500).json({ error: "Failed to resend OTP" });
    }
  });

  // Step 2: Verify OTP and complete registration
  app.post("/api/auth/verify-otp", async (req: Request, res: Response) => {
    try {
      const { email, username, phone, password, otp, fullName = "", role = "renter" } = req.body;
      if (!phone || !otp) {
        return res.status(400).json({ error: "Phone and OTP are required" });
      }

      // Verify OTP
      if (!verifyOTP(phone, otp)) {
        return res.status(400).json({ error: "Invalid or expired OTP" });
      }

      // Create user
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

      // Seed apartments if landlord
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

  // Legacy register endpoint (for backward compatibility, still requires phone)
  app.post("/api/auth/register", async (req: Request, res: Response) => {
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

      // Seed apartments if first landlord
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

  app.post("/api/auth/login", async (req: Request, res: Response) => {
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

  app.post("/api/auth/logout", async (req: Request, res: Response) => {
    const token = getTokenFromReq(req);
    if (token) tokenStore.delete(token);
    res.json({ success: true });
  });

  app.get("/api/auth/me", async (req: Request, res: Response) => {
    const user = await getUserFromReq(req);
    if (!user) return res.status(401).json({ error: "Unauthorized" });
    const { password: _, ...safeUser } = user;
    res.json(safeUser);
  });

  app.delete("/api/auth/me", async (req: Request, res: Response) => {
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

  // --- APARTMENTS ---
  app.get("/api/apartments", async (req: Request, res: Response) => {
    try {
      const all = await storage.getAllApartments();
      res.json(all);
    } catch (err) {
      res.status(500).json({ error: "Failed to fetch apartments" });
    }
  });

  app.get("/api/apartments/:id", async (req: Request, res: Response) => {
    try {
      const apt = await storage.getApartment(req.params.id);
      if (!apt) return res.status(404).json({ error: "Apartment not found" });
      res.json(apt);
    } catch (err) {
      res.status(500).json({ error: "Failed to fetch apartment" });
    }
  });

  app.post("/api/apartments", async (req: Request, res: Response) => {
    try {
      const user = await getUserFromReq(req);
      if (!user) return res.status(401).json({ error: "Unauthorized" });
      if (user.role !== "landlord") return res.status(403).json({ error: "Only landlords can list apartments" });

      const apt = await storage.createApartment({
        ...req.body,
        ownerId: user.id,
      });
      res.status(201).json(apt);
    } catch (err) {
      console.error("Create apartment error:", err);
      res.status(500).json({ error: "Failed to create apartment" });
    }
  });

  app.put("/api/apartments/:id", async (req: Request, res: Response) => {
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

  app.delete("/api/apartments/:id", async (req: Request, res: Response) => {
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

  // My apartments (landlord)
  app.get("/api/my-apartments", async (req: Request, res: Response) => {
    try {
      const user = await getUserFromReq(req);
      if (!user) return res.status(401).json({ error: "Unauthorized" });
      const apts = await storage.getApartmentsByLandlord(user.id);
      res.json(apts);
    } catch (err) {
      res.status(500).json({ error: "Failed to fetch your apartments" });
    }
  });

  // --- AI MATCHING ---
  app.post("/api/apartments/match", async (req: Request, res: Response) => {
    try {
      const { location, budget, bedrooms, apartmentType, preferences } = req.body;
      const all = await storage.getAllApartments();

      if (all.length === 0) {
        return res.json({ apartments: [], explanation: "No apartments available yet." });
      }

      const apartmentList = all
        .map((a) => `ID: ${a.id} | ${a.title} | ${a.location} | $${a.price}/mo | ${a.bedrooms} bed | ${a.apartmentType} | Amenities: ${(a.amenities as string[]).join(", ")}`)
        .join("\n");

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

      const response = await openai.chat.completions.create({
        model: "gpt-5.1",
        messages: [{ role: "user", content: prompt }],
        max_completion_tokens: 1024,
        response_format: { type: "json_object" },
      });

      const content = response.choices[0]?.message?.content || "{}";
      const parsed = JSON.parse(content);
      const matchIds: string[] = parsed.matches || [];

      const matchedApts = matchIds
        .map((id) => all.find((a) => a.id === id))
        .filter(Boolean);

      res.json({ apartments: matchedApts, explanation: parsed.explanation || "" });
    } catch (err) {
      console.error("AI match error:", err);
      res.status(500).json({ error: "AI matching failed" });
    }
  });

  // --- SAVED APARTMENTS ---
  app.get("/api/saved", async (req: Request, res: Response) => {
    try {
      const user = await getUserFromReq(req);
      if (!user) return res.status(401).json({ error: "Unauthorized" });
      const saved = await storage.getSavedApartmentsByUser(user.id);
      res.json(saved);
    } catch (err) {
      res.status(500).json({ error: "Failed to fetch saved apartments" });
    }
  });

  app.post("/api/saved/:apartmentId", async (req: Request, res: Response) => {
    try {
      const user = await getUserFromReq(req);
      if (!user) return res.status(401).json({ error: "Unauthorized" });
      const saved = await storage.saveApartment(user.id, req.params.apartmentId);
      res.status(201).json(saved);
    } catch (err) {
      res.status(500).json({ error: "Failed to save apartment" });
    }
  });

  app.delete("/api/saved/:apartmentId", async (req: Request, res: Response) => {
    try {
      const user = await getUserFromReq(req);
      if (!user) return res.status(401).json({ error: "Unauthorized" });
      await storage.unsaveApartment(user.id, req.params.apartmentId);
      res.status(204).send();
    } catch (err) {
      res.status(500).json({ error: "Failed to remove saved apartment" });
    }
  });

  app.get("/api/saved/:apartmentId/status", async (req: Request, res: Response) => {
    try {
      const user = await getUserFromReq(req);
      if (!user) return res.json({ saved: false });
      const saved = await storage.isApartmentSaved(user.id, req.params.apartmentId);
      res.json({ saved });
    } catch (err) {
      res.status(500).json({ error: "Failed to check saved status" });
    }
  });

  // --- AI CHAT ASSISTANT (streaming) ---
  app.post("/api/chat", async (req: Request, res: Response) => {
    try {
      const user = await getUserFromReq(req);
      if (!user) return res.status(401).json({ error: "Unauthorized" });

      const { message } = req.body;
      if (!message) return res.status(400).json({ error: "Message required" });

      // Save user message
      await storage.addChatMessage(user.id, "user", message);

      // Get history
      const history = await storage.getChatHistory(user.id);
      const messages = history.map((m) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      }));

      // Get apartment context
      const apts = await storage.getAllApartments();
      const aptContext = apts
        .slice(0, 20)
        .map((a) => `${a.title} in ${a.location} - $${a.price}/mo, ${a.bedrooms} bed ${a.apartmentType}`)
        .join("\n");

      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache, no-transform");
      res.setHeader("X-Accel-Buffering", "no");
      res.flushHeaders();

      const stream = await openai.chat.completions.create({
        model: "gpt-5.1",
        messages: [
          {
            role: "system",
            content: `You are Vacay AI, a friendly apartment-finding assistant. Help users find their perfect apartment by asking about their location preferences, budget, number of bedrooms, apartment type (studio, 1-bed, 2-bed, duplex), and any special requirements like parking, furnished, or pet-friendly.

Available apartments in our database:
${aptContext}

Be conversational, helpful, and specific. If the user has described their needs, suggest relevant apartments from the list above. Keep responses concise and friendly.`,
          },
          ...messages,
        ],
        stream: true,
        max_completion_tokens: 512,
      });

      let fullContent = "";
      for await (const chunk of stream) {
        const content = chunk.choices[0]?.delta?.content || "";
        if (content) {
          fullContent += content;
          res.write(`data: ${JSON.stringify({ content })}\n\n`);
        }
      }

      // Save assistant response
      await storage.addChatMessage(user.id, "assistant", fullContent);

      res.write(`data: [DONE]\n\n`);
      res.end();
    } catch (err) {
      console.error("Chat error:", err);
      if (!res.headersSent) {
        res.status(500).json({ error: "Chat failed" });
      }
    }
  });

  app.get("/api/chat/history", async (req: Request, res: Response) => {
    try {
      const user = await getUserFromReq(req);
      if (!user) return res.status(401).json({ error: "Unauthorized" });
      const history = await storage.getChatHistory(user.id);
      res.json(history);
    } catch (err) {
      res.status(500).json({ error: "Failed to fetch chat history" });
    }
  });

  app.delete("/api/chat/history", async (req: Request, res: Response) => {
    try {
      const user = await getUserFromReq(req);
      if (!user) return res.status(401).json({ error: "Unauthorized" });
      await storage.clearChatHistory(user.id);
      res.status(204).send();
    } catch (err) {
      res.status(500).json({ error: "Failed to clear chat history" });
    }
  });

  // --- MESSAGES (User-to-User Chat) ---
  app.post("/api/messages", async (req: Request, res: Response) => {
    try {
      const user = await getUserFromReq(req);
      if (!user) return res.status(401).json({ error: "Unauthorized" });
      const { receiverId, apartmentId, message } = req.body;
      if (!receiverId || !apartmentId || !message) return res.status(400).json({ error: "Missing required fields" });
      
      // Filter message for contact info and external links
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

  app.get("/api/messages/:apartmentId/:userId", async (req: Request, res: Response) => {
    try {
      const user = await getUserFromReq(req);
      if (!user) return res.status(401).json({ error: "Unauthorized" });
      const conversation = await storage.getConversation(user.id, req.params.userId, req.params.apartmentId);
      res.json(conversation);
    } catch (err) {
      res.status(500).json({ error: "Failed to fetch conversation" });
    }
  });

  // --- RENT REQUESTS ---
  app.post("/api/requests", async (req: Request, res: Response) => {
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

  app.get("/api/requests/:apartmentId", async (req: Request, res: Response) => {
    try {
      const requests = await storage.getRentRequests(req.params.apartmentId);
      res.json(requests);
    } catch (err) {
      res.status(500).json({ error: "Failed to fetch requests" });
    }
  });

  app.patch("/api/requests/:id/approve", async (req: Request, res: Response) => {
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

  // --- PAYMENTS & TRANSACTIONS ---
  app.post("/api/transactions", async (req: Request, res: Response) => {
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

  app.patch("/api/transactions/:id/complete", async (req: Request, res: Response) => {
    try {
      await storage.completeTransaction(req.params.id);
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: "Failed to complete transaction" });
    }
  });

  app.get("/api/transactions", async (req: Request, res: Response) => {
    try {
      const user = await getUserFromReq(req);
      if (!user) return res.status(401).json({ error: "Unauthorized" });
      const transactions = await storage.getUserTransactions(user.id);
      res.json(transactions);
    } catch (err) {
      res.status(500).json({ error: "Failed to fetch transactions" });
    }
  });

  // --- WALLETS ---
  app.get("/api/wallet/balance", async (req: Request, res: Response) => {
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

  // --- NOTIFICATIONS ---
  app.get("/api/notifications", async (req: Request, res: Response) => {
    try {
      const user = await getUserFromReq(req);
      if (!user) return res.status(401).json({ error: "Unauthorized" });
      const notifications = await storage.getUserNotifications(user.id);
      res.json(notifications);
    } catch (err) {
      res.status(500).json({ error: "Failed to fetch notifications" });
    }
  });

  app.patch("/api/notifications/:id/read", async (req: Request, res: Response) => {
    try {
      await storage.markNotificationAsRead(req.params.id);
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: "Failed to mark notification as read" });
    }
  });

  // --- MEDIA UPLOADS ---
  app.post("/api/apartments/:id/photos", async (req: Request, res: Response) => {
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

  app.post("/api/apartments/:id/videos", async (req: Request, res: Response) => {
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

  app.delete("/api/apartments/:id/photos/:photoIndex", async (req: Request, res: Response) => {
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

  app.delete("/api/apartments/:id/videos/:videoIndex", async (req: Request, res: Response) => {
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

  // --- OWNER VERIFICATION ---
  app.post("/api/verification/submit", async (req: Request, res: Response) => {
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

  app.get("/api/verification/status", async (req: Request, res: Response) => {
    try {
      const user = await getUserFromReq(req);
      if (!user) return res.status(401).json({ error: "Unauthorized" });
      const verification = await storage.getVerification(user.id);
      res.json({ verification: verification || null, isVerified: user.isVerified, status: user.verificationStatus });
    } catch (err) {
      res.status(500).json({ error: "Failed to fetch verification status" });
    }
  });

  app.get("/api/admin/verifications/pending", async (req: Request, res: Response) => {
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

  app.patch("/api/admin/verifications/:id/approve", async (req: Request, res: Response) => {
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

  app.patch("/api/admin/verifications/:id/reject", async (req: Request, res: Response) => {
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

  // --- TERMS AND CONDITIONS ---
  app.get("/api/terms-and-conditions/latest", async (req: Request, res: Response) => {
    try {
      const latestTC = await storage.getLatestTermsAndConditions();
      res.json({ termsAndConditions: latestTC || null });
    } catch (err) {
      res.status(500).json({ error: "Failed to fetch terms and conditions" });
    }
  });

  app.post("/api/terms-and-conditions/accept", async (req: Request, res: Response) => {
    try {
      const user = await getUserFromReq(req);
      if (!user) return res.status(401).json({ error: "Unauthorized" });

      const { termsVersion } = req.body;
      if (!termsVersion) return res.status(400).json({ error: "termsVersion is required" });

      await storage.acceptTermsAndConditions(user.id, termsVersion);
      res.json({ success: true, message: "Terms and conditions accepted" });
    } catch (err) {
      res.status(500).json({ error: "Failed to accept terms and conditions" });
    }
  });

  // --- USER REPORTS ---
  app.post("/api/users/:userId/report", async (req: Request, res: Response) => {
    try {
      const user = await getUserFromReq(req);
      if (!user) return res.status(401).json({ error: "Unauthorized" });

      const reportedUserId = req.params.userId;
      if (reportedUserId === user.id) return res.status(400).json({ error: "Cannot report yourself" });

      const { reason, description } = req.body;
      if (!reason || !description) return res.status(400).json({ error: "reason and description are required" });

      const report = await storage.reportUser(user.id, reportedUserId, reason, description);
      await storage.createNotification(user.id, `Your report against user has been submitted for review`, "report");
      res.status(201).json(report);
    } catch (err) {
      console.error("Report error:", err);
      res.status(500).json({ error: "Failed to submit report" });
    }
  });

  app.get("/api/admin/reports/pending", async (req: Request, res: Response) => {
    try {
      const user = await getUserFromReq(req);
      if (!user) return res.status(401).json({ error: "Unauthorized" });
      if (user.role !== "admin") return res.status(403).json({ error: "Only admins can view reports" });

      const reports = await storage.getPendingUserReports();
      res.json(reports);
    } catch (err) {
      res.status(500).json({ error: "Failed to fetch reports" });
    }
  });

  // --- USER BLOCKING ---
  app.post("/api/users/:userId/block", async (req: Request, res: Response) => {
    try {
      const user = await getUserFromReq(req);
      if (!user) return res.status(401).json({ error: "Unauthorized" });

      const blockedUserId = req.params.userId;
      if (blockedUserId === user.id) return res.status(400).json({ error: "Cannot block yourself" });

      const { reason = "User blocked" } = req.body;
      await storage.blockUser(user.id, blockedUserId, reason);
      await storage.createNotification(user.id, `You have blocked this user`, "system");
      res.json({ success: true, message: "User blocked successfully" });
    } catch (err) {
      res.status(500).json({ error: "Failed to block user" });
    }
  });

  app.delete("/api/users/:userId/unblock", async (req: Request, res: Response) => {
    try {
      const user = await getUserFromReq(req);
      if (!user) return res.status(401).json({ error: "Unauthorized" });

      const blockedUserId = req.params.userId;
      await storage.unblockUser(user.id, blockedUserId);
      res.json({ success: true, message: "User unblocked successfully" });
    } catch (err) {
      res.status(500).json({ error: "Failed to unblock user" });
    }
  });

  app.get("/api/users/:userId/is-blocked", async (req: Request, res: Response) => {
    try {
      const user = await getUserFromReq(req);
      if (!user) return res.status(401).json({ error: "Unauthorized" });

      const targetUserId = req.params.userId;
      const isBlocked = await storage.isUserBlocked(user.id, targetUserId);
      res.json({ isBlocked });
    } catch (err) {
      res.status(500).json({ error: "Failed to check block status" });
    }
  });

  // Register AI integrations
  registerImageRoutes(app);

  const httpServer = createServer(app);
  return httpServer;
}
