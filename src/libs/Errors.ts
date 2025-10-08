export enum HttpCode {
    OK = 200,
    CREATED = 201,
    NOT_MODIFIED = 304,
    BAD_REQUEST = 400,
    UNAUTHORIZED = 401,
    FORBIDDEN = 403,
    NOT_FOUND = 404,
    INTERNAL_SERVER_ERROR = 500
}

export enum Message {
    SMT_WENT_WR = "Something went wrong!",
    N_D_F = "No data found",
    CR_FAIL = "Create is failed!",
    UP_FAIL = "Update is failed",

    USED_NICK_PHONE = "You are inserting already used nick or phone",
    NO_MEMBER_NICK = "No member found",
    BLOCKED_USER = "You have been blocked, contact restaurant!",
    WRONG_PASSWORD = "Wrong password, please try again.",
    NOT_AUTHENTICATED = "You are not authenticated, please login first.",
    TOKEN_CREATION_FAILED = "Token create failed!"
}

class Errors extends Error {
    public code: HttpCode;
    public message: Message;

    static standard = {
        code: HttpCode.INTERNAL_SERVER_ERROR,
        message: Message.SMT_WENT_WR,
    };
    
    constructor(statusCode: HttpCode, statusMessage: Message) {
        super();
        this.code = statusCode;
        this.message = statusMessage;
    }
}

export default Errors;