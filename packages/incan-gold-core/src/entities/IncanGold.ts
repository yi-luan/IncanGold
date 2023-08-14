import ArtifactCard from "./Card/ArtifactCard"
import { hazardNames, artifactCards } from "../constant/CardInfo"
import {TrashDeck, Deck} from "./Deck"
import Tunnel from "./Tunnel"
import { Choice } from "../constant/Choice";
import { EventName } from "../constant/EventName"
import Explorer from "./Explorer"
import Event from "../events/Event"
import RoundEndEvent from "../events/RoundEndEvent"
import {ExplorerMadeChoiceEvent,AllExplorersMadeChoiceEvent} from "../events/MadeChoiceEvent"
import DistributeGemsAndArtifactsToExplorersEvent from "../events/DistributeGemsAndArtifactsToExplorersEvent";
import GameOverEvent from "../events/GameOverEvent";
import Card from "./Card/Card";

export default class IncanGold {
    public gameID:string;
    public tunnel:Tunnel;
    public deck:Deck;
    public trashDeck:TrashDeck;
    public explorers:Explorer[] = [];

    public hazardCardCounter: Record<string, number> = {};
    public forceExplore:boolean = false;
    public round:number = 0;
    public turn:number = 0;
    public winnerID:string = "";
    public gameover:boolean = false;

    constructor(
        ID:string, 
        explorerIDs:string[],
        tunnel:Card[]=[],
        deck:Card[]=[],
        trashDeck:Map<number,Card[]>= new Map())
    {
        this.gameID = ID;
        this.tunnel = new Tunnel(tunnel);
        this.deck = new Deck(deck);
        this.trashDeck = new TrashDeck(trashDeck);

        explorerIDs.forEach(explorerID=>{
            this.explorers.push(new Explorer(explorerID));
        })
        this.tunnel.explorers = this.explorers;
    }

    get explorersInTunnel():Explorer[] {
        return this.tunnel.explorers;
    }

    get allExplorersMadeChoice():boolean {
        return !(this.explorersInTunnel.find(explorer=>(explorer.choice === Choice.NotSelected)))
    }

    public *start():IterableIterator<Event>{
        this.round = 1;
        yield* this.startRound();
    }

    public *startRound():IterableIterator<Event>{
        this.putCardsBackIntoDeck();
        this.resetHazardCardCounter();
        // this.addArtifactCardAndShuffleDeck();
        this.makeExplorersEnterTunnel();
        this.turn = 1;
        yield* this.startTurn();
    }

    public *startTurn():IterableIterator<Event> {
        this.resetExplorersChoice();
        this.putCardInTunnel();
        yield* this.triggerLastCardInTunnel();
        if(this.forceExplore)
            yield* this.forceAllExplorersExplore();
    }

    public *triggerLastCardInTunnel(): IterableIterator<Event> {
        yield this.tunnel.lastCard.trigger(this);
        if(this.tunnel.isAnyExplorerPresent == false)
            yield* this.endRound();
    }

    public *forceAllExplorersExplore(): IterableIterator<Event> {
        this.forceExplore = false;
        this.explorersInTunnel.forEach(explorer=>explorer.choice = Choice.KeepGoing)
        yield new AllExplorersMadeChoiceEvent(this);
        yield* this.endTurn();
    }

    public *makeChoice(explorer: Explorer, choice: Choice) {
        explorer.choice = choice;
        yield new ExplorerMadeChoiceEvent(explorer.id);

        if (this.allExplorersMadeChoice) {
            yield new AllExplorersMadeChoiceEvent(this);
            yield* this.endTurn();
        }
    }

    public *endTurn(): IterableIterator<Event> {
        yield* this.getAndGo();
        this.turn++;
        yield new Event(EventName.TurnEnd);
    
        if (this.tunnel.isAnyExplorerPresent) {
            yield* this.startTurn();
            return;
        }

        yield* this.endRound();
    }

    public *getAndGo():IterableIterator<Event> {
        this.distributeResources();
        yield new DistributeGemsAndArtifactsToExplorersEvent(this);
        this.makeExplorersLeaveTunnel();
    }

    public *endRound(): IterableIterator<Event> {
        this.tunnel.discardCards(this);
        this.tunnel.remove();
        yield new RoundEndEvent(this);
        this.round++;
        
        if (this.round <= 5) {
            yield* this.startRound();
            return;
        }
    
        yield* this.end();
    }

    public *end(): IterableIterator<Event> {
        const winner = this.findWinner();
        if(winner)
            this.winnerID = winner.id;
        this.gameover = true;
        yield new GameOverEvent(this);
    }

    public putCardsBackIntoDeck(): void {
        this.tunnel.cards.forEach(card=>{ this.deck.appendCard(card) });
        this.tunnel.cards = [];
    }

    public resetHazardCardCounter(): void {
        hazardNames.forEach(name=>this.hazardCardCounter[name]=0);
    }

    public addArtifactCardAndShuffleDeck(): void {
        const i = this.round -1; // index of artifactCards
        this.deck.appendCard(new ArtifactCard(artifactCards[i].ID,artifactCards[i].name,artifactCards[i].points));
        this.deck.shuffle();
    }

    public makeExplorersEnterTunnel(): void {
        this.explorers.forEach(explorer=>explorer.enterTunnel());
    }

    public resetExplorersChoice(): void {
        this.explorersInTunnel.forEach(explorer=>explorer.choice = Choice.NotSelected);
    }

    public putCardInTunnel(): void {
        var card = this.deck.drawCard()
        if(card) this.tunnel.appendCard(card);
    }

    public findWinner(): Explorer|void {
        let highestPoints = Math.max(...this.explorers.map((explorer) => explorer.points));
        if(!highestPoints) return;
        let highestPointsExplorers = this.explorers.filter((explorer) => explorer.points === highestPoints);
        
        let maxNumberOfHighestPointsExplorerArtifacts = Math.max(...
            highestPointsExplorers.map((explorer) => explorer.numOfArtifacts)
        );

        highestPointsExplorers = highestPointsExplorers.filter(
            (explorer) => explorer.numOfArtifacts === maxNumberOfHighestPointsExplorerArtifacts
        );
        if(highestPointsExplorers.length===1)
            return highestPointsExplorers[0];
        else
            return;
    }

    public distributeResources(): void {
        this.tunnel.distributeAllGems();
        this.tunnel.distributeArtifacts();
    }

    public makeExplorersLeaveTunnel(): void {
        this.tunnel.leavingExplorers.forEach(explorer=>explorer.leaveTunnel());
    }

    public getExplorer(id:string): Explorer {
        let explorer =  this.explorers.find(explorer=>explorer.id === id);
        if(explorer)
            return explorer
        else
            throw new Error('This Explorer is not in the game.');
    }
}

