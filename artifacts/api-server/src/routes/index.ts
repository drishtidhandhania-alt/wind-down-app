import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import windDownRouter from "./wind-down";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(windDownRouter);

export default router;
