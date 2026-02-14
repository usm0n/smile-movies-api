import { Router } from "express";
import * as userController from "../controllers/user/users.controller";
import * as authUserController from "../controllers/user/auth/auth.users.controller"
import * as adminController from "../controllers/admin/admin.controller"

const router = Router();

router.get("/", adminController.getAllUsers);
router.get("/id/:id", adminController.getUserById);
router.get("/email/:email", adminController.getUserByEmail);
router.get("/myself", userController.getMyself);

router.put("/id/:id", adminController.updateUserById);
router.put("/email/:email", adminController.updateUserByEmail);
router.put("/myself", userController.updateMyself);

router.delete("/id/:id", adminController.deleteUserById);
router.delete("/email/:email", adminController.deleteUserByEmail);
router.delete("/myself", userController.deleteMyself);

router.post("/register", authUserController.registerUser);
router.post("/login", authUserController.loginUser);
router.post("/logout", authUserController.logoutUser);

router.post("/verify/:token", authUserController.verifyUser);
router.post("/resendVericationToken", authUserController.resendVerificationToken);

router.post("/forgotPassword", authUserController.forgotPassword);
router.post(
  "/resendForgotPasswordToken",
  authUserController.resendForgotPasswordToken,
);

router.post("/resetPassword/:email/:token", authUserController.resetPassword);

router.post("/watchlist", userController.addToWatchlist);
router.delete(
  "/watchlist/:typeMovie/:movieId",
  userController.deleteFromWatchlist,
);

router.post("/lastLogin", userController.lastLogin);

router.post("/addDevice", userController.addDevice);
router.delete("/deleteDevice/:deviceId", userController.deleteDevice);
router.post("/activateDevice/:deviceId", userController.activateDevice);
router.post("/requestActivateDevice/:email/:deviceId", userController.requestActivateMyDevice);
router.post("/verifyDevice/:email/:deviceId/:token", userController.verifyActivateDevice);

export default router;
