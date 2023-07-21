// import { Response } from "express";
import StartGameUseCase,{ StartGameInput } from "../../app/useCase/StartGameUseCase";
import MakeChoiceUseCase, { MakeChoiceInput } from "../../app/useCase/MakeChoiceUseCase";
import { IncanGoldRepository } from "../../frameworks/data-services/IncanGoldRepository";
import { StartGameRepository } from "frameworks/data-services/StartGameRepository";

export class IncanGoldController {
    // private resp: Response;
    // constructor(resp:Response) {
    //     this.resp = resp;
    // }

    async StartGame(input:StartGameInput) {
        const repository = new StartGameRepository();
        const useCase = new StartGameUseCase(repository);
 
        return await useCase.execute(input);
    }

    async MakeChoice(input:MakeChoiceInput) {
        const repository = new IncanGoldRepository();
        const useCase = new MakeChoiceUseCase(repository);

        return await useCase.execute(input);
    }
}