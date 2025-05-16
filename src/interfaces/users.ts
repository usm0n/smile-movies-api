import { Request } from "express";

export interface DecodedUser {
  uid: string;
  isAdmin: boolean;
  isVerified: boolean;
}

export interface DecodedUserRequest extends Request {
  uid: string;
  isAdmin: boolean;
  isVerified: boolean;
}

export interface Watchlist {
  poster: string;
  type: string;
  id: string;
}

export interface Device {
  deviceName: string;
  deviceType: string;
  deviceId: string;
  isActive: boolean;
  createdAt: string;
  lastLogin: string;
}

export interface User {
  id: string;
  profilePic?: string;
  firstname: string;
  lastname?: string;
  email: string;
  password: string;
  createdAt: string;
  lastLogin: string;
  isVerified: boolean;
  isAdmin: boolean;
  isBanned: boolean;
  watchlist: Watchlist[];
  favorites: Watchlist[];
  recentlyWatched: Watchlist[];
  devices: Device[];
  loginType: string;
}

export interface UserVerifyToken {
  uid: string;
  token: string;
}

export interface GoogleUserResponse {}
