import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  query,
  updateDoc,
  where,
  writeBatch,
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
import crypto from "crypto"
import { sendMail } from "../../utils/sendMail";

const usersCollection = collection(db, "users");
const activateDeviceTokensCollection = collection(db, "deviceTokens")

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

export const activateDevice = [
  verifyToken,
  async (req: Request, res: Response) => {
    try {
      const uid = (req as DecodedUserRequest).uid;
      const deviceId = req.params.deviceId;

      if (!deviceId) {
        return res.status(400).json({ message: "DeviceId is required" });
      }

      const userDoc = doc(usersCollection, uid);
      const userSnap = await getDoc(userDoc);

      if (!userSnap.exists()) {
        return res.status(404).json({ message: "User not found" });
      }

      const userData = userSnap.data() as User;
      const devices = userData.devices || [];

      const deviceExists = devices.some(d => d.deviceId === deviceId);
      if (!deviceExists) {
        return res.status(404).json({ message: "Device not found in user profile" });
      }

      if (devices.some(d => d.deviceId === deviceId && d.isActive === true)) {
        return res.status(400).json({ message: "Device already activated" });
      }

      const updatedDevices = devices.map((device) =>
        device.deviceId === deviceId ? { ...device, isActive: true } : device
      );

      await updateDoc(userDoc, { devices: updatedDevices });

      return res.status(200).json({ message: "Device activated successfully" });

    } catch (error) {
      console.error(error);
      return res.status(500).json({ message: "Internal server error" });
    }
  }
];

export const requestActivateMyDevice = [
  verifyToken,
  async (req: Request, res: Response) => {
    try {
      const uid = (req as DecodedUserRequest).uid;
      const { deviceId, email } = req.params;

      if (!deviceId || !email) {
        return res.status(400).json({ message: "DeviceId and Email are required" });
      }

      const userDoc = doc(usersCollection, uid);
      const userSnap = await getDoc(userDoc);

      if (!userSnap.exists()) {
        return res.status(404).json({ message: "User not found" });
      }

      const userData = userSnap.data() as User;
      const device = (userData?.devices || []).find((d) => d.deviceId === deviceId);

      if (!device) {
        return res.status(404).json({ message: "Device not found in your account" });
      }

      const token = crypto.randomBytes(32).toString("hex");

      const activateToken = {
        uid,
        deviceId,
        token,
        createdAt: new Date(),
        used: false
      };

      await addDoc(activateDeviceTokensCollection, activateToken);

      const activateDeviceURL = `${process.env.CLIENT_URL}/auth/activate-device?email=${email}&deviceId=${deviceId}&token=${token}`;

      await sendMail(
        email,
        "Security Alert: Device Activation Requested",
        `Dear ${userData?.firstname},

        A request was made to grant high-level permissions to: ${device.deviceName} (${device.deviceType}).

        If you approve, this device will be able to:
         - Manage other devices
         - Change personal details
         - Delete your account
        
        Click here to activate (Link expires in 30 minutes): ${activateDeviceURL}
        
        If this wasn't you, please secure your account immediately.
        
        Smile Movies Team`
      );

      res.status(200).json({ message: "Activation link sent to your email" });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Internal server error" });
    }
  }
];


export const verifyActivateDevice = async (req: Request, res: Response) => {
  try {
    const { email, deviceId, token } = req.params;

    if (!email || !deviceId || !token) {
      res.status(400).json({ message: "Invalid activation link" });
      return
    }

    const q = query(
      activateDeviceTokensCollection,
      where("token", "==", token),
      where("deviceId", "==", deviceId),
      where("used", "==", false)
    );
    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) {
      res.status(400).json({ message: "Token is invalid or has already been used" });
      return
    }

    const tokenDoc = querySnapshot.docs[0];
    const tokenData = tokenDoc.data();

    const expiryTime = 30 * 60 * 1000;
    const isExpired = Date.now() - tokenData.createdAt.toDate().getTime() > expiryTime;

    if (isExpired) {
      res.status(400).json({ message: "Activation link has expired" });
      return
    }

    const userDocRef = doc(usersCollection, tokenData.uid);
    const userSnap = await getDoc(userDocRef);

    if (!userSnap.exists()) {
      res.status(404).json({ message: "User no longer exists" });
      return
    }

    const userData = userSnap.data() as User;
    const updatedDevices = userData.devices.map((d) => {
      if (d.deviceId === deviceId) {
        return { ...d, isActivated: true };
      }
      return d;
    });

    const batch = writeBatch(db);
    batch.update(userDocRef, { devices: updatedDevices });
    batch.update(tokenDoc.ref, { used: true });

    await batch.commit();

    res.status(200).json({ message: "Device successfully activated!" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal server error" });
  }
};
