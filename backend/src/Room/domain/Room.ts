import { Event } from "./event/Event";
import { Seat } from "./Seat";
import { STATE } from "./constant/State";

type PlayerId = string;

export class Room {
    public id: string;
    public name: string;
    public password: string | undefined = undefined;
    public host: PlayerId;
    public seats: Map<number, Seat>;

    constructor(id: string, name: string, host: PlayerId, password: string, seats: Map<number, Seat>) {
        this.id = id;
        this.name = name;
        this.host = host;
        this.password = password;
        this.seats = seats;
    }

    // Get number of available seats
    get unlockedSeats(): number {
        return [...this.seats.values()].filter(seat => seat.locked === false).length;
    }

    // Check if room is private
    get isPrivate(): boolean {
        return (!!this.password);
    }

    // Get number of seated players
    get seatedPlayerCount(): number {
        return [...this.seats.values()].filter(seat => seat.playerId !== null).length;
    }

    // Check if all players are ready
    get allReady(): boolean {
        return !([...this.seats.values()].filter(p => p.state === STATE.NOTREADY).length);
    }

    // Check if game can be started
    get canStartGame(): boolean {
        return (this.seatedPlayerCount >= 3 && this.allReady);
    }

    startGame() {
        if (this.canStartGame) {
            const playerIds = [...this.seats.values()]
                .filter(p => !!p.playerId)
                .map(p => p.playerId);
            return this.makeEvent('startGame', { playerIds, roomId: this.id });
        } else
            return this.makeEvent("can't StartGame", null);
    }


    sitDown(playerId: string, seatNumber?: number) {
        if (!seatNumber) {
            const seat = [...this.seats.values()].find(s => s.isAvailable);
            seat.sitDown(playerId)
        } else {
            const seat = this.seats.get(seatNumber);
            if (seat.isAvailable) seat.sitDown(playerId)
        }
    }

    *joinRoom(playerId: PlayerId, password: string) {
        if (this.validate(password))
            return this.makeEvent('joinRoomFailed', null);

        this.sitDown(playerId)
        yield this.makeEvent('joinRoom', { playerId, roomId: this.id });

        if (this.seatedPlayerCount === 1)
            return yield this.setHost(playerId);
    }

    *leaveRoom(playerId: PlayerId) {
        // Vacate the seat occupied by the leaving player
        this.vacateSeat(playerId);

        // Emit leave room event  
        yield this.makeEvent('leaveRoom', { playerId, roomId: this.id });

        // If leaving player was host, assign new host 
        if (this.host === playerId)
            yield this.setHost(this.getSeatedPlayer.playerId);
    }

    setHost(playerId: PlayerId) {
        if (this.playerIsSeated(playerId)) {
            this.host = playerId;
            return this.makeEvent('newHost', { host: playerId });
        }
    }

    setPassword(password: string) {
        this.password = password;
        return this.makeEvent('password was set', null);
    }

    setName(name: string) {
        this.name = name;
        return this.makeEvent('name was changed', { name });
    }

    *ready(playerId: PlayerId) {
        const seat = [...this.seats.values()].find(s => s.playerId === playerId);
        seat.ready();
        yield this.makeEvent('playerReady', { playerId });
        if (this.canStartGame) yield this.makeEvent('canStartGame', null);
    }

    *cancelReady(playerId: PlayerId) {
        const seat = [...this.seats.values()].find(s => s.playerId === playerId);
        seat.cancelReady();
        yield this.makeEvent('playerCancelReady', { playerId });
    }

    lockSeat(position: number) {
        const seat = this.seats.get(position);
        seat.lock();
        return this.makeEvent('seatLocked', { seatNumber: position });
    }


    unlockSeat(position: number) {
        const seat = this.seats.get(position);
        seat.unlock();
        return this.makeEvent('seatUnlocked', { seatNumber: position });
    }


    // Get first seated player
    private get getSeatedPlayer(): Seat {
        return [...this.seats.values()].find(s => s.playerId !== null);
    }

    // Clear seat
    private vacateSeat(playerId: string) {
        const seat = [...this.seats.values()].find(s => s.playerId === playerId);
        seat.vacate();
    }

    private makeEvent(type: string, data: any): Event {
        return { type, data };
    }

    // Check if player is seated
    private playerIsSeated(playerId: string): boolean {
        return ([...this.seats.values()].findIndex(s => s.playerId === playerId) !== -1);
    }

    // Validate password 
    private validate(password: string) {
        return (this.password !== null && this.password !== password);
    }
}