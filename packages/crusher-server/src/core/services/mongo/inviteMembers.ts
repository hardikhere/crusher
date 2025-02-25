import { ProjectInviteReferrals } from "../../../server/models/projectInviteReferrals";
import { TeamInviteReferrals } from "../../../server/models/teamInviteReferrals";
import { iTeamInviteReferral } from "../../../../../crusher-shared/types/mongo/teamInviteReferral";
import { iProjectInviteReferral } from "../../../../../crusher-shared/types/mongo/projectInviteReferral";
import { iInviteReferral, INVITE_REFERRAL_TYPES } from "../../../../../crusher-shared/types/inviteReferral";
import { Service } from "typedi";
import { resolvePathToFrontendURI } from "../../utils/uri";

@Service()
export class InviteMembersService {
	getPublicProjectInviteCode(projectId: number, teamId: number, expiresOn: Date | null) {
		const generatePublicInviteLink = (inviteReferral: iInviteReferral) => {
			const inviteLinkUrl = new URL(resolvePathToFrontendURI(`/get-started`));
			inviteLinkUrl.searchParams.append("inviteType", inviteReferral.type);
			inviteLinkUrl.searchParams.append("inviteCode", inviteReferral.code);
			return inviteLinkUrl.toString();
		};
		return new Promise((resolve, reject) => {
			ProjectInviteReferrals.findOne(
				{
					projectId: { $eq: projectId },
					isPublic: { $eq: true },
					$or: [{ expiresOn: { $eq: null } }, { expiresOn: { $gt: new Date() } }],
				},
				(err, referral) => {
					if (err) return reject(err);

					if (!referral) {
						this.createPublicInviteCode(projectId, teamId, expiresOn).then((referralId: string) => {
							resolve(
								generatePublicInviteLink({
									code: referralId,
									type: INVITE_REFERRAL_TYPES.PROJECT,
								}),
							);
						});
					} else {
						resolve(
							generatePublicInviteLink({
								code: referral.id,
								type: INVITE_REFERRAL_TYPES.PROJECT,
							}),
						);
					}
				},
			);
		});
	}

	private createPublicInviteCode(projectId: number, teamId: number, expiresOn: Date | null) {
		return new Promise((resolve, reject) => {
			new ProjectInviteReferrals({
				teamId: teamId,
				projectId: projectId,
				expiresOn: expiresOn,
				isPublic: true,
			}).save((err, referral) => {
				if (err) return reject(err);
				resolve(referral.id);
			});
		});
	}

	createProjectInviteCode(
		projectId: number,
		teamId: number,
		expiresOn: Date | null = null,
		emails: Array<string> | null = null,
		meta: any = {},
	): Promise<string> {
		return new Promise((resolve, reject) => {
			new ProjectInviteReferrals({
				teamId: teamId,
				projectId: projectId,
				expiresOn: expiresOn,
				meta: {
					...meta,
					emails: emails,
				},
			}).save((err, referral) => {
				if (err) return reject(err);
				resolve(referral.id);
			});
		});
	}

	createTeamInviteCode(teamId: number, expiresOn: Date | null = null, emails: Array<string> | null = null, meta: any = {}): Promise<string> {
		return new Promise((resolve, reject) => {
			new TeamInviteReferrals({
				teamId: teamId,
				expiresOn: expiresOn,
				meta: {
					...meta,
					emails: emails,
				},
			}).save((err, referral) => {
				if (err) return reject(err);
				resolve(referral.id);
			});
		});
	}

	verifyTeamInviteCode(code: string): Promise<iTeamInviteReferral> {
		return new Promise((resolve, reject) => {
			TeamInviteReferrals.findById(code, (err, referral) => {
				if (err) return reject(err);
				const referralObject: iTeamInviteReferral = referral.toObject({
					getters: true,
				});

				if (referralObject.expiresOn > new Date()) reject(new Error("The invite code has expired"));
				resolve(referralObject);
			});
		});
	}

	verifyProjectInviteCode(code: string): Promise<iProjectInviteReferral> {
		return new Promise((resolve, reject) => {
			ProjectInviteReferrals.findById(code, (err, referral) => {
				if (err) return reject(err);
				const referralObject: iProjectInviteReferral = referral.toObject({
					getters: true,
				});

				if (referralObject.expiresOn > new Date()) reject(new Error("The invite code has expired"));
				resolve(referralObject);
			});
		});
	}

	async parseInviteReferral(referralInfo: iInviteReferral): Promise<iTeamInviteReferral | iProjectInviteReferral | null> {
		if (referralInfo) {
			const { type, code } = referralInfo;
			if (type === INVITE_REFERRAL_TYPES.PROJECT) {
				return this.verifyProjectInviteCode(code);
			} else {
				return this.verifyTeamInviteCode(code);
			}
		}
		return null;
	}
}
