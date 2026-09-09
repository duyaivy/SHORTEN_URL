import { createParamDecorator, ExecutionContext } from "@nestjs/common";

export const CurrentUserId =
    createParamDecorator(
        (
            _: unknown,
            ctx: ExecutionContext,
        ): string => {
            const request = ctx
                .switchToHttp()
                .getRequest();

            return request.userId;
        },
    );