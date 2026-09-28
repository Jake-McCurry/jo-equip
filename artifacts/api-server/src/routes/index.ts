import { Router, type IRouter } from "express";
import healthRouter from "./health";
import { bibleExpressMiddleware } from "../../../discipleship-hub/worker/bible.js";

const router: IRouter = Router();

router.use(healthRouter);
router.all("/bible", bibleExpressMiddleware);

export default router;
