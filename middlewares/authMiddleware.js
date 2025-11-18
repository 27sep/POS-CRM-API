// middlewares/authMiddleware.js
const jwt = require("jsonwebtoken");
const dotenv = require("dotenv");

dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET;

// Role permissions
const rolePermissions = {
  admin: {
    canViewAllCalls: true,
    canViewAllSMS: true,
    canDeleteCalls: true,
    canEditUsers: true,
    canViewDashboard: true,
  },
  sales_manager: {
    canViewAssignedCalls: true,
    canViewAssignedSMS: true,
    canDeleteCalls: false,
    canEditUsers: false,
    canViewDashboard: true,
  },
};

// Helper: return permissions for the role
const getPermissions = (role) => rolePermissions[role] || {};

// ------------------------------
// AUTH MIDDLEWARE
// ------------------------------
const authMiddleware = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        message: "Authorization token missing or malformed.",
      });
    }

    const token = authHeader.split(" ")[1];

    jwt.verify(token, JWT_SECRET, (err, decoded) => {
      if (err) {
        return res.status(403).json({
          success: false,
          message: "Invalid or expired token.",
        });
      }

      // Fallback defaults in case token is missing info
      const role = decoded.role || "sales_manager"; 
      const assigned_numbers = decoded.assigned_numbers || [];

      // Attach user info to request
      req.user = {
        userId: decoded.userId,
        role,
        assigned_numbers,
        permissions: getPermissions(role),
      };

      // ✅ DEBUG LOGS
      console.log("🔹 USER FROM JWT:", req.user);

      next();
    });
  } catch (err) {
    console.error("Auth Middleware Error:", err);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};

// ------------------------------
// ROLE CHECK MIDDLEWARE
// ------------------------------
const authorizeRoles = (...allowedRoles) => {
  return (req, res, next) => {
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: "Access denied. Insufficient role permissions.",
      });
    }
    next();
  };
};

module.exports = {
  authMiddleware,
  authorizeRoles,
};
