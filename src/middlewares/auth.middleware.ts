import { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { DecodedUser, DecodedUserRequest, User } from "../interfaces/users";
import { Message } from "../interfaces/messages";

const secretKey = process.env.JWT_SECRET || "";

export const verifyToken = (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const token = req.cookies.authToken
  if (!token) {
    res.status(401).json({ message: "No token provided user" } as Message);
  } else {
    try {
      const decoded = jwt.verify(token, secretKey) as DecodedUser;

      (req as DecodedUserRequest).uid = decoded.uid;
      next();
    } catch (error) {
      res.status(401).json({ message: "Invalid token" } as Message);
    }
  }
};

export const verifyAdminToken = (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const token = req.cookies.authToken

    if (!token) {
      res.status(401).json({ message: "No token provided admin" } as Message);
    } else {
      const decoded = jwt.verify(token, secretKey) as DecodedUser;
      if (!decoded.isAdmin) {
        res.status(403).json({
          message: "Access denied. Admin privileges required",
        } as Message);
      } else {
        (req as DecodedUserRequest).uid = decoded.uid;
        next();
      }
    }
  } catch (error) {
    res.status(401).json({ message: "Invalid token" } as Message);
  }
};
