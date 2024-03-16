import jwt from "jsonwebtoken";
import { createError } from "./createError.js";

export const verifyToken = (req, res, next) => {
  const accessToken = req.cookies.access_token;

  if (!accessToken) {
    return next(createError(400, "You are not logged in"));
  }

  jwt.verify(
    accessToken,
    process.env.ACCESS_TOKEN_JWT_SECRET_KEY,
    (err, user) => {
      if (err) {
        return next(createError(400, "access token does not match"));
      }

      req.user = user;
      next();
    }
  );
};

export const verifyAdmin = (req, rs, next) => {
  verifyToken(req, res, () => {
    if (!req.user.isAdmin) {
      return next(createError(400, "You are not admin"));
    }

    next();
  });
};
