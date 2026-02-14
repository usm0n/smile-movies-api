import { addDoc, collection, deleteDoc, doc, getDoc, getDocs, query, updateDoc, where } from "firebase/firestore";
import { db } from "../../../config";
import { Request, Response } from "express";
import bcrypt from "bcrypt"
import { getFormattedDateAndTime } from "../../../utils/defaults";
import { DecodedUser, DecodedUserRequest, User, UserVerifyToken } from "../../../interfaces/users";
import crypto from "crypto"
import jwt from "jsonwebtoken"
import { sendMail } from "../../../utils/sendMail";
import { verifyToken } from "../../../middlewares/auth.middleware";

const usersCollection = collection(db, "users");
const tokensCollection = collection(db, "verifyTokens");
const resetTokensCollection = collection(db, "resetTokens");

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
            query(usersCollection, where("email", "==", req.body.email)),
        );
        if (!user.empty) {
            res.status(409).json({ message: "User already exists" });
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
                process.env.JWT_SECRET as string,
                { expiresIn: "7d" },
            );

            await addDoc(tokensCollection, newVerifyToken);

            if (!isVerified) {
                await sendMail(
                    email,
                    "Verify your email",
                    `Your verification token: ${newVerifyToken.token}`,
                );
            }
            res.cookie("authToken", jwtToken, {
                domain:
                    process.env.NODE_ENV === "production"
                        ? `${process.env.CLIENT_URL?.replace("https://", ".")}`
                        : undefined,
                httpOnly: process.env.NODE_ENV === "production",
                secure: process.env.NODE_ENV === "production",
                sameSite: "lax",
                maxAge: 7 * 24 * 60 * 60 * 1000,
                path: "/",
            });
            res.status(201).json({ message: "User registered successfully" });
        }
    } catch (error) {
        console.error(error);
        res
            .status(500)
            .json({ message: "Internal server error" });
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
            query(usersCollection, where("email", "==", email)),
        );
        if (user.empty) {
            res.status(404).json({ message: "User not found" });
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
                    process.env.JWT_SECRET as string,
                    { expiresIn: "7d" },
                );
                res.cookie("authToken", jwtToken, {
                    domain:
                        process.env.NODE_ENV === "production"
                            ? `${process.env.CLIENT_URL?.replace("https://", ".")}`
                            : undefined,
                    httpOnly: process.env.NODE_ENV === "production",
                    secure: process.env.NODE_ENV === "production",
                    sameSite: "lax",
                    maxAge: 7 * 24 * 60 * 60 * 1000,
                    path: "/",
                });
                res.status(200).json({ message: "Login successful" });
            } else {
                res.status(401).json({ message: "Invalid credentials" });
            }
        }
    } catch (error) {
        console.error(error);
        res
            .status(500)
            .json({ message: "Internal server error" });
    }
};
export const logoutUser = (req: Request, res: Response) => {
    res.clearCookie("authToken", {
        domain:
            process.env.NODE_ENV === "production"
                ? `${process.env.CLIENT_URL?.replace("https://", ".")}`
                : undefined,
        path: "/",
        secure: process.env.NODE_ENV === "production",
        httpOnly: process.env.NODE_ENV === "production",
        sameSite: "lax",
    });

    res.status(200).json({ message: "Logged out successfully" });
};

export const verifyUser = [
    verifyToken,
    async (req: Request, res: Response) => {
        try {
            const uid = (req as DecodedUserRequest).uid;
            const user = await getDoc(doc(usersCollection, uid));
            const isVerified = (user.data() as User).isVerified;
            if (!user.exists()) {
                res.status(404).json({ message: "User not found" });
            } else {
                if (isVerified) {
                    return res
                        .status(400)
                        .json({ message: "User already verified" });
                }
                const tokenQuery = query(
                    tokensCollection,
                    where("uid", "==", uid),
                    where("token", "==", req.params.token),
                );
                const tokenDocs = await getDocs(tokenQuery);

                if (tokenDocs.empty) {
                    return res
                        .status(404)
                        .json({ message: "Token not found" });
                }

                await updateDoc(doc(usersCollection, uid), { isVerified: true });
                await deleteDoc(tokenDocs.docs[0].ref);
                res.status(200).json({ message: "User verified" });
            }
        } catch (error) {
            console.error(error);
            res
                .status(500)
                .json({ message: "Internal server error" });
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
                res.status(404).json({ message: "User not found" });
            } else {
                const isVerified = (user.data() as User).isVerified;
                if (isVerified) {
                    return res
                        .status(400)
                        .json({ message: "User already verified" });
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
                    `Your verification token: ${newToken.token}`,
                );
                res.status(200).json({ message: "Verification token sent" });
            }
        } catch (error) {
            console.error(error);
            res
                .status(500)
                .json({ message: "Internal server error" });
        }
    },
];

export const forgotPassword = async (req: Request, res: Response) => {
    try {
        const email = req.body.email;
        const user = await getDocs(
            query(usersCollection, where("email", "==", email)),
        );
        if (user.empty) {
            res.status(404).json({ message: "User not found" });
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
                `Reset your password by visiting this link: ${resetURL}`,
            );
            res.status(200).json({ message: "Reset password link sent" });
        }
    } catch (error) {
        console.error(error);
        res
            .status(500)
            .json({ message: "Internal server error" });
    }
};

export const resendForgotPasswordToken = async (
    req: Request,
    res: Response,
) => {
    try {
        const email = req.body.email;
        const user = await getDocs(
            query(usersCollection, where("email", "==", email)),
        );
        if (user.empty) {
            res.status(404).json({ message: "User not found" });
        } else {
            const tokenQuery = query(
                resetTokensCollection,
                where("uid", "==", user.docs[0].id),
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
                `Reset your password by visiting this link: ${resetURL}`,
            );
            res.status(200).json({ message: "Reset password link sent" });
        }
    } catch (error) {
        console.error(error);
        res
            .status(500)
            .json({ message: "Internal server error" });
    }
};

export const resetPassword = async (req: Request, res: Response) => {
    try {
        const email = req.params.email;
        const user = await getDocs(
            query(usersCollection, where("email", "==", email)),
        );
        if (user.empty) {
            res.status(404).json({ message: "User not found" });
        } else {
            const tokenQuery = query(
                resetTokensCollection,
                where("uid", "==", user.docs[0].id),
                where("token", "==", req.params.token),
            );
            const tokenDocs = await getDocs(tokenQuery);
            if (tokenDocs.empty) {
                res.status(404).json({ message: "Token not found" });
            } else {
                const salt = await bcrypt.genSalt(10);
                const hashedPassword = await bcrypt.hash(req.body.password, salt);
                await updateDoc(doc(usersCollection, user.docs[0].id), {
                    password: hashedPassword,
                });
                await deleteDoc(doc(resetTokensCollection, tokenDocs.docs[0].id));
                res.status(200).json({ message: "Password reset" });
            }
        }
    } catch (error) {
        console.error(error);
        res
            .status(500)
            .json({ message: "Internal server error" });
    }
};

export const changePassword = [verifyToken,
    async (req: Request, res: Response) => {
        try {
            const { oldPassword, newPassword } = req.body
            const uid = (req as DecodedUserRequest).uid
            if (!oldPassword || !newPassword) {
                return res.status(400).json({ message: "Both passwords are required" })
            }
            const userDoc = doc(usersCollection, uid)
            const user = await getDoc(userDoc);
            if (!user.exists()) {
                return res.status(404).json({ message: "User not found" })
            }
            if (oldPassword === newPassword) {
                return res.status(400).json({ message: "New password cannot be the same as the old password" })
            }
            const isMatch = await bcrypt.compare(oldPassword, (user.data() as User).password)
            if (!isMatch) {
                return res.status(400).json({ message: "Old password is incorrect" })
            }
            const salt = await bcrypt.genSalt(10);
            const hashedNewPassword = await bcrypt.hash(newPassword, salt);
            await updateDoc(userDoc, {
                password: hashedNewPassword
            })
            res.status(200).json({ message: "User password updated" })
        } catch (error) {
            console.error(error);
            res.status(500).json({ message: "Internal server error" })
        }
    }
]