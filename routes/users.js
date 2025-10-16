import { Router } from "express";
import * as userControllers from "../controllers/user.js";
import jwtMiddleware from "../middlewares/jwtMiddleware.js";
const router = Router();

router.get(`/:id`, jwtMiddleware(),userControllers.getUser);
router.post(`/sendOtp`, userControllers.sendOtp);
router.put(`/:id`, jwtMiddleware(),userControllers.editUser);
router.post(`/signin`, userControllers.signin);
router.get(`/`, jwtMiddleware(),userControllers.getUsers);
router.get(`/getUserData/:id`,jwtMiddleware(),userControllers.getUserData);
router.get(`/getTagsData/:searchType`,jwtMiddleware(),userControllers.getTagsData);
router.get(`/getUserByUserId/:id`, jwtMiddleware(),userControllers.getUserByUserId);
router.get(`/sendCall/:id/:type`, jwtMiddleware(),userControllers.sendCall);
router.get(`/callStatus/:id`, jwtMiddleware(),userControllers.getUserCallStatus);
router.post(`/answerCall`, userControllers.answerCall);
router.post(`/endCall`, jwtMiddleware(),userControllers.endCall);
router.put(`/deleteUser/:id`, jwtMiddleware(),userControllers.deleteUser);

export default router;