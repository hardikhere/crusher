// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import { DEVICE_TYPES } from "@crusher-shared/types/deviceTypes";

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
const Chrome = typeof chrome !== "undefined" ? (chrome as any) : null;

const getChromeExtensionId = (): string => {
	return process.env.NEXT_PUBLIC_EXTENSION_ID ? process.env.NEXT_PUBLIC_EXTENSION_ID : "gfiagiidgjjnmklhbalcjbmdjbpphdln";
};

const checkIfExtensionPresent = (): Promise<boolean> => {
	return new Promise((resolve) => {
		Chrome.runtime.sendMessage(getChromeExtensionId(), { message: "version" }, function (reply: any) {
			if (reply && reply.version) {
				resolve(true);
			} else {
				resolve(false);
			}
		});
	});
};

export { getChromeExtensionId, checkIfExtensionPresent };
