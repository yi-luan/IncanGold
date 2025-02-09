import type { Room } from "../../domain/Room";
import { Output } from "../dto/Output";
import { Event } from "../../domain/event/Event";
import { flattenToDto,RoomDto } from "../dto/RoomDto";
import { IRoomRepository } from "../Repository";
import { IEventDispatcher } from "../../../Shared/interface/EventDispatcher";

export default class SetPasswordUseCase {

    private roomRepository: IRoomRepository;
    private eventDispatcher: IEventDispatcher;

    constructor(roomRepository: IRoomRepository, eventDispatcher: IEventDispatcher) {
        this.roomRepository = roomRepository;
        this.eventDispatcher = eventDispatcher;
    }

    async execute(input: SetPasswordInput): Promise<void> {
        // 查
        const room:Room = await this.roomRepository.findById(input.roomId);

        // 改
        const event = room.setPassword(input.password)

        // 存
        await this.roomRepository.save(room);

        // 推
        this.eventDispatcher.emit('room', Output(flattenToDto(room), [event]));
    }
}

export interface SetPasswordInput {
    roomId: string;
    password: string;
}

