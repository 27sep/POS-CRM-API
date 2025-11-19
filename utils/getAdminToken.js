// Get a server-side stored admin token (from .env)
const getAdminToken = () => {
  const token = process.env.ADMIN_JWT_TOKEN;
  if (!token) throw new Error("Admin JWT token is missing in environment variables");
  return token;
};

module.exports = getAdminToken;
