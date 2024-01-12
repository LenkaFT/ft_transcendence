import { Controller } from "@nestjs/common";
import { UsersService } from "src/users/services/users.service";
import { MatchHistoryService } from "../services/match.history.services";

@Controller('games')
export class GamesController {
    constructor(
        private readonly  matchHistoryService: MatchHistoryService,
        private readonly  userService: UsersService,
    ) {}

}
