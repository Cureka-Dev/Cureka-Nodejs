import { Router } from "express";
import * as userDataControllers from "../controllers/userData.js";
import jwtMiddleware from "../middlewares/jwtMiddleware.js";
const router = Router();

router.get(`/`,jwtMiddleware(), userDataControllers.getAllUserData);
//router.get(`/:id`,jwtMiddleware(), postControllers.getTask);
router.post(`/`,jwtMiddleware(), userDataControllers.addUserData);
// router.patch(`/:id`,jwtMiddleware(), postControllers.editTask);
router.delete(`/:id`,jwtMiddleware(), userDataControllers.deleteUserData);

export default router;