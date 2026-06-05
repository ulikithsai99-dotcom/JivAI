import { Router, type IRouter } from "express";
import healthRouter from "./health";
import emergencyRouter from "./emergency";

const router: IRouter = Router();

router.use(healthRouter);
router.use(emergencyRouter);

export default router;
