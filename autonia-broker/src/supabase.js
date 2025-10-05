// supabase.js - Supabase client and auth utilities
import { createClient } from "@supabase/supabase-js";

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.warn("⚠️  Supabase credentials not configured. Authentication will be disabled.");
}

export const supabase = supabaseUrl && supabaseServiceKey ? createClient(supabaseUrl, supabaseServiceKey) : null;

/**
 * Middleware to verify Supabase JWT token
 */
export async function authenticateUser(req, res, next) {
  // If Supabase not configured, allow requests (development mode)
  if (!supabase) {
    console.log("⚠️  Authentication disabled - Supabase not configured");
    req.user = { id: "anonymous", email: "anonymous@local" };
    return next();
  }

  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({
      error: "Unauthorized",
      message: "Missing or invalid authorization header",
    });
  }

  const token = authHeader.replace("Bearer ", "");

  try {
    // Verify JWT token
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser(token);

    if (error || !user) {
      return res.status(401).json({
        error: "Unauthorized",
        message: "Invalid or expired token",
      });
    }

    // Attach user to request
    req.user = user;
    next();
  } catch (err) {
    console.error("Auth error:", err);
    return res.status(401).json({
      error: "Unauthorized",
      message: "Authentication failed",
    });
  }
}

/**
 * Record deployment in database
 */
export async function recordDeployment(deploymentData) {
  if (!supabase) {
    console.log("⚠️  Deployment recording disabled - Supabase not configured");
    return null;
  }

  try {
    const { data, error } = await supabase
      .from("deployments")
      .insert({
        user_id: deploymentData.userId,
        user_email: deploymentData.userEmail,
        service_name: deploymentData.serviceName,
        region: deploymentData.region,
        status: deploymentData.status,
        operation_id: deploymentData.operationId,
        url: deploymentData.url,
        log_url: deploymentData.logUrl,
        public_access: deploymentData.publicAccess,
        deployed_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      console.error("Failed to record deployment:", error);
      return null;
    }

    return data;
  } catch (err) {
    console.error("Error recording deployment:", err);
    return null;
  }
}

/**
 * Update deployment status
 */
export async function updateDeploymentStatus(operationId, status, url = null) {
  if (!supabase) {
    return null;
  }

  try {
    const updateData = {
      status,
      updated_at: new Date().toISOString(),
    };

    if (url) {
      updateData.url = url;
    }

    const { data, error } = await supabase.from("deployments").update(updateData).eq("operation_id", operationId).select().single();

    if (error) {
      console.error("Failed to update deployment:", error);
      return null;
    }

    return data;
  } catch (err) {
    console.error("Error updating deployment:", err);
    return null;
  }
}

/**
 * Get user's deployments
 */
export async function getUserDeployments(userId, limit = 50) {
  if (!supabase) {
    return [];
  }

  try {
    const { data, error } = await supabase
      .from("deployments")
      .select("*")
      .eq("user_id", userId)
      .order("deployed_at", { ascending: false })
      .limit(limit);

    if (error) {
      console.error("Failed to get deployments:", error);
      return [];
    }

    return data || [];
  } catch (err) {
    console.error("Error getting deployments:", err);
    return [];
  }
}
