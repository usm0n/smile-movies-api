import { collection, deleteDoc, doc, getDoc, getDocs, orderBy, query, updateDoc, where } from "firebase/firestore";
import { verifyAdminToken } from "../../middlewares/auth.middleware";
import { Request, Response } from "express";
import { User } from "../../interfaces/users";
import { db } from "../../config";
import bcrypt from "bcrypt";

const usersCollection = collection(db, "users");

export const getAllUsers = [
  verifyAdminToken,
  async (req: Request, res: Response) => {
    try {
      const usersQuery = query(usersCollection, orderBy("createdAt", "desc"));
      const usersDocs = await getDocs(usersQuery);

      if (usersDocs.empty) {
        res.status(204).json({ message: "No users found" });
      } else {
        const users = usersDocs.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        res.status(200).json(users as User[]);
      }
    } catch (error) {
            console.error(error);
      res
        .status(500)
        .json({ message: "Internal server error" });
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
        res.status(404).json({ message: "User not found" });
      } else {
        res.status(200).json({ id: user.id, ...user.data() } as User);
      }
    } catch (error) {
            console.error(error);
      res
        .status(500)
        .json({ message: "Internal server error" });
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
        res.status(404).json({ message: "User not found" });
      } else {
        const user = usersDocs.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }))[0];
        res.status(200).json(user as User);
      }
    } catch (error) {
            console.error(error);
      res
        .status(500)
        .json({ message: "Internal server error" });
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
        res.status(404).json({ message: "User not found" });
      } else {
        let hashedPassword;
        if (password && password !== user.data().password) {
          const salt = await bcrypt.genSalt(10);
          hashedPassword = await bcrypt.hash(password, salt);
        }
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
    } catch (error) {
            console.error(error);
      res
        .status(500)
        .json({ message: "Internal server error" });
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
        where("email", "==", currentEmail),
      );
      const usersDocs = await getDocs(usersQuery);
      if (usersDocs.empty) {
        res.status(404).json({ message: "User not found" });
      } else {
        const userDoc = usersDocs.docs[0].ref;
        let hashedPassword;
        if (password && password !== usersDocs.docs[0].data().password) {
          const salt = await bcrypt.genSalt(10);
          hashedPassword = await bcrypt.hash(password, salt);
        }
        if (email && email !== usersDocs.docs[0].data().email) {
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
    } catch (error) {
            console.error(error);
      res
        .status(500)
        .json({ message: "Internal server error" });
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
        res.status(404).json({ message: "User not found" });
      } else {
        await deleteDoc(userDoc);
        res.status(200).json({ message: "User deleted" });
      }
    } catch (error) {
            console.error(error);
      res
        .status(500)
        .json({ message: "Internal server error" });
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
        res.status(404).json({ message: "User not found" });
      } else {
        const user = usersDocs.docs[0];
        await deleteDoc(user.ref);
        res.status(200).json({ message: "User deleted" });
      }
    } catch (error) {
            console.error(error);
      res
        .status(500)
        .json({ message: "Internal server error" });
    }
  },
];