import { TOP_LEVEL_ACTION } from "../interfaces/topLevelAction";
import { iActionDescription } from "../interfaces/actionDescription";

const TOP_LEVEL_ACTIONS_LIST: Array<iActionDescription> = [
	{
		id: TOP_LEVEL_ACTION.TOGGLE_INSPECT_MODE,
		title: "Select and add an element checks",
		icon: chrome.runtime.getURL("icons/actions/inspect-mode.svg"),
		desc: "",
	},
	{
		id: TOP_LEVEL_ACTION.TAKE_PAGE_SCREENSHOT,
		title: "Take viewport screenshot",
		icon: chrome.runtime.getURL("icons/actions/screenshot.svg"),
		desc: "",
	},
	{
		id: TOP_LEVEL_ACTION.SHOW_SEO_MODAL,
		title: "Add SEO checks",
		icon: chrome.runtime.getURL("icons/actions/seo.svg"),
		desc: "",
	},
];

export { TOP_LEVEL_ACTIONS_LIST };
