"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const core = __importStar(require("@actions/core"));
const web_api_1 = require("@slack/web-api");
const inputs_1 = __importDefault(require("./inputs"));
function sendMessages(messages) {
    return __awaiter(this, void 0, void 0, function* () {
        const token = core.getInput('slackToken');
        const web = new web_api_1.WebClient(token);
        const users = (yield inputs_1.default()).users;
        const sends = messages.map((message) => __awaiter(this, void 0, void 0, function* () {
            const userEmail = users[message.githubUsername];
            if (!userEmail) {
                return null;
            }
            const slackUser = (yield web.users.lookupByEmail({
                email: userEmail
            }));
            return yield web.chat.postMessage({
                channel: slackUser.id,
                text: message.body
            });
        }));
        yield Promise.all(sends);
        return;
    });
}
exports.default = sendMessages;
