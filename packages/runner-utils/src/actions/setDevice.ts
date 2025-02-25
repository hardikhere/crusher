import { iAction } from "@crusher-shared/types/action";
import { iDevice } from "@crusher-shared/types/extension/device";
import { iUserAgent } from "@crusher-shared/constants/userAgents";

export default async function setDevice(action: iAction) {
	return new Promise(async (success, error) => {
		try {
			const device = action.payload.meta.device as iDevice;
			const userAgent = action.payload.meta.userAgent as iUserAgent;

			return success({
				message: "Setup device for testing",
				meta: {
					width: device.width,
					height: device.height,
					userAgent: userAgent && userAgent.value ? userAgent.value : userAgent,
				},
			});
		} catch (err) {
			console.error(err);
			return error("Some issue occurred while setting the device");
		}
	});
}
