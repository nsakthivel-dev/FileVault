import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Express, Request, Response, NextFunction } from "express";
import session from "express-session";
import createMemoryStore from "memorystore";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { storage } from "./storage";
import { UserRecord } from "@shared/schema";
import connectPg from "connect-pg-simple";
import { pool } from "./db";
import { getSupabaseAdmin } from "./supabase";

declare global {
  namespace Express {
    interface User extends UserRecord {}
  }
}

const scryptAsync = promisify(scrypt);
const MemoryStore = createMemoryStore(session);
const PostgresStore = connectPg(session);

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

export async function comparePasswords(supplied: string, stored: string): Promise<boolean> {
  try {
    const [hashed, salt] = stored.split(".");
    if (!hashed || !salt) return false;
    const hashedBuf = Buffer.from(hashed, "hex");
    const suppliedBuf = (await scryptAsync(supplied, salt, 64)) as Buffer;
    return timingSafeEqual(hashedBuf, suppliedBuf);
  } catch {
    return false;
  }
}

export function setupAuth(app: Express) {
  const sessionStore = pool
    ? new PostgresStore({ pool, createTableIfMissing: true })
    : new MemoryStore({ checkPeriod: 86400000 });

  const sessionSettings: session.SessionOptions = {
    secret: process.env.SESSION_SECRET || "filevault-secure-session-key",
    resave: false,
    saveUninitialized: false,
    store: sessionStore,
    cookie: {
      secure: false,
      maxAge: 30 * 24 * 60 * 60 * 1000,
      sameSite: "lax",
    },
  };

  if (app.get("env") === "production") {
    app.set("trust proxy", 1);
  }

  app.use(session(sessionSettings));
  app.use(passport.initialize());
  app.use(passport.session());

  // Bearer Token: Supabase Auth JWT Authentication middleware
  app.use(async (req: Request, res: Response, next: NextFunction) => {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith("Bearer ")) {
      const token = authHeader.substring(7);

      // 1. Supabase Auth token verification
      const supabase = getSupabaseAdmin();
      if (supabase) {
        try {
          const { data: { user: sbUser }, error } = await supabase.auth.getUser(token);
          if (!error && sbUser) {
            let user = await storage.getUser(sbUser.id);
            if (!user) {
              user = await storage.createUser({
                id: sbUser.id,
                username: (sbUser.user_metadata as any)?.username || sbUser.email?.split("@")[0] || sbUser.id,
                email: sbUser.email,
                name: (sbUser.user_metadata as any)?.name || (sbUser.user_metadata as any)?.full_name || sbUser.email,
                passwordHash: "supabase_auth_managed",
              });
            }
            req.user = user;
            if (req.session && !(req.session as any).passport?.user) {
              (req.session as any).passport = { user: user.id };
            }
            return next();
          }
        } catch (err) {
          // Continue to next check
        }
      }

      // 2. Direct user ID token check (for tests & local dev)
      const user = await storage.getUser(token);
      if (user) {
        req.user = user;
        if (req.session && !(req.session as any).passport?.user) {
          (req.session as any).passport = { user: user.id };
        }
        return next();
      }
    }
    next();
  });

  passport.use(
    new LocalStrategy(async (username, password, done) => {
      try {
        const supabase = getSupabaseAdmin();
        if (supabase) {
          const emailToTest = username.includes("@") ? username : `${username}@filevault.local`;
          try {
            const { data: sbAuth, error: sbErr } = await supabase.auth.signInWithPassword({
              email: emailToTest,
              password,
            });

            if (!sbErr && sbAuth?.user) {
              const sbUser = sbAuth.user;
              let user = await storage.getUser(sbUser.id);
              if (!user) {
                user = await storage.createUser({
                  id: sbUser.id,
                  username: (sbUser.user_metadata as any)?.username || sbUser.email || username,
                  email: sbUser.email,
                  name: (sbUser.user_metadata as any)?.name || (sbUser.user_metadata as any)?.full_name || sbUser.email || username,
                  passwordHash: await hashPassword(password),
                });
              }
              await storage.ensureUserFolder(sbUser.id);
              const { password: _, ...safeUser } = user as any;
              return done(null, safeUser);
            }
          } catch (sbErr) {
            // Continue to local storage fallback
          }
        }

        // Local fallback (for tests and offline local development)
        const user = await storage.getUserByUsername(username);
        if (user && user.password && (await comparePasswords(password, user.password))) {
          const { password: _, ...safeUser } = user;
          return done(null, safeUser);
        }

        return done(null, false, { message: "Invalid username or password" });
      } catch (err) {
        return done(err);
      }
    })
  );

  passport.serializeUser((user, done) => done(null, user.id));
  passport.deserializeUser(async (id: string, done) => {
    try {
      const user = await storage.getUser(id);
      done(null, user || false);
    } catch (err) {
      done(err);
    }
  });

  app.post("/api/register", async (req, res, next) => {
    try {
      const { username, password, email, name } = req.body;
      if (!username || !password) {
        return res.status(400).json({ message: "Username and password are required" });
      }

      const existingUser = await storage.getUserByUsername(username);
      if (existingUser) {
        return res.status(400).json({ message: "Username already exists" });
      }

      let createdId: string | undefined = undefined;
      const supabase = getSupabaseAdmin();
      if (supabase) {
        const userEmail = email || (username.includes("@") ? username : `${username}@filevault.local`);
        try {
          const { data: sbUser, error: sbErr } = await supabase.auth.admin.createUser({
            email: userEmail,
            password,
            email_confirm: true,
            user_metadata: { name: name || username, username },
          });
          if (sbErr) {
            if (sbErr.message.toLowerCase().includes("already") || sbErr.status === 422) {
              return res.status(400).json({ message: "Username already exists" });
            }
          } else if (sbUser?.user) {
            createdId = sbUser.user.id;
          }
        } catch (sbErr: any) {
          if (sbErr?.message?.toLowerCase().includes("already")) {
            return res.status(400).json({ message: "Username already exists" });
          }
        }
      }

      const user = await storage.createUser({
        id: createdId,
        username,
        email: email || (username.includes("@") ? username : `${username}@filevault.local`),
        name: name || username,
        passwordHash: await hashPassword(password),
      });

      // Record audit log
      await storage.createAuditLog({
        userId: user.id,
        action: "LOGIN",
        details: "User registered and logged in",
        timestamp: new Date().toISOString(),
        status: "SUCCESS",
      });

      req.login(user, (err) => {
        if (err) return next(err);
        res.status(201).json(user);
      });
    } catch (err) {
      next(err);
    }
  });

  app.post("/api/login", passport.authenticate("local"), async (req, res) => {
    if (req.user) {
      // Warm up user documents synchronously before completing login so documents appear instantly
      try {
        await storage.getDocuments(req.user.id);
      } catch (err: any) {
        console.warn("[Auth] Notice warming up user documents on login:", err?.message);
      }
      storage.getAuditLogs(req.user.id).catch(() => {});

      await storage.createAuditLog({
        userId: req.user.id,
        action: "LOGIN",
        details: "User logged in successfully",
        timestamp: new Date().toISOString(),
        status: "SUCCESS",
      });
    }
    res.status(200).json(req.user);
  });

  app.post("/api/logout", (req, res, next) => {
    req.logout((err) => {
      if (err) return next(err);
      res.status(200).json({ message: "Logged out" });
    });
  });

  app.get("/api/user", (req, res) => {
    if (!req.user && !req.isAuthenticated()) return res.sendStatus(401);
    res.status(200).json(req.user);
  });
}