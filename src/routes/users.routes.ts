import { Router } from "express";
import * as userController from "../controllers/users.controller";

const router = Router();

router.get("/", userController.getAllUsers);
router.get("/id/:id", userController.getUserById);
router.get("/email/:email", userController.getUserByEmail);
router.get("/myself", userController.getMyself);

router.put("/id/:id", userController.updateUserById);
router.put("/email/:email", userController.updateUserByEmail);
router.put("/myself", userController.updateMyself);

router.delete("/id/:id", userController.deleteUserById);
router.delete("/email/:email", userController.deleteUserByEmail);
router.delete("/myself", userController.deleteMyself);

router.post("/register", userController.registerUser);
router.post("/login", userController.loginUser);

router.post("/verify/:token", userController.verifyUser);
router.post("/resendVericationToken", userController.resendVerificationToken);

router.post("/forgotPassword", userController.forgotPassword);
router.post(
  "/resendForgotPasswordToken",
  userController.resendForgotPasswordToken
);

router.post("/resetPassword/:email/:token", userController.resetPassword);

router.post("/watchlist", userController.addToWatchlist);
router.delete(
  "/watchlist/:typeMovie/:movieId",
  userController.deleteFromWatchlist
);

router.post("/favorites/", userController.addToFavorites);
router.delete(
  "/favorites/:typeMovie/:movieId",
  userController.deleteFromFavorites
);

router.post("/recentlyWatched", userController.addToRecentlyWatched);
router.delete(
  "/recentlyWatched/:typeMovie/:movieId",
  userController.deleteFromRecentlyWatched
);

router.post("/lastLogin", userController.lastLogin);

router.post("/addDevice", userController.addDevice);
router.delete("/deleteDevice/:deviceId", userController.deleteDevice);

export default router;
