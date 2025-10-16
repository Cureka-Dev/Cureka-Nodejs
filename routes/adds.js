import express from 'express';
const router = express.Router();

import * as addController from '../controllers/addController.js';
import jwtMiddleware from "../middlewares/jwtMiddleware.js";
import { userType } from "../utils/constants.js";
// Curated Adds
router.post('/curated-add',jwtMiddleware([userType.USER]), addController.createCuratedAdd);
router.put('/curated-add/:id',jwtMiddleware([userType.USER]), addController.updateCuratedAdd);
router.get('/getAllCuratedAdds', addController.getAllCuratedAdds);
router.get('/curated-add/:id',jwtMiddleware([userType.USER]), addController.getCuratedAddById);
router.delete('/curated-add/:id',jwtMiddleware([userType.USER]), addController.deleteCuratedAdd);
router.get('/curated-add/getCuratedAddsBySlug/:url', addController.getCuratedAddsBySlug);
// Single Adds
router.post('/single-add',jwtMiddleware([userType.USER]), addController.createSingleAdd);
router.put('/single-add/:id',jwtMiddleware([userType.USER]), addController.updateSingleAdd);
router.get('/getAllSingleAdds',addController.getAllSingleAdds);
router.get('/single-add/:id',jwtMiddleware([userType.USER]), addController.getSingleAddById);
router.delete('/single-add/:id',jwtMiddleware([userType.USER]), addController.deleteSingleAdd);

// Multiple Adds
router.post('/multiple-add',jwtMiddleware([userType.USER]), addController.createMultipleAdd);
router.put('/multiple-add/:id',jwtMiddleware([userType.USER]), addController.updateMultipleAdd);
router.get('/getAllMultipleAdds',addController.getAllMultipleAdds);
router.get('/multiple-add/:id',jwtMiddleware([userType.USER]), addController.getMultipleAddById);
router.delete('/multiple-add/:id',jwtMiddleware([userType.USER]), addController.deleteMultipleAdd);

router.get("/gethomecontent",addController.gethomecontent);
router.post("/updatehomecontent",addController.updateHomeContent);
export default router;
