import { resoveWorkerPath } from "./utils/env";

require("dotenv").config();

import { Queue, QueueScheduler, Worker } from "bullmq";
import { REDDIS } from "../config/database";
// import * as path from "path";
const path = require("path");

if (process.env.NODE_ENV === "development") {
	// For ts-node
	require(resoveWorkerPath(path.resolve("src/core/workers/testProgressWorker.ts")));
	require(resoveWorkerPath(path.resolve("src/core/workers/testCompletedWorker.ts")));
	require(resoveWorkerPath(path.resolve("src/core/workers/checkResult.ts")));
	require(resoveWorkerPath(path.resolve("src/core/workers/videoProcessedQueue.ts")));
}

function initializeQueues() {
	console.debug("Initializing queues");
	new Queue("test-progress-queue", {
		connection: REDDIS as any,
	});
	new Queue("test-completed-queue", {
		connection: REDDIS as any,
	});
	new Queue("check-result-queue", {
		connection: REDDIS as any,
	});

	new Queue("video-processing-complete-queue", {
		connection: REDDIS as any,
	});
}

function initializeWorkers() {
	console.debug("Initializing queue workers");

	new Worker("test-progress-queue", resoveWorkerPath(path.resolve("src/core/workers/testProgressWorker.ts")), {
		connection: REDDIS as any,
		concurrency: 1,
	});
	new Worker("test-completed-queue", resoveWorkerPath(path.resolve("src/core/workers/testCompletedWorker.ts")), {
		connection: REDDIS as any,
		concurrency: 1,
	});
	new Worker("check-result-queue", resoveWorkerPath(path.resolve("src/core/workers/checkResult.ts")), {
		connection: REDDIS as any,
		concurrency: 1,
	});

	new Worker("video-processing-complete-queue", resoveWorkerPath(path.resolve("src/core/workers/videoProcessedQueue.ts")), {
		connection: REDDIS as any,
		concurrency: 1,
	});
}

(async () => {
	const queueScheduler = new QueueScheduler("check-result-queue", {
		stalledInterval: 120000,
		maxStalledCount: 1,
		connection: REDDIS as any,
	});
	await queueScheduler.waitUntilReady();
	initializeQueues();
	initializeWorkers();
})();
