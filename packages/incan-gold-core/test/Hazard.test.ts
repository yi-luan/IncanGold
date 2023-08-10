import IncanGold from '../src/entities/IncanGold';
import TreasureCard from '../src/entities/Card/TreasureCard'
import HazardCard from '../src/entities/Card/HazardCard';
import { Choice } from '../src/constant/Choice';
import Player from '../src/entities/Player';
import Event  from '../src/events/Event';
import { NewTurnHazardCardTriggeredEvent } from '../src/events/NewTurnCardTriggeredEvent';
import { AllPlayersMadeChoiceEvent } from '../src/events/MadeChoiceEvent';

// 以下都是在 this.addArtifactCardAndShuffleDeck(); 被註解掉的情況下進行的測試
describe("災難卡被放入通道",()=>{

    it('回合第一張卡為災難卡，玩家只能繼續探險',()=>{
        // given 
        const game = new IncanGold('1',['1','2','3']);
        game.round = 1;
        game.deck.appendCard(new HazardCard("HF1",'fire'));
        const iterator = game.startRound();
        
        // when 
        console.log(iterator.next().value); // NewTurnHazardCardTriggeredEvent

        // then 
        let event = iterator.next().value; // new AllPlayersMadeChoiceEvent
        expect(event.name).toBe("AllPlayersMadeChoice");
        Object.values((<AllPlayersMadeChoiceEvent>event).allPlayersChoices)
        .forEach(choice=>expect(choice===Choice.KeepGoing));
    })

    it('災難卡種類尚未重複出現,繼續此round',()=>{
        // given 
        const game = new IncanGold('1',['1']);
        game.round = 1;
        game.makePlayersEnterTunnel();
        game.tunnel.appendCard(new HazardCard("HS1",'spider'));
        game.tunnel.lastCard.trigger(game);
        game.tunnel.appendCard(new HazardCard("HP1",'python'));
        game.tunnel.lastCard.trigger(game);
        game.deck.appendCard(new HazardCard("HF1",'fire'));
        const iterator = game.startTurn();

        // when 
        console.log(iterator.next().value); // NewTurnHazardCardTriggeredEvent

        // then
        const iterator2 = game.makeChoice(game.playersInTunnel[0],Choice.Quit);
        iterator2.next();
        console.log(iterator2.next().value);
        expect(game.round).toBe(1) // 依然在第一回合
    })

    it('災難卡種類已重複出現，玩家們皆清空背包、離開通道',()=>{
        // given 
        const game = new IncanGold('1',['1','2']);
        game.round = 1;
        game.resetHazardCardCounter();
        game.makePlayersEnterTunnel();
        game.tunnel.appendCard(new TreasureCard("T4",4));
        game.tunnel.lastCard.trigger(game);
        game.tunnel.appendCard(new HazardCard("HS1",'spider'));
        game.tunnel.lastCard.trigger(game);
        game.tunnel.appendCard(new HazardCard("HP1",'python'));
        game.tunnel.lastCard.trigger(game);
        game.deck.appendCard(new HazardCard("HP2",'python'));

        // when 災難卡重複出現
        const iterator = game.startTurn();
        console.log(iterator.next().value); // NewTurnHazardCardTriggeredEvent

        // then 玩家們皆回到營地；背包內的資源沒有被加入總分
        game.players.forEach(player=>expect(player.inTent).toBe(true));
        game.players.forEach(player=>expect(player.points).toBe(0))
        console.log(iterator.next().value); // RoundEndEvent
    })

})