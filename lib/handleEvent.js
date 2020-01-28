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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const slack_1 = __importDefault(require("./slack"));
function handleEvent(context) {
    return __awaiter(this, void 0, void 0, function* () {
        let messages = [];
        switch (context.eventName) {
            case 'pull_request':
                messages = yield handlePREvent(context.payload);
                break;
            case 'pull_request_review':
                messages = yield handleReviewEvent(context.payload);
                break;
            case 'pull_request_review_comment':
                messages = yield handleCommentEvent(context.payload);
        }
        if (messages.length > 0) {
            yield slack_1.default(messages);
        }
    });
}
exports.default = handleEvent;
function handlePREvent(payload) {
    return __awaiter(this, void 0, void 0, function* () {
        if (payload.action !== 'review_requested') {
            return [];
        }
        const prAuthor = payload.pull_request.user;
        return payload.pull_request.requested_reviewers.map(user => ({
            githubUsername: user.login,
            body: `${prAuthor.login} requested your review on a PR: ${payload.pull_request.title}`
        }));
    });
}
function handleReviewEvent(payload) {
    return __awaiter(this, void 0, void 0, function* () {
        if (payload.action !== 'submitted') {
            return [];
        }
        const prAuthor = payload.pull_request.user;
        let actionText;
        switch (payload.review.state) {
            case 'APPROVED':
                actionText = 'approved';
                break;
            case 'CHANGES_REQUESTED':
                actionText = 'requested changes to';
                break;
            case 'COMMENTED':
                actionText = 'commented on';
        }
        return [
            {
                githubUsername: prAuthor.login,
                body: `${payload.review.user.login} ${actionText} your PR: ${payload.pull_request.title}`
            }
        ];
    });
}
function handleCommentEvent(payload) {
    return __awaiter(this, void 0, void 0, function* () {
        if (payload.action !== 'created') {
            return [];
        }
        // send the message to all requested reviewers, plus the PR author
        // (but NOT to whomever wrote the comment)
        const prAuthor = payload.pull_request.user;
        const commentAuthor = payload.comment.user;
        const recipients = [
            prAuthor,
            ...payload.pull_request.requested_reviewers
        ].filter(user => user.login !== commentAuthor.login);
        return recipients.map(user => ({
            githubUsername: user.login,
            body: `${commentAuthor.login} commented on ${payload.pull_request.title}: ${payload.comment.body}`
        }));
    });
}
