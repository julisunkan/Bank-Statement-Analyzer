import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import paymentsRouter from "./payments";
import statementsRouter from "./statements";
import transactionsRouter from "./transactions";
import categoriesRouter from "./categories";
import budgetsRouter from "./budgets";
import goalsRouter from "./goals";
import analyticsRouter from "./analytics";
import subscriptionsRouter from "./subscriptions";
import forecastsRouter from "./forecasts";
import reportsRouter from "./reports";
import usersRouter from "./users";
import adminRouter from "./admin";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(paymentsRouter);
router.use(statementsRouter);
router.use(transactionsRouter);
router.use(categoriesRouter);
router.use(budgetsRouter);
router.use(goalsRouter);
router.use(analyticsRouter);
router.use(subscriptionsRouter);
router.use(forecastsRouter);
router.use(reportsRouter);
router.use(usersRouter);
router.use(adminRouter);

export default router;
