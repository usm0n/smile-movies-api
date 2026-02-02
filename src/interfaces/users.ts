import { Request } from "express";

export interface DecodedUser {
  uid: string;
  isAdmin: boolean;
  isVerified: boolean;
  user: User;
}

export interface DecodedUserRequest extends Request {
  uid: string;
  isAdmin: boolean;
  isVerified: boolean;
  user: User;
}

export interface Watchlist {
  poster: string;
  type: string;
  status: string;
  duration?: number;
  currentTime?: number;
  id: string;
  season?: number;
  episode?: number;
}

export interface Location {
  latitude: number;
  longitude: number;
  continent: string;
  country: string;
  state: string;
  county: string;
  road: string;
  lastSeen: string;
}

export interface Device {
  deviceName: string;
  deviceType: string;
  deviceId: string;
  isActive: boolean;
  createdAt: string;
  lastLogin: string;
  location: Location;
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
