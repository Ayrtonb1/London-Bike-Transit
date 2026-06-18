import { Router, type IRouter } from "express";
import healthRouter from "./health";
import placesRouter from "./places";
import routesRouter from "./routes";
import tflRouter from "./tfl";

const router: IRouter = Router();

router.use(healthRouter);
router.use(placesRouter);
router.use(routesRouter);
router.use(tflRouter);

export default router;
