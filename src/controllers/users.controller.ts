import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  updateDoc,
  where,
} from "firebase/firestore";
import { db } from "../config";
import { Request, Response } from "express";
import { verifyAdminToken, verifyToken } from "../middlewares/auth.middleware";
import { ErrorMSG, Message } from "../interfaces/messages";
import {
  DecodedUser,
  DecodedUserRequest,
  User,
  UserVerifyToken,
  Watchlist,
} from "../interfaces/users";
import bcrypt from "bcrypt";
import { getFormattedDateAndTime } from "../utils/defaults";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import { sendMail } from "../utils/sendMail";
import "dotenv/config";

const usersCollection = collection(db, "users");
const tokensCollection = collection(db, "verifyTokens");
const resetTokensCollection = collection(db, "resetTokens");

export const getAllUsers = [
  verifyAdminToken,
  async (req: Request, res: Response) => {
    try {
      const usersQuery = query(usersCollection, orderBy("createdAt", "desc"));
      const usersDocs = await getDocs(usersQuery);

      if (usersDocs.empty) {
        res.status(404).json({ message: "No users found" } as Message);
      } else {
        const users = usersDocs.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        res.status(200).json(users as User[]);
      }
    } catch (error: any) {
      res
        .status(500)
        .json({ message: "Internal server error", error: error.message } as
          | Message
          | ErrorMSG);
    }
  },
];

export const getUserById = [
  verifyAdminToken,
  async (req: Request, res: Response) => {
    try {
      const uid = req.params.id;
      const user = await getDoc(doc(usersCollection, uid));
      if (!user.exists()) {
        res.status(404).json({ message: "User not found" } as Message);
      } else {
        res.status(200).json({ id: user.id, ...user.data() } as User);
      }
    } catch (error: any) {
      res
        .status(500)
        .json({ message: "Internal server error", error: error.message } as
          | Message
          | ErrorMSG);
    }
  },
];

export const getUserByEmail = [
  verifyAdminToken,
  async (req: Request, res: Response) => {
    try {
      const email = req.params.email;
      const usersQuery = query(usersCollection, where("email", "==", email));
      const usersDocs = await getDocs(usersQuery);
      if (usersDocs.empty) {
        res.status(404).json({ message: "User not found" } as Message);
      } else {
        const user = usersDocs.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }))[0];
        res.status(200).json(user as User);
      }
    } catch (error: any) {
      res
        .status(500)
        .json({ message: "Internal server error", error: error.message } as
          | Message
          | ErrorMSG);
    }
  },
];

export const getMyself = [
  verifyToken,
  async (req: Request, res: Response) => {
    try {
      const uid = (req as DecodedUserRequest).uid;
      const user = await getDoc(doc(usersCollection, uid));
      if (!user.exists()) {
        res.status(404).json({ message: "User not found" } as Message);
      } else {
        res.status(200).json({ id: user.id, ...user.data() } as User);
      }
    } catch (error: any) {
      res
        .status(500)
        .json({ message: "Internal server error", error: error.message } as
          | Message
          | ErrorMSG);
    }
  },
];
export const updateUserById = [
  verifyAdminToken,
  async (req: Request, res: Response) => {
    try {
      const { firstname, lastname, email, password }: User = req.body;
      const uid = req.params.id;
      const userDoc = doc(usersCollection, uid);
      const user = await getDoc(userDoc);
      if (!user.exists()) {
        res.status(404).json({ message: "User not found" } as Message);
      } else {
        let hashedPassword;
        if (password && password !== user.data().password) {
          const salt = await bcrypt.genSalt(10);
          hashedPassword = await bcrypt.hash(password, salt);
        }
        if (email && email !== user.data().email) {
          const user = await getDocs(
            query(usersCollection, where("email", "==", email))
          );
          if (!user.empty) {
            return res
              .status(409)
              .json({ message: "User already exists" } as Message);
          }
        }
        await updateDoc(userDoc, {
          firstname,
          lastname: lastname || "",
          email:
            email && email !== user.data().email ? email : user.data().email,
          password:
            password && password !== user.data().password
              ? hashedPassword
              : user.data().password,
          isVerified:
            email && email !== user.data().email
              ? false
              : user.data().isVerified,
        } as Partial<User>);
        res.status(200).json({ id: user.id, ...req.body } as User);
      }
    } catch (error: any) {
      res
        .status(500)
        .json({ message: "Internal server error", error: error.message } as
          | Message
          | ErrorMSG);
    }
  },
];

export const updateUserByEmail = [
  verifyAdminToken,
  async (req: Request, res: Response) => {
    try {
      const { firstname, lastname, email, password }: User = req.body;
      const currentEmail = req.params.email;
      const usersQuery = query(
        usersCollection,
        where("email", "==", currentEmail)
      );
      const usersDocs = await getDocs(usersQuery);
      if (usersDocs.empty) {
        res.status(404).json({ message: "User not found" } as Message);
      } else {
        const userDoc = usersDocs.docs[0].ref;
        let hashedPassword;
        if (password && password !== usersDocs.docs[0].data().password) {
          const salt = await bcrypt.genSalt(10);
          hashedPassword = await bcrypt.hash(password, salt);
        }
        if (email && email !== usersDocs.docs[0].data().email) {
          const user = await getDocs(
            query(usersCollection, where("email", "==", email))
          );
          if (!user.empty) {
            return res
              .status(409)
              .json({ message: "User already exists" } as Message);
          }
        }
        await updateDoc(userDoc, {
          firstname,
          lastname: lastname || "",
          email:
            email && email !== usersDocs.docs[0].data().email
              ? email
              : usersDocs.docs[0].data().email,
          password:
            password && password !== usersDocs.docs[0].data().password
              ? hashedPassword
              : usersDocs.docs[0].data().password,
          isVerified:
            email && email !== usersDocs.docs[0].data().email
              ? false
              : usersDocs.docs[0].data().isVerified,
        } as Partial<User>);
        res.status(200).json({ id: usersDocs.docs[0].id, ...req.body } as User);
      }
    } catch (error: any) {
      res
        .status(500)
        .json({ message: "Internal server error", error: error.message } as
          | Message
          | ErrorMSG);
    }
  },
];

export const updateMyself = [
  verifyToken,
  async (req: Request, res: Response) => {
    try {
      const { firstname, lastname, email, password }: User = req.body;
      const uid = (req as DecodedUserRequest).uid;
      const userDoc = doc(usersCollection, uid);
      const user = await getDoc(userDoc);
      if (!user.exists()) {
        res.status(404).json({ message: "User not found" } as Message);
      } else {
        let hashedPassword;
        if (password && password !== user.data().password) {
          const salt = await bcrypt.genSalt(10);
          hashedPassword = await bcrypt.hash(password, salt);
        }
        if (email && email !== user.data().email) {
          const user = await getDocs(
            query(usersCollection, where("email", "==", email))
          );
          if (!user.empty) {
            return res
              .status(409)
              .json({ message: "User already exists" } as Message);
          }
        }
        await updateDoc(userDoc, {
          firstname,
          lastname: lastname || "",
          email:
            email && email !== user.data().email ? email : user.data().email,
          password:
            password && password !== user.data().password
              ? hashedPassword
              : user.data().password,
          isVerified:
            email && email !== user.data().email
              ? false
              : user.data().isVerified,
        } as Partial<User>);
        res.status(200).json({ id: user.id, ...req.body } as User);
      }
    } catch (error: any) {
      res
        .status(500)
        .json({ message: "Internal server error", error: error.message } as
          | Message
          | ErrorMSG);
    }
  },
];

export const deleteUserById = [
  verifyAdminToken,
  async (req: Request, res: Response) => {
    try {
      const uid = req.params.id;
      const userDoc = doc(usersCollection, uid);
      const user = await getDoc(userDoc);
      if (!user.exists()) {
        res.status(404).json({ message: "User not found" } as Message);
      } else {
        await deleteDoc(userDoc);
        res.status(200).json({ message: "User deleted" } as Message);
      }
    } catch (error: any) {
      res
        .status(500)
        .json({ message: "Internal server error", error: error.message } as
          | Message
          | ErrorMSG);
    }
  },
];

export const deleteUserByEmail = [
  verifyAdminToken,
  async (req: Request, res: Response) => {
    try {
      const email = req.params.email;
      const usersQuery = query(usersCollection, where("email", "==", email));
      const usersDocs = await getDocs(usersQuery);
      if (usersDocs.empty) {
        res.status(404).json({ message: "User not found" } as Message);
      } else {
        const user = usersDocs.docs[0];
        await deleteDoc(user.ref);
        res.status(200).json({ message: "User deleted" } as Message);
      }
    } catch (error: any) {
      res
        .status(500)
        .json({ message: "Internal server error", error: error.message } as
          | Message
          | ErrorMSG);
    }
  },
];

export const deleteMyself = [
  verifyToken,
  async (req: Request, res: Response) => {
    try {
      const uid = (req as DecodedUserRequest).uid;
      const userDoc = doc(usersCollection, uid);
      const user = await getDoc(userDoc);
      if (!user.exists()) {
        res.status(404).json({ message: "User not found" } as Message);
      } else {
        await deleteDoc(userDoc);
        res.status(200).json({ message: "User deleted" } as Message);
      }
    } catch (error: any) {
      res
        .status(500)
        .json({ message: "Internal server error", error: error.message } as
          | Message
          | ErrorMSG);
    }
  },
];

export const registerUser = async (req: Request, res: Response) => {
  try {
    const {
      firstname,
      lastname,
      email,
      password,
      isVerified,
      profilePic,
      deviceName,
      deviceType,
      deviceId,
      loginType,
      deviceLocation,
    } = req.body;
    const user = await getDocs(
      query(usersCollection, where("email", "==", req.body.email))
    );
    if (!user.empty) {
      res.status(409).json({ message: "User already exists" } as Message);
    } else {
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(password, salt);

      const newUser = await addDoc(usersCollection, {
        profilePic: profilePic || "",
        firstname,
        lastname: lastname || "",
        email,
        password: hashedPassword,
        createdAt: getFormattedDateAndTime(),
        lastLogin: getFormattedDateAndTime(),
        isAdmin: false,
        isBanned: false,
        isVerified: isVerified || false,
        watchlist: [],
        favorites: [],
        recentlyWatched: [],
        devices: [
          {
            deviceName,
            deviceType,
            deviceId,
            isActive: true,
            createdAt: getFormattedDateAndTime(),
            lastLogin: getFormattedDateAndTime(),
            location: {
              latitude: deviceLocation.latitude,
              longitude: deviceLocation.longitude,
              continent: deviceLocation.continent,
              country: deviceLocation.country,
              state: deviceLocation.state,
              county: deviceLocation.county,
              road: deviceLocation.road,
              town: deviceLocation.town,
              lastSeen: getFormattedDateAndTime(),
            },
          },
        ],
        loginType,
      } as Partial<User>);

      const newVerifyToken = {
        uid: newUser.id,
        token: crypto.randomBytes(3).toString("hex").toUpperCase(),
      } as UserVerifyToken;
      const jwtToken = jwt.sign(
        {
          uid: newUser.id,
          isAdmin: false,
          isVerified: isVerified || false,
        } as DecodedUser,
        process.env.JWT_SECRET as string
      );

      await addDoc(tokensCollection, newVerifyToken);

      if (!isVerified) {
        await sendMail(
          email,
          "Verify your email",
          `Your verification token: ${newVerifyToken.token}`
        );
      }

      res.status(201).json({ token: jwtToken });
    }
  } catch (error: any) {
    res
      .status(500)
      .json({ message: "Internal server error", error: error.message } as
        | Message
        | ErrorMSG);
  }
};

export const loginUser = async (req: Request, res: Response) => {
  try {
    const {
      email,
      password,
      deviceId,
      deviceName,
      deviceType,
      deviceLocation,
    } = req.body;
    const user = await getDocs(
      query(usersCollection, where("email", "==", email))
    );
    if (user.empty) {
      res.status(404).json({ message: "User not found" } as Message);
    } else {
      const userData = user.docs[0].data() as User;
      const isMatch = await bcrypt.compare(password, userData.password);
      if (isMatch) {
        const devices = userData?.devices || [];
        if (devices.filter((d) => d.deviceId == deviceId).length == 0) {
          await updateDoc(user.docs[0].ref, {
            devices: [
              ...devices,
              {
                deviceName,
                deviceType,
                deviceId,
                createdAt: getFormattedDateAndTime(),
                lastLogin: getFormattedDateAndTime(),
                isActive: false,
                location: {
                  latitude: deviceLocation.latitude,
                  longitude: deviceLocation.longitude,
                  continent: deviceLocation.continent,
                  country: deviceLocation.country,
                  state: deviceLocation.state,
                  county: deviceLocation.county,
                  road: deviceLocation.road,
                  town: deviceLocation.town,
                  lastSeen: getFormattedDateAndTime(),
                },
              },
            ],
          } as Partial<User>);
        } else {
          await updateDoc(user.docs[0].ref, {
            devices: [
              ...devices.map((d) => {
                if (d.deviceId == deviceId) {
                  return {
                    ...d,
                    lastLogin: getFormattedDateAndTime(),
                    location: {
                      latitude: deviceLocation.latitude,
                      longitude: deviceLocation.longitude,
                      continent: deviceLocation.continent,
                      country: deviceLocation.country,
                      state: deviceLocation.state,
                      county: deviceLocation.county,
                      road: deviceLocation.road,
                      town: deviceLocation.town,
                      lastSeen: getFormattedDateAndTime(),
                    },
                  };
                } else {
                  return d;
                }
              }),
            ],
          } as Partial<User>);
        }
        const jwtToken = jwt.sign(
          {
            uid: user.docs[0].id,
            isAdmin: userData.isAdmin,
            isVerified: userData.isVerified,
          } as DecodedUser,
          process.env.JWT_SECRET as string
        );
        res.status(200).json({ token: jwtToken });
      } else {
        res.status(401).json({ message: "Invalid credentials" } as Message);
      }
    }
  } catch (error: any) {
    res
      .status(500)
      .json({ message: "Internal server error", error: error.message } as
        | Message
        | ErrorMSG);
  }
};
export const verifyUser = [
  verifyToken,
  async (req: Request, res: Response) => {
    try {
      const uid = (req as DecodedUserRequest).uid;
      const user = await getDoc(doc(usersCollection, uid));
      const isVerified = (user.data() as User).isVerified;
      if (!user.exists()) {
        res.status(404).json({ message: "User not found" } as Message);
      } else {
        if (isVerified) {
          return res
            .status(400)
            .json({ message: "User already verified" } as Message);
        }
        const tokenQuery = query(
          tokensCollection,
          where("uid", "==", uid),
          where("token", "==", req.params.token)
        );
        const tokenDocs = await getDocs(tokenQuery);

        if (tokenDocs.empty) {
          return res
            .status(404)
            .json({ message: "Token not found" } as Message);
        }

        await updateDoc(doc(usersCollection, uid), { isVerified: true });
        await deleteDoc(tokenDocs.docs[0].ref);
        res.status(200).json({ message: "User verified" } as Message);
      }
    } catch (error: any) {
      res
        .status(500)
        .json({ message: "Internal server error", error: error.message } as
          | Message
          | ErrorMSG);
    }
  },
];

export const resendVerificationToken = [
  verifyToken,
  async (req: Request, res: Response) => {
    try {
      const uid = (req as DecodedUserRequest).uid;
      const user = await getDoc(doc(usersCollection, uid));
      if (!user.exists()) {
        res.status(404).json({ message: "User not found" } as Message);
      } else {
        const isVerified = (user.data() as User).isVerified;
        if (isVerified) {
          return res
            .status(400)
            .json({ message: "User already verified" } as Message);
        }
        const tokenQuery = query(tokensCollection, where("uid", "==", uid));
        const tokenDocs = await getDocs(tokenQuery);
        if (!tokenDocs.empty) {
          await deleteDoc(doc(tokensCollection, tokenDocs.docs[0].id));
        }
        const newToken = {
          uid,
          token: crypto.randomBytes(3).toString("hex").toUpperCase(),
        } as UserVerifyToken;
        await addDoc(tokensCollection, newToken);
        await sendMail(
          (user.data() as User).email,
          "Verify your email",
          `Your verification token: ${newToken.token}`
        );
        res.status(200).json({ message: "Verification token sent" } as Message);
      }
    } catch (error: any) {
      res
        .status(500)
        .json({ message: "Internal server error", error: error.message } as
          | Message
          | ErrorMSG);
    }
  },
];

export const forgotPassword = async (req: Request, res: Response) => {
  try {
    const email = req.body.email;
    const user = await getDocs(
      query(usersCollection, where("email", "==", email))
    );
    if (user.empty) {
      res.status(404).json({ message: "User not found" } as Message);
    } else {
      const resetToken = {
        uid: user.docs[0].id,
        token: crypto.randomBytes(16).toString("hex").toUpperCase(),
      } as UserVerifyToken;
      await addDoc(resetTokensCollection, resetToken);
      const resetURL = `${process.env.CLIENT_URL}/reset-password/${email}/${resetToken.token}`;
      await sendMail(
        email,
        "Reset your password",
        `Reset your password by visiting this link: ${resetURL}`
      );
      res.status(200).json({ message: "Reset password link sent" } as Message);
    }
  } catch (error: any) {
    res
      .status(500)
      .json({ message: "Internal server error", error: error.message } as
        | Message
        | ErrorMSG);
  }
};

export const resendForgotPasswordToken = async (
  req: Request,
  res: Response
) => {
  try {
    const email = req.body.email;
    const user = await getDocs(
      query(usersCollection, where("email", "==", email))
    );
    if (user.empty) {
      res.status(404).json({ message: "User not found" } as Message);
    } else {
      const tokenQuery = query(
        resetTokensCollection,
        where("uid", "==", user.docs[0].id)
      );
      const tokenDocs = await getDocs(tokenQuery);
      if (!tokenDocs.empty) {
        await deleteDoc(doc(resetTokensCollection, tokenDocs.docs[0].id));
      }
      const resetToken = {
        uid: user.docs[0].id,
        token: crypto.randomBytes(16).toString("hex").toUpperCase(),
      } as UserVerifyToken;
      await addDoc(resetTokensCollection, resetToken);
      const resetURL = `${process.env.CLIENT_URL}/reset-password/${email}/${resetToken.token}`;
      await sendMail(
        email,
        "Reset your password",
        `Reset your password by visiting this link: ${resetURL}`
      );
      res.status(200).json({ message: "Reset password link sent" } as Message);
    }
  } catch (error: any) {
    res
      .status(500)
      .json({ message: "Internal server error", error: error.message } as
        | Message
        | ErrorMSG);
  }
};

export const resetPassword = async (req: Request, res: Response) => {
  try {
    const email = req.params.email;
    const user = await getDocs(
      query(usersCollection, where("email", "==", email))
    );
    if (user.empty) {
      res.status(404).json({ message: "User not found" } as Message);
    } else {
      const tokenQuery = query(
        resetTokensCollection,
        where("uid", "==", user.docs[0].id),
        where("token", "==", req.params.token)
      );
      const tokenDocs = await getDocs(tokenQuery);
      if (tokenDocs.empty) {
        res.status(404).json({ message: "Token not found" } as Message);
      } else {
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(req.body.password, salt);
        await updateDoc(doc(usersCollection, user.docs[0].id), {
          password: hashedPassword,
        });
        await deleteDoc(doc(resetTokensCollection, tokenDocs.docs[0].id));
        res.status(200).json({ message: "Password reset" } as Message);
      }
    }
  } catch (error: any) {
    res
      .status(500)
      .json({ message: "Internal server error", error: error.message } as
        | Message
        | ErrorMSG);
  }
};

export const addToWatchlist = [
  verifyToken,
  async (req: Request, res: Response) => {
    try {
      const uid = (req as DecodedUserRequest).uid;
      const { movieId, typeMovie, poster } = req.body;
      const userDoc = doc(usersCollection, uid);
      const user = await getDoc(userDoc);
      if (!user.exists()) {
        res.status(404).json({ message: "User not found" } as Message);
      } else {
        const watchlist: Watchlist[] = (user.data() as User)?.watchlist || [];
        if (
          watchlist.some(
            (item) => item.id === movieId && item.type === typeMovie
          )
        ) {
          res
            .status(400)
            .json({ message: "Movie already in watchlist" } as Message);
        } else {
          await updateDoc(userDoc, {
            watchlist: [
              ...watchlist,
              { id: movieId, type: typeMovie, poster } as Watchlist,
            ],
          });
          res
            .status(200)
            .json({ message: "Movie added to watchlist" } as Message);
        }
      }
    } catch (error: any) {
      res
        .status(500)
        .json({ message: "Internal server error", error: error.message } as
          | Message
          | ErrorMSG);
    }
  },
];

export const deleteFromWatchlist = [
  verifyToken,
  async (req: Request, res: Response) => {
    try {
      const uid = (req as DecodedUserRequest).uid;
      const movieId = req.params.movieId;
      const typeMovie = req.params.typeMovie;
      const userDoc = doc(usersCollection, uid);
      const user = await getDoc(userDoc);
      if (!user.exists()) {
        res.status(404).json({ message: "User not found" } as Message);
      } else {
        const watchlist = (user.data() as User)?.watchlist || [];
        const newWatchlist = watchlist.filter(
          (movie) => movie.id !== movieId || movie.type !== typeMovie
        );
        await updateDoc(userDoc, {
          watchlist: newWatchlist,
        });
        res
          .status(200)
          .json({ message: "Movie deleted from watchlist" } as Message);
      }
    } catch (error: any) {
      res
        .status(500)
        .json({ message: "Internal server error", error: error.message } as
          | Message
          | ErrorMSG);
    }
  },
];
export const addToFavorites = [
  verifyToken,
  async (req: Request, res: Response) => {
    try {
      const uid = (req as DecodedUserRequest).uid;
      const { movieId, typeMovie, poster } = req.body;
      const userDoc = doc(usersCollection, uid);
      const user = await getDoc(userDoc);
      if (!user.exists()) {
        res.status(404).json({ message: "User not found" } as Message);
      } else {
        const favorites = (user.data() as User)?.favorites || [];
        if (
          favorites.some(
            (item) => item.id === movieId && item.type === typeMovie
          )
        ) {
          res
            .status(400)
            .json({ message: "Movie already in favorites" } as Message);
        } else {
          await updateDoc(userDoc, {
            favorites: [
              ...favorites,
              { id: movieId, type: typeMovie, poster } as Watchlist,
            ],
          });
          res
            .status(200)
            .json({ message: "Movie added to favorites" } as Message);
        }
      }
    } catch (error: any) {
      res
        .status(500)
        .json({ message: "Internal server error", error: error.message } as
          | Message
          | ErrorMSG);
    }
  },
];
export const deleteFromFavorites = [
  verifyToken,
  async (req: Request, res: Response) => {
    try {
      const uid = (req as DecodedUserRequest).uid;
      const movieId = req.params.movieId;
      const typeMovie = req.params.typeMovie;
      const userDoc = doc(usersCollection, uid);
      const user = await getDoc(userDoc);
      if (!user.exists()) {
        res.status(404).json({ message: "User not found" } as Message);
      } else {
        const favorites = (user.data() as User)?.favorites || [];
        const newFavorites = favorites.filter(
          (movie) => movie.id !== movieId || movie.type !== typeMovie
        );
        await updateDoc(userDoc, {
          favorites: newFavorites,
        });
        res
          .status(200)
          .json({ message: "Movie deleted from favorites" } as Message);
      }
    } catch (error: any) {
      res
        .status(500)
        .json({ message: "Internal server error", error: error.message } as
          | Message
          | ErrorMSG);
    }
  },
];

export const addToRecentlyWatched = [
  verifyToken,
  async (req: Request, res: Response) => {
    try {
      const uid = (req as DecodedUserRequest).uid;
      const { movieId, typeMovie, poster } = req.body;
      const userDoc = doc(usersCollection, uid);
      const user = await getDoc(userDoc);
      if (!user.exists()) {
        res.status(404).json({ message: "User not found" } as Message);
      } else {
        const recentlyWatched = (user.data() as User)?.recentlyWatched || [];
        if (
          recentlyWatched.some(
            (item) => item.id === movieId && item.type === typeMovie
          )
        ) {
          res
            .status(400)
            .json({ message: "Movie already in recently watched" } as Message);
        } else {
          await updateDoc(userDoc, {
            recentlyWatched: [
              ...recentlyWatched,
              { id: movieId, type: typeMovie, poster } as Watchlist,
            ],
          });
          res
            .status(200)
            .json({ message: "Movie added to recently watched" } as Message);
        }
      }
    } catch (error: any) {
      res
        .status(500)
        .json({ message: "Internal server error", error: error.message } as
          | Message
          | ErrorMSG);
    }
  },
];

export const deleteFromRecentlyWatched = [
  verifyToken,
  async (req: Request, res: Response) => {
    try {
      const uid = (req as DecodedUserRequest).uid;
      const movieId = req.params.movieId;
      const typeMovie = req.params.typeMovie;
      const userDoc = doc(usersCollection, uid);
      const user = await getDoc(userDoc);
      if (!user.exists()) {
        res.status(404).json({ message: "User not found" } as Message);
      } else {
        const recentlyWatched = (user.data() as User)?.recentlyWatched || [];
        const newRecentlyWatched = recentlyWatched.filter(
          (movie) => movie.id !== movieId || movie.type !== typeMovie
        );
        await updateDoc(userDoc, {
          recentlyWatched: newRecentlyWatched,
        });
        res
          .status(200)
          .json({ message: "Movie deleted from recently watched" } as Message);
      }
    } catch (error: any) {
      res
        .status(500)
        .json({ message: "Internal server error", error: error.message } as
          | Message
          | ErrorMSG);
    }
  },
];

export const lastLogin = [
  verifyToken,
  async (req: Request, res: Response) => {
    try {
      const uid = (req as DecodedUserRequest).uid;
      const { deviceId } = req.body;
      const userDoc = doc(usersCollection, uid);
      const user = await getDoc(userDoc);
      if (!user.exists()) {
        res.status(404).json({ message: "User not found" } as Message);
      } else {
        const devices = (user.data() as User)?.devices || [];
        const updatedDevices = devices.map((device) => {
          if (device.deviceId === deviceId) {
            return {
              ...device,
              lastLogin: getFormattedDateAndTime(),
            };
          }
          return device;
        });
        await updateDoc(userDoc, {
          devices: updatedDevices,
          lastLogin: getFormattedDateAndTime(),
        } as Partial<User>);
        res.status(200).json({ message: "Last login updated" } as Message);
      }
    } catch (error: any) {
      res
        .status(500)
        .json({ message: "Internal server error", error: error.message } as
          | Message
          | ErrorMSG);
    }
  },
];
export const addDevice = [
  verifyToken,
  async (req: Request, res: Response) => {
    try {
      const uid = (req as DecodedUserRequest).uid;
      const { deviceName, deviceType, deviceId } = req.body;
      const userDoc = doc(usersCollection, uid);
      const user = await getDoc(userDoc);
      if (!user.exists()) {
        res.status(404).json({ message: "User not found" } as Message);
      } else {
        const devices = (user.data() as User)?.devices || [];
        if (devices.some((d) => d.deviceId === deviceId)) {
          res.status(400).json({ message: "Device already added" } as Message);
        } else {
          await updateDoc(userDoc, {
            devices: [
              ...devices,
              {
                deviceName,
                deviceType,
                deviceId,
                createdAt: getFormattedDateAndTime(),
                lastLogin: getFormattedDateAndTime(),
                isActive: false,
              },
            ],
          } as Partial<User>);
          res.status(200).json({ message: "Device added" } as Message);
        }
      }
    } catch (error: any) {
      res
        .status(500)
        .json({ message: "Internal server error", error: error.message } as
          | Message
          | ErrorMSG);
    }
  },
];

export const deleteDevice = [
  verifyToken,
  async (req: Request, res: Response) => {
    try {
      const uid = (req as DecodedUserRequest).uid;
      const deviceId = req.params.deviceId;
      const userDoc = doc(usersCollection, uid);
      const user = await getDoc(userDoc);
      if (!user.exists()) {
        res.status(404).json({ message: "User not found" } as Message);
      } else {
        const devices = (user.data() as User)?.devices || [];
        const newDevices = devices.filter((d) => d.deviceId !== deviceId);
        await updateDoc(userDoc, {
          devices: newDevices,
        } as Partial<User>);
        res.status(200).json({ message: "Device deleted" } as Message);
      }
    } catch (error: any) {
      res
        .status(500)
        .json({ message: "Internal server error", error: error.message } as
          | Message
          | ErrorMSG);
    }
  },
];
