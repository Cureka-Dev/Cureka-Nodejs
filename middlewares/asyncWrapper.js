import logger from "../middlewares/logger.js";
const asyncWrapper = (fn) => {
   // console.log("fn---1",fn);
   return async (req, res, next) => {
        //console.log("res",res)
        try {
            await fn(req, res, next);
        } catch (error) {
            logger.error("asyncWrapper",error);
            next(error);
        }
    };
}

export default asyncWrapper;