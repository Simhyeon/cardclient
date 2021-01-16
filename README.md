#### Simple javascript card game client for demonstration

demo : [youtube](https://youtu.be/eTygwHH1sW4)

Card game server repo: [github](https://github.com/simhyeon/cardserver)

#### Game's rule

This game is based on texas hold'em poker rules.

There are community cards that are shown to both players and hand cards that are unique to the player.

Player can combine both community cards and hand cards to make a specific combination.

Combination is same with that of normal poker's, e.g straight, flush, three of a kind etc.

If player wins then apply damage to opponent by amount of total bet played on current round.

Player can check, fold, raise or call to opponent's raise for every turn.

Check doesn't add bets while raise does by 1.

#### How game works

Create\_button and join\_button creates websocket connection between server and receives server response or server error if something went wrong.

Players can play bets on every turn and server proceeds game state into next one's if both players have bet or time limit passes.

On shodown, player receives bet result which is parsed to update current status.

If one of player's hp goes lower than 0, the player loses and vice versa.

#### Image

![Game Image](./img/demo.png)
