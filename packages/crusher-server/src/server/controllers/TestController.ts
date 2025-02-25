import { Authorized, Body, ContentType, Controller, CurrentUser, Get, Param, Post, Req, Res, UnauthorizedError } from "routing-controllers";
import { Container, Inject, Service } from "typedi";
import DBManager from "../../core/manager/DBManager";
import UserService from "../../core/services/UserService";
import ProjectService from "../../core/services/ProjectService";
import TestService from "../../core/services/TestService";
import DraftService from "../../core/services/DraftService";
import DraftInstanceService from "../../core/services/DraftInstanceService";
import JobsService, { TRIGGER } from "../../core/services/JobsService";
import { getDefaultHostFromCode, getTestHostFromActions } from "../../core/utils/helper";
import TestInstanceService from "../../core/services/TestInstanceService";
import { JobTrigger } from "../../core/interfaces/JobTrigger";
import { JobStatus } from "../../core/interfaces/JobStatus";
import { addJobToRequestQueue } from "@utils/queue";
import { InsertRecordResponse } from "../../core/interfaces/services/InsertRecordResponse";
import { Platform } from "../../core/interfaces/Platform";
import { resolvePathToFrontendURI } from "../../core/utils/uri";
import { TestType } from "../../core/interfaces/TestType";
import { TestFramework } from "../../core/interfaces/TestFramework";
import { EDITOR_TEST_TYPE } from "../../../../crusher-shared/types/editorTestType";
import ProjectHostsService from "../../core/services/ProjectHostsService";
import MonitoringService from "../../core/services/MonitoringService";

const RESPONSE_STATUS = {
	INSUFFICIENT_INFORMATION: "INSUFFICIENT_INFORMATION",
	TEST_CREATED: "TEST_CREATED",
};

@Service()
@Controller("/test")
export class TestController {
	@Inject()
	private userService: UserService;
	@Inject()
	private testService: TestService;

	@Inject()
	private projectService: ProjectService;
	@Inject()
	private draftService: DraftService;
	@Inject()
	private draftInstanceService: DraftInstanceService;
	@Inject()
	private jobService: JobsService;
	@Inject()
	private testInstanceService: TestInstanceService;
	@Inject()
	private hostService: ProjectHostsService;
	@Inject()
	private monitoringService: MonitoringService;

	private dbManager: DBManager;

	constructor() {
		// This passes on only one DB containers
		this.dbManager = Container.get(DBManager);
	}

	@Post("/goToEditor")
	@ContentType("text/html")
	async goToEditor(@Body() body, @Res() res) {
		const { events, totalTime } = body;

		return `<html><body><script> function sendPostDataWithForm(url, options = {}){ const form = document.createElement('form'); form.method = "post"; form.action = url; const optionKeys = Object.keys(options); for(let optionKey of optionKeys){const hiddenField = document.createElement('input'); hiddenField.type = 'hidden'; hiddenField.name = optionKey; hiddenField.value = options[optionKey]; form.appendChild(hiddenField);} document.body.appendChild(form);
form.submit(); 
form.remove();} sendPostDataWithForm("${resolvePathToFrontendURI(
			`/app/tests/editor/${EDITOR_TEST_TYPE.UNSAVED}/`,
		)}", {events: "${events}", totalTime: ${totalTime} });</script></body></html>`;
	}

	@Authorized()
	@Post("/create")
	async createTest(@CurrentUser({ required: true }) user, @Body() testDetails) {
		const { testName, projectId, events, code, framework } = testDetails;
		const { user_id } = user;

		if (testName && projectId && events && code && framework) {
			return {
				status: RESPONSE_STATUS.TEST_CREATED,
				data: await this.testService.createTest({
					testName,
					events: JSON.stringify(events),
					framework,
					code: code,
					projectId,
					userId: user_id,
				}),
			};
		} else {
			return { status: RESPONSE_STATUS.INSUFFICIENT_INFORMATION };
		}
	}

	@Authorized()
	@Get("/run/:testId")
	async runTestControllerMethod(@Param("testId") testId: any, @CurrentUser({ required: true }) user: any, @Req() req) {
		const { user_id } = user;
		const canAccessTest = await this.userService.canAccessTestWithID(testId, user_id);

		const test: any = await this.testService.getTest(testId);
		if (canAccessTest && test) {
			const host = getDefaultHostFromCode(test.code);

			const insertedJob: InsertRecordResponse = await this.jobService.createJob({
				project_id: test.project_id,
				trigger: JobTrigger.MANUAL,
				host: host ? host : null,
				status: JobStatus.QUEUED,
				meta: JSON.stringify([test]),
			});

			await addJobToRequestQueue({
				jobId: insertedJob.insertId,
				projectId: test.project_id,
				tests: [test],
				trigger: TRIGGER.CLI,
				testType: TestType.SAVED,
				host: host ? host : null,
				platform: Platform.CHROME,
			});
			return {};
		} else {
			return { status: 304, message: "Not authorized" };
		}
	}

	@Authorized()
	@Get("/get/:testId")
	async getTest(@Param("testId") testId: number, @CurrentUser({ required: true }) user) {
		const { user_id } = user;
		const canAccessTest = await this.userService.canAccessTestWithID(testId, user_id);
		const test: any = await this.testService.getCompleteTestInfo(testId);

		if (canAccessTest && test) {
			return { ...test, code: test.code };
		} else {
			return { status: 304, message: "Not authorized" };
		}
	}

	@Get("/delete/:testId")
	@Authorized()
	async deleteTest(@CurrentUser({ required: true }) user, @Param("testId") testId: number) {
		const { user_id } = user;
		const canAccessTest = await this.userService.canAccessTestWithID(testId, user_id);

		if (canAccessTest)
			return this.testService.markDeleted(testId).then(() => {
				return { status: "DONE" };
			});
		else throw new UnauthorizedError();
	}

	@Post("/createTestFromDraft/:draftId")
	@Authorized()
	async createTestFromDraft(@CurrentUser({ required: true }) user, @Param("draftId") draftId: number, @Body() body) {
		const { user_id } = user;
		const { testName: _testName, projectId: _projectId, framework: _framework, code: _code, events: _events } = body;
		const { name, project_id, code, events } = await this.draftService.getDraftTest(draftId);

		const res = await this.draftService.getLastDraftInstanceResult(draftId);

		const video_uri = res ? res.video_uri : null;
		const testsCountInProject = await this.testService.getTestsCountInProject(project_id);
		const isThisFirstTest = testsCountInProject === 0;

		if (project_id) {
			return this.testService
				.createTest({
					testName: isNotEmpty(_testName) ? _testName : name,
					events: isNotEmpty(_events) ? _events : events,
					framework: isNotEmpty(_framework) ? _framework : TestFramework.PLAYWRIGHT,
					code: isNotEmpty(_code) ? _code : code,
					projectId: project_id,
					userId: user_id,
					featured_video_uri: video_uri,
					draft_id: draftId,
				})
				.then(async (res) => {
					if (isThisFirstTest) {
						const host = await this.hostService.createHost({
							name: "Default",
							url: await getTestHostFromActions(JSON.parse(events)),
							projectId: project_id,
							userId: user_id,
						});
						const hostId = host.insertId;
						await this.monitoringService.addMonitoringForProject(
							{
								target_host: hostId,
								platform: Platform.ALL,
								test_interval: 14400,
								project_id: project_id,
								user_id: user_id,
							},
							project_id,
						);
					}
					return res;
				});
		} else {
			return {
				status: 304,
				error: new Error("No draft with this draftId available"),
			};
		}
	}

	@Post("/updateTest/:testId")
	@Authorized()
	async updateTest(@CurrentUser({ required: true }) user, @Param("testId") testId, @Body() body) {
		const { user_id } = user;
		const canAccessTest = await this.userService.canAccessTestWithID(testId, user_id);
		if (canAccessTest) {
			const { testName, projectId, code, testGroupId } = body;
			const s = await this.testService.updateTest(testName, projectId, code, testId);
			return { status: 200 };
		} else {
			return { status: 304, message: "Not authorized" };
		}
	}

	@Authorized()
	@Get("/getAllInfosInProject/:projectId")
	async getAllTestsInProject(@CurrentUser({ required: true }) user, @Param("projectId") projectId) {
		const { user_id } = user;
		const canAccessProject = await this.userService.canAccessProjectId(projectId, user_id);
		if (!canAccessProject) {
			throw new UnauthorizedError();
		}
		const tests = await this.testService.getAllTestsInProject(projectId, true);

		for (let i = 0; i < tests.length; i++) {
			const totalTestsToday = await this.testInstanceService.getAllInstancesOfTestToday(tests[i].id);
			tests[i]["instancesToday"] = totalTestsToday;
		}

		return tests;
	}
}

function isNotEmpty(string) {
	return !!string;
}
