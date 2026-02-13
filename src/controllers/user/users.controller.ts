import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  query,
  updateDoc,
  where,
} from "firebase/firestore";
import { db } from "../../config";
import { Request, Response } from "express";
import { verifyToken } from "../../middlewares/auth.middleware";
import {
  DecodedUserRequest,
  User,
  Watchlist,
} from "../../interfaces/users";
import { getFormattedDateAndTime } from "../../utils/defaults";
import "dotenv/config";

const usersCollection = collection(db, "users");

export const getMyself = [
  verifyToken,
  async (req: Request, res: Response) => {
    try {
      const uid = (req as DecodedUserRequest).uid;
      const user = await getDoc(doc(usersCollection, uid));
      if (!user.exists()) {
        res.status(404).json({ message: "User not found" });
      } else {
        res.status(200).json({ id: user.id, ...user.data() });
      }
    } catch (error) {
      console.error(error);
      res
        .status(500)
        .json({ message: "Internal server error" });
    }
  },
];

export const updateMyself = [
  verifyToken,
  async (req: Request, res: Response) => {
    try {
      const { firstname, lastname, email }: User = req.body;
      const uid = (req as DecodedUserRequest).uid;
      const userDoc = doc(usersCollection, uid);
      const user = await getDoc(userDoc);
      if (!user.exists()) {
        res.status(404).json({ message: "User not found" });
      } else {
        if (email && email !== user.data().email) {
          const user = await getDocs(
            query(usersCollection, where("email", "==", email)),
          );
          if (!user.empty) {
            return res
              .status(409)
              .json({ message: "User already exists" });
          }
        }
        await updateDoc(userDoc, {
          firstname,
          lastname: lastname || "",
          email:
            email && email !== user.data().email ? email : user.data().email,
          isVerified:
            email && email !== user.data().email
              ? false
              : user.data().isVerified,
        } as Partial<User>);
        res.status(200).json({ message: "User updated" });
      }
    } catch (error) {
      console.error(error);
      res
        .status(500)
        .json({ message: "Internal server error" });
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
        res.status(404).json({ message: "User not found" });
      } else {
        await deleteDoc(userDoc);
        res.status(200).json({ message: "User deleted" });
      }
    } catch (error) {
      console.error(error);
      res
        .status(500)
        .json({ message: "Internal server error" }
        );
    }
  },
];

export const addToWatchlist = [
  verifyToken,
  async (req: Request, res: Response) => {
    try {
      const uid = (req as DecodedUserRequest).uid;
      const {
        movieId,
        typeMovie,
        poster,
        status,
        duration,
        currentTime,
        season,
        episode,
      } = req.body;
      const userDoc = doc(usersCollection, uid);
      const user = await getDoc(userDoc);
      if (!user.exists()) {
        res.status(404).json({ message: "User not found" });
      } else {
        const watchlist: Watchlist[] = (user.data() as User)?.watchlist || [];
        if (
          watchlist.some(
            (item) => item.id === movieId && item.type === typeMovie,
          )
        ) {
          await updateDoc(userDoc, {
            watchlist: watchlist.map((item) => {
              if (item.id === movieId && item.type === typeMovie) {
                return {
                  ...item,
                  poster,
                  status,
                  duration,
                  currentTime,
                  season,
                  episode,
                };
              }
              return item;
            }),
          });
          res
            .status(200)
            .json({ message: "Watchlist item updated" });
        } else {
          await updateDoc(userDoc, {
            watchlist: [
              ...watchlist,
              {
                id: movieId,
                type: typeMovie,
                poster,
                status,
                duration,
                currentTime,
                episode,
                season,
              } as Watchlist,
            ],
          });
          res
            .status(200)
            .json({ message: "Movie added to watchlist" });
        }
      }
    } catch (error) {
      console.error(error);
      res
        .status(500)
        .json({ message: "Internal server error" });
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
        res.status(404).json({ message: "User not found" });
      } else {
        const watchlist = (user.data() as User)?.watchlist || [];
        const newWatchlist = watchlist.filter(
          (movie) => movie.id !== movieId || movie.type !== typeMovie,
        );
        await updateDoc(userDoc, {
          watchlist: newWatchlist,
        });
        res
          .status(200)
          .json({ message: "Movie deleted from watchlist" });
      }
    } catch (error) {
      console.error(error);
      res
        .status(500)
        .json({ message: "Internal server error" });
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
        res.status(404).json({ message: "User not found" });
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
        res.status(200).json({ message: "Last login updated" });
      }
    } catch (error) {
      console.error(error);
      res
        .status(500)
        .json({ message: "Internal server error" });
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
        res.status(404).json({ message: "User not found" });
      } else {
        const devices = (user.data() as User)?.devices || [];
        if (devices.some((d) => d.deviceId === deviceId)) {
          res.status(400).json({ message: "Device already added" });
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
          res.status(200).json({ message: "Device added" });
        }
      }
    } catch (error) {
      console.error(error);
      res
        .status(500)
        .json({ message: "Internal server error" });
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
        res.status(404).json({ message: "User not found" });
      } else {
        const devices = (user.data() as User)?.devices || [];
        const newDevices = devices.filter((d) => d.deviceId !== deviceId);
        await updateDoc(userDoc, {
          devices: newDevices,
        } as Partial<User>);
        res.status(200).json({ message: "Device deleted" });
      }
    } catch (error) {
      console.error(error);
      res
        .status(500)
        .json({ message: "Internal server error" });
    }
  },
];
