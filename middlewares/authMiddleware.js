const jwt = require('jsonwebtoken');
const dotenv = require('dotenv');

dotenv.config();
const { JWT_SECRET } = process.env;

const authMiddleware = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'Authorization token missing or malformed.' });
    }

    const token = authHeader.split(' ')[1];

    jwt.verify(token, JWT_SECRET, (err, decoded) => {
      if (err) {
        return res.status(403).json({ message: 'Invalid or expired token.' });
      }

      req.user = decoded; // Attaching user data to request object
      next();
    });
  } catch (error) {
    res.status(500).json({ message: 'Internal Server Error.' });
  }
};

module.exports = authMiddleware;
