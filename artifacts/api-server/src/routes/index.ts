import { Router, type IRouter } from "express";
import healthRouter from "./health";
import placesRouter from "./places";
import routesRouter from "./routes";

const router: IRouter = Router();

router.use(healthRouter);
router.use(placesRouter);
router.use(routesRouter);

export default router;
